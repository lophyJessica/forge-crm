import Dexie, { type Table } from 'dexie';

// 1. 定义数据结构
export interface Lead {
  id: string;
  source: string; // ONLINE | ACTIVITY | EXHIBITION | REFERRAL | IMPORT | OTHER
  company: string;
  contact?: string;
  phone?: string;
  email?: string;
  position?: string;
  industry?: string; // MANUFACTURING | RETAIL | HEALTHCARE | FINANCE | IT | OTHER
  region?: string;
  remark?: string;
  score: number; // 0-100
  status: 'DRAFT' | 'PENDING_ASSIGN' | 'ASSIGNED' | 'FOLLOWING' | 'CONVERTED' | 'ABANDONED';
  owner?: string;
  assignedAt?: string;
  followedAt?: string;
  abandonedReason?: string;
  createdAt: string;
  createdBy: string;
}

export interface FollowUpRecord {
  id?: number;
  leadId: string;
  time: string;
  operator: string;
  type: string; // 电话 | 拜访 | 邮件
  content: string;
  nextPlan?: string;
}

// 2. 创建数据库实例
class ForgeCrmDatabase extends Dexie {
  leads!: Table<Lead, string>;
  follow_up_records!: Table<FollowUpRecord, number>;

  constructor() {
    super('ForgeCrmDatabase');
    this.version(1).stores({
      leads: 'id, phone, email, status, owner, createdAt',
      follow_up_records: '++id, leadId, time',
    });
  }
}

export const db = new ForgeCrmDatabase();

// 3. 初始种子数据
const MOCK_LEADS: Lead[] = [
  // 5条 PENDING_ASSIGN
  { id: 'LEAD20260717-0001', source: 'ONLINE', company: '龙腾实业有限公司', contact: '赵刚', phone: '13800010001', email: 'zhaogang@longteng.com', industry: 'MANUFACTURING', region: '北京市-东城区', score: 72, status: 'PENDING_ASSIGN', createdAt: '2026-07-17 09:00:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0002', source: 'ACTIVITY', company: '海纳商贸有限公司', contact: '孙明', phone: '13800010002', email: 'sunming@haina.com', industry: 'RETAIL', region: '广东省-广州市', score: 65, status: 'PENDING_ASSIGN', createdAt: '2026-07-17 09:30:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0003', source: 'EXHIBITION', company: '智芯微电子技术公司', contact: '钱伟', phone: '13800010003', email: 'qianwei@zhixin.com', industry: 'IT', region: '上海市-张江区', score: 55, status: 'PENDING_ASSIGN', createdAt: '2026-07-17 10:15:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0004', source: 'REFERRAL', company: '安泰医疗器械有限公司', contact: '李华', phone: '13800010004', email: 'lihua@antai.com', industry: 'HEALTHCARE', region: '江苏省-苏州市', score: 78, status: 'PENDING_ASSIGN', createdAt: '2026-07-17 11:00:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0005', source: 'OTHER', company: '金石金融信息服务公司', contact: '周亮', phone: '13800010005', email: 'zhouliang@jinshi.com', industry: 'FINANCE', region: '四川省-成都市', score: 60, status: 'PENDING_ASSIGN', createdAt: '2026-07-17 11:30:00', createdBy: 'WmsScheduler' },

  // 3条 ASSIGNED
  { id: 'LEAD20260717-0006', source: 'ONLINE', company: '天河云网络科技有限公司', contact: '吴勇', phone: '13800010006', email: 'wuyong@tianhe.com', industry: 'IT', region: '浙江省-杭州市', score: 85, status: 'ASSIGNED', owner: '张三', assignedAt: '2026-07-17 12:00:00', createdAt: '2026-07-17 11:45:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0007', source: 'EXHIBITION', company: '远东重工制造集团', contact: '郑军', phone: '13800010007', email: 'zhengjun@yuandong.com', industry: 'MANUFACTURING', region: '辽宁省-沈阳市', score: 82, status: 'ASSIGNED', owner: '李四', assignedAt: '2026-07-17 13:00:00', createdAt: '2026-07-17 12:30:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0008', source: 'REFERRAL', company: '瑞丰生鲜连锁超市', contact: '王强', phone: '13800010008', email: 'wangqiang@ruifeng.com', industry: 'RETAIL', region: '湖北省-武汉市', score: 80, status: 'ASSIGNED', owner: '张三', assignedAt: '2026-07-17 14:00:00', createdAt: '2026-07-17 13:40:00', createdBy: 'WmsScheduler' },

  // 8条 FOLLOWING
  { id: 'LEAD20260717-0009', source: 'ONLINE', company: '强盛科技有限公司', contact: '赵六', phone: '13800010009', email: 'zhaoliu@qiangsheng.com', industry: 'IT', region: '江苏省-南京市', score: 85, status: 'FOLLOWING', owner: '张三', assignedAt: '2026-07-17 10:00:00', followedAt: '2026-07-17 14:30:00', createdAt: '2026-07-17 09:30:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0010', source: 'ONLINE', company: '宏图物流集团有限公司', contact: '钱进', phone: '13800010010', email: 'qianjin@hongtu.com', industry: 'RETAIL', region: '山东省-青岛市', score: 92, status: 'FOLLOWING', owner: '张三', assignedAt: '2026-07-17 10:30:00', followedAt: '2026-07-18 09:12:00', createdAt: '2026-07-17 09:45:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0011', source: 'ACTIVITY', company: '绿能环保设备工程公司', contact: '孙凯', phone: '13800010011', email: 'sunkai@lvneng.com', industry: 'MANUFACTURING', region: '广东省-深圳市', score: 68, status: 'FOLLOWING', owner: '李四', assignedAt: '2026-07-17 14:30:00', followedAt: '2026-07-17 16:30:00', createdAt: '2026-07-17 14:10:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0012', source: 'EXHIBITION', company: '百盛生物医药实验室', contact: '李诚', phone: '13800010012', email: 'licheng@baisheng.com', industry: 'HEALTHCARE', region: '陕西省-西安市', score: 70, status: 'FOLLOWING', owner: '李四', assignedAt: '2026-07-17 15:00:00', followedAt: '2026-07-17 17:00:00', createdAt: '2026-07-17 14:50:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0013', source: 'REFERRAL', company: '鼎泰信托金融集团', contact: '周捷', phone: '13800010013', email: 'zhoujie@dingtai.com', industry: 'FINANCE', region: '北京市-西城区', score: 79, status: 'FOLLOWING', owner: '张三', assignedAt: '2026-07-17 15:30:00', followedAt: '2026-07-18 08:30:00', createdAt: '2026-07-17 15:10:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0014', source: 'ONLINE', company: '星河泛娱文化传播公司', contact: '吴限', phone: '13800010014', email: 'wuxian@xinghe.com', industry: 'OTHER', region: '上海市-徐汇区', score: 62, status: 'FOLLOWING', owner: '李四', assignedAt: '2026-07-17 16:00:00', followedAt: '2026-07-17 17:30:00', createdAt: '2026-07-17 15:40:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0015', source: 'IMPORT', company: '创维软件科技服务中心', contact: '郑方', phone: '13800010015', email: 'zhengfang@chuangwei.com', industry: 'IT', region: '广东省-广州市', score: 75, status: 'FOLLOWING', owner: '张三', assignedAt: '2026-07-17 16:30:00', followedAt: '2026-07-17 18:00:00', createdAt: '2026-07-17 16:15:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0016', source: 'OTHER', company: '联华贸易进出口有限公司', contact: '王浩', phone: '13800010016', email: 'wanghao@lianhua.com', industry: 'RETAIL', region: '福建省-厦门市', score: 58, status: 'FOLLOWING', owner: '李四', assignedAt: '2026-07-17 17:00:00', followedAt: '2026-07-18 09:00:00', createdAt: '2026-07-17 16:45:00', createdBy: 'WmsScheduler' },

  // 2条 CONVERTED
  { id: 'LEAD20260717-0017', source: 'ONLINE', company: '聚百川化工材料有限公司', contact: '陈凯', phone: '13800010017', email: 'chenkai@jubaichuan.com', industry: 'MANUFACTURING', region: '山东省-淄博市', score: 88, status: 'CONVERTED', owner: '张三', assignedAt: '2026-07-17 11:00:00', followedAt: '2026-07-17 15:00:00', createdAt: '2026-07-17 10:30:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0018', source: 'REFERRAL', company: '新华百货连锁商场', contact: '刘强', phone: '13800010018', email: 'liuqiang@xinhua.com', industry: 'RETAIL', region: '宁夏-银川市', score: 94, status: 'CONVERTED', owner: '张三', assignedAt: '2026-07-17 13:30:00', followedAt: '2026-07-17 16:00:00', createdAt: '2026-07-17 13:00:00', createdBy: 'WmsScheduler' },

  // 2条 ABANDONED
  { id: 'LEAD20260717-0019', source: 'ONLINE', company: '万达商贸进出口公司', contact: '陈曦', phone: '13800010019', email: 'chenxi@wanda.com', industry: 'RETAIL', region: '北京市-朝阳区', score: 45, status: 'ABANDONED', owner: '李四', abandonedReason: '客户无购买意向，已使用竞品WMS系统', assignedAt: '2026-07-17 14:00:00', followedAt: '2026-07-17 14:30:00', createdAt: '2026-07-17 13:30:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0020', source: 'ACTIVITY', company: '辉煌重工装备科技公司', contact: '陆军', phone: '13800010020', email: 'lujun@huihuang.com', industry: 'MANUFACTURING', region: '河北省-唐山市', score: 32, status: 'ABANDONED', owner: '张三', abandonedReason: '非目标客户，客户为纯内销代加工，无ERP/CRM预算', assignedAt: '2026-07-17 15:00:00', followedAt: '2026-07-17 15:45:00', createdAt: '2026-07-17 14:40:00', createdBy: 'WmsScheduler' }
];

const MOCK_FOLLOW_UPS: FollowUpRecord[] = [
  // LEAD20260717-0009 的跟进记录 (2条)
  { leadId: 'LEAD20260717-0009', time: '2026-07-17 10:30:00', operator: '张三', type: '电话', content: '初次联系，介绍了公司及产品，客户对WMS模块比较感兴趣，确认了当前系统基本满足诉求。' },
  { leadId: 'LEAD20260717-0009', time: '2026-07-17 14:30:00', operator: '张三', type: '电话', content: '客户确认技术方案可行，表示下周一会给出回复，预算在50万左右，计划同步推送ERP合同。', nextPlan: '下周一电话跟进确认采购审批进度。' },

  // LEAD20260717-0010 的跟进记录 (1条)
  { leadId: 'LEAD20260717-0010', time: '2026-07-18 09:12:00', operator: '张三', type: '电话', content: '沟通了关于电商多平台库存同步方案。客户非常认可 AI 串联 ERP 与 WMS 的库存分配方案。' },

  // LEAD20260717-0011 的跟进记录 (1条)
  { leadId: 'LEAD20260717-0011', time: '2026-07-17 16:30:00', operator: '李四', type: '电话', content: '电话未接听，已发送短信说明情况，等待客户反馈。' },

  // LEAD20260717-0012 的跟进记录 (1条)
  { leadId: 'LEAD20260717-0012', time: '2026-07-17 17:00:00', operator: '李四', type: '拜访', content: '现场拜访，送去了系统白皮书与技术架构白皮书。客户对 AI 预测模型表示极大的关注。' },

  // LEAD20260717-0013 的跟进记录 (1条)
  { leadId: 'LEAD20260717-0013', time: '2026-07-18 08:30:00', operator: '张三', type: '邮件', content: '发送了系统演示包和详细报价表，等待高层决策批准。' },

  // LEAD20260717-0014 的跟进记录 (1条)
  { leadId: 'LEAD20260717-0014', time: '2026-07-17 17:30:00', operator: '李四', type: '电话', content: '电话接通，客户表示目前在内部评估，稍后安排线上技术对接会。' },

  // LEAD20260717-0015 的跟进记录 (1条)
  { leadId: 'LEAD20260717-0015', time: '2026-07-17 18:00:00', operator: '张三', type: '电话', content: '进行了产品功能的初步对接，解答了关于 API 实时同步客户数据的细节疑问。' },

  // LEAD20260717-0016 的跟进记录 (1条)
  { leadId: 'LEAD20260717-0016', time: '2026-07-18 09:00:00', operator: '李四', type: '电话', content: '销售接通，客户询问了关于售后运维方案及本地部署服务器的规格配置要求。' },

  // LEAD20260717-0017 (已转客户) 的跟进记录 (2条)
  { leadId: 'LEAD20260717-0017', time: '2026-07-17 11:30:00', operator: '张三', type: '电话', content: '电话详细解答报价及付款期。客户表示付款流程没有障碍，可以直接建档。' },
  { leadId: 'LEAD20260717-0017', time: '2026-07-17 15:00:00', operator: '张三', type: '拜访', content: '拜访完成合同签约。客户表示下周即注入一期款。' },

  // LEAD20260717-0018 (已转客户) 的跟进记录 (1条)
  { leadId: 'LEAD20260717-0018', time: '2026-07-17 16:00:00', operator: '张三', type: '电话', content: '客户确认在 ERP 中已自动获取到 CRM 建档快照，数据同步流验证通畅。' },

  // LEAD20260717-0019 (已作废) 的跟进记录 (1条)
  { leadId: 'LEAD20260717-0019', time: '2026-07-17 14:30:00', operator: '李四', type: '电话', content: '客户明确表示目前使用某竞争对手的产品体验较好，三年内没有更换意向，遂主动放弃。' },

  // LEAD20260717-0020 (已作废) 的跟进记录 (1条)
  { leadId: 'LEAD20260717-0020', time: '2026-07-17 15:45:00', operator: '张三', type: '电话', content: '与客户财务及厂长联系，判定预算不足，不符合系统主要客户群定位。已放弃。' }
];

export async function seedDatabase() {
  const leadCount = await db.leads.count();
  if (leadCount > 0) return; // 已经有数据，不重复加载

  await db.transaction('rw', db.leads, db.follow_up_records, async () => {
    await db.leads.bulkAdd(MOCK_LEADS);
    await db.follow_up_records.bulkAdd(MOCK_FOLLOW_UPS);
  });
  console.log('IndexedDB 种子数据已成功初始化！');
}

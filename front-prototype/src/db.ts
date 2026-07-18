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
  abandonedAt?: string;
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

// 商机明细商品结构
export interface OpportunityItem {
  productCode: string;
  productName: string;
  price: number;
  quantity: number;
}

// 商机数据结构
export interface Opportunity {
  id: string;
  title: string;
  customerId: string;
  customerName: string;
  amount?: number;
  dealDate?: string;
  desc?: string;
  score: number; // AI 成交概率 0-100
  status: 'INITIAL_CONTACT' | 'NEEDS_CONFIRM' | 'PROPOSAL' | 'NEGOTIATION' | 'CONTRACT' | 'WON' | 'LOST';
  lostReason?: string;
  contractNo?: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  items?: OpportunityItem[];
}

export interface OpportunityFollowUp {
  id?: number;
  oppId: string;
  time: string;
  operator: string;
  type: string; // 电话 | 拜访 | 邮件
  content: string;
}

// 客户快照数据结构 (SSOT 在 ERP)
export interface Customer {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  industry: string;
  region: string;
  level: 'VIP' | 'A' | 'B' | 'C';
  creditLimit: number;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  owner: string;
  createdAt: string;
}

// ERP 订单快照结构
export interface ErpOrder {
  id: string;
  customerId: string;
  amount: number;
  date: string;
  status: 'PENDING_DELIVERY' | 'SHIPPED' | 'SIGNED';
}

// 2. 创建数据库实例 (升级至版本 3 以引入客户表和ERP订单表)
class ForgeCrmDatabase extends Dexie {
  leads!: Table<Lead, string>;
  follow_up_records!: Table<FollowUpRecord, number>;
  opportunities!: Table<Opportunity, string>;
  opportunity_follow_ups!: Table<OpportunityFollowUp, number>;
  customers!: Table<Customer, string>;
  erp_orders!: Table<ErpOrder, string>;

  constructor() {
    super('ForgeCrmDatabase');
    this.version(3).stores({
      leads: 'id, phone, email, status, owner, createdAt',
      follow_up_records: '++id, leadId, time',
      opportunities: 'id, customerId, status, createdAt',
      opportunity_follow_ups: '++id, oppId, time',
      customers: 'id, name, riskLevel, level',
      erp_orders: 'id, customerId, date'
    });
  }
}

export const db = new ForgeCrmDatabase();

// 3. 初始种子数据
const MOCK_LEADS: Lead[] = [
  { id: 'LEAD20260717-0001', source: 'ONLINE', company: '龙腾实业有限公司', contact: '赵刚', phone: '13800010001', email: 'zhaogang@longteng.com', industry: 'MANUFACTURING', region: '北京市-东城区', score: 72, status: 'PENDING_ASSIGN', createdAt: '2026-07-17 09:00:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0002', source: 'ACTIVITY', company: '海纳商贸有限公司', contact: '孙明', phone: '13800010002', email: 'sunming@haina.com', industry: 'RETAIL', region: '广东省-广州市', score: 65, status: 'PENDING_ASSIGN', createdAt: '2026-07-17 09:30:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0003', source: 'EXHIBITION', company: '智芯微电子技术公司', contact: '钱伟', phone: '13800010003', email: 'qianwei@zhixin.com', industry: 'IT', region: '上海市-张江区', score: 55, status: 'PENDING_ASSIGN', createdAt: '2026-07-17 10:15:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0004', source: 'REFERRAL', company: '安泰医疗器械有限公司', contact: '李华', phone: '13800010004', email: 'lihua@antai.com', industry: 'HEALTHCARE', region: '江苏省-苏州市', score: 78, status: 'PENDING_ASSIGN', createdAt: '2026-07-17 11:00:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0005', source: 'OTHER', company: '金石金融信息服务公司', contact: '周亮', phone: '13800010005', email: 'zhouliang@jinshi.com', industry: 'FINANCE', region: '四川省-成都市', score: 60, status: 'PENDING_ASSIGN', createdAt: '2026-07-17 11:30:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0006', source: 'ONLINE', company: '天河云网络科技有限公司', contact: '吴勇', phone: '13800010006', email: 'wuyong@tianhe.com', industry: 'IT', region: '浙江省-杭州市', score: 85, status: 'ASSIGNED', owner: '张三', assignedAt: '2026-07-17 12:00:00', createdAt: '2026-07-17 11:45:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0007', source: 'EXHIBITION', company: '远东重工制造集团', contact: '郑军', phone: '13800010007', email: 'zhengjun@yuandong.com', industry: 'MANUFACTURING', region: '辽宁省-沈阳市', score: 82, status: 'ASSIGNED', owner: '李四', assignedAt: '2026-07-17 13:00:00', createdAt: '2026-07-17 12:30:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0008', source: 'REFERRAL', company: '瑞丰生鲜连锁超市', contact: '王强', phone: '13800010008', email: 'wangqiang@ruifeng.com', industry: 'RETAIL', region: '湖北省-武汉市', score: 80, status: 'ASSIGNED', owner: '张三', assignedAt: '2026-07-17 14:00:00', createdAt: '2026-07-17 13:40:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0009', source: 'ONLINE', company: '强盛科技有限公司', contact: '赵六', phone: '13800010009', email: 'zhaoliu@qiangsheng.com', industry: 'IT', region: '江苏省-南京市', score: 85, status: 'FOLLOWING', owner: '张三', assignedAt: '2026-07-17 10:00:00', followedAt: '2026-07-17 14:30:00', createdAt: '2026-07-17 09:30:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0010', source: 'ONLINE', company: '宏图物流集团有限公司', contact: '钱进', phone: '13800010010', email: 'qianjin@hongtu.com', industry: 'RETAIL', region: '山东省-青岛市', score: 92, status: 'FOLLOWING', owner: '张三', assignedAt: '2026-07-17 10:30:00', followedAt: '2026-07-18 09:12:00', createdAt: '2026-07-17 09:45:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0011', source: 'ACTIVITY', company: '绿能环保设备工程公司', contact: '孙凯', phone: '13800010011', email: 'sunkai@lvneng.com', industry: 'MANUFACTURING', region: '广东省-深圳市', score: 68, status: 'FOLLOWING', owner: '李四', assignedAt: '2026-07-17 14:30:00', followedAt: '2026-07-17 16:30:00', createdAt: '2026-07-17 14:10:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0012', source: 'EXHIBITION', company: '百盛生物医药实验室', contact: '李诚', phone: '13800010012', email: 'licheng@baisheng.com', industry: 'HEALTHCARE', region: '陕西省-西安市', score: 70, status: 'FOLLOWING', owner: '李四', assignedAt: '2026-07-17 15:00:00', followedAt: '2026-07-17 17:00:00', createdAt: '2026-07-17 14:50:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0013', source: 'REFERRAL', company: '鼎泰信托金融集团', contact: '周捷', phone: '13800010013', email: 'zhoujie@dingtai.com', industry: 'FINANCE', region: '北京市-西城区', score: 79, status: 'FOLLOWING', owner: '张三', assignedAt: '2026-07-17 15:30:00', followedAt: '2026-07-18 08:30:00', createdAt: '2026-07-17 15:10:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0014', source: 'ONLINE', company: '星河泛娱文化传播公司', contact: '吴限', phone: '13800010014', email: 'wuxian@xinghe.com', industry: 'OTHER', region: '上海市-徐汇区', score: 62, status: 'FOLLOWING', owner: '李四', assignedAt: '2026-07-17 16:00:00', followedAt: '2026-07-17 17:30:00', createdAt: '2026-07-17 15:40:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0015', source: 'IMPORT', company: '创维软件科技服务中心', contact: '郑方', phone: '13800010015', email: 'zhengfang@chuangwei.com', industry: 'IT', region: '广东省-广州市', score: 75, status: 'FOLLOWING', owner: '张三', assignedAt: '2026-07-17 16:30:00', followedAt: '2026-07-17 18:00:00', createdAt: '2026-07-17 16:15:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0016', source: 'OTHER', company: '联华贸易进出口有限公司', contact: '王浩', phone: '13800010016', email: 'wanghao@lianhua.com', industry: 'RETAIL', region: '福建省-厦门市', score: 58, status: 'FOLLOWING', owner: '李四', assignedAt: '2026-07-17 17:00:00', followedAt: '2026-07-18 09:00:00', createdAt: '2026-07-17 16:45:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0017', source: 'ONLINE', company: '聚百川化工材料有限公司', contact: '陈凯', phone: '13800010017', email: 'chenkai@jubaichuan.com', industry: 'MANUFACTURING', region: '山东省-淄博市', score: 88, status: 'CONVERTED', owner: '张三', assignedAt: '2026-07-17 11:00:00', followedAt: '2026-07-17 15:00:00', createdAt: '2026-07-17 10:30:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0018', source: 'REFERRAL', company: '新华百货连锁商场', contact: '刘强', phone: '13800010018', email: 'liuqiang@xinhua.com', industry: 'RETAIL', region: '宁夏-银川市', score: 94, status: 'CONVERTED', owner: '张三', assignedAt: '2026-07-17 13:30:00', followedAt: '2026-07-17 16:00:00', createdAt: '2026-07-17 13:00:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0019', source: 'ONLINE', company: '万达商贸进出口公司', contact: '陈曦', phone: '13800010019', email: 'chenxi@wanda.com', industry: 'RETAIL', region: '北京市-朝阳区', score: 45, status: 'ABANDONED', owner: '李四', abandonedReason: '客户无购买意向，已使用竞品WMS系统', assignedAt: '2026-07-17 14:00:00', followedAt: '2026-07-17 14:30:00', abandonedAt: '2026-07-17 14:30:00', createdAt: '2026-07-17 13:30:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0020', source: 'ACTIVITY', company: '辉煌重工装备科技公司', contact: '陆军', phone: '13800010020', email: 'lujun@huihuang.com', industry: 'MANUFACTURING', region: '河北省-唐山市', score: 32, status: 'ABANDONED', owner: '张三', abandonedReason: '非目标客户，客户为纯内销代加工，无ERP/CRM预算', assignedAt: '2026-07-17 15:00:00', followedAt: '2026-07-17 15:45:00', abandonedAt: '2026-07-17 15:45:00', createdAt: '2026-07-17 14:40:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0021', source: 'ONLINE', company: '晨光文具供应中心', contact: '王梅', phone: '13800010021', email: 'wangmei@chenguang.com', industry: 'RETAIL', region: '上海市-黄浦区', score: 62, status: 'ABANDONED', owner: '李四', abandonedReason: '电话多次未接听，已发送说明短信，无人回馈，超时放弃', assignedAt: '2026-07-05 10:00:00', followedAt: '2026-07-08 09:00:00', abandonedAt: '2026-07-08 09:00:00', createdAt: '2026-07-05 09:30:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0022', source: 'ACTIVITY', company: '腾飞钢结构工程公司', contact: '李腾', phone: '13800010022', email: 'liteng@tengfei.com', industry: 'MANUFACTURING', region: '山东省-济南市', score: 55, status: 'ABANDONED', owner: '张三', abandonedReason: '非目标群体，客户业务过小，无法承担ERP采购成本', assignedAt: '2026-07-06 11:00:00', followedAt: '2026-07-09 10:30:00', abandonedAt: '2026-07-09 10:30:00', createdAt: '2026-07-06 10:15:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0023', source: 'EXHIBITION', company: '天诚半导体设备厂', contact: '张天', phone: '13800010023', email: 'zhangtian@tiancheng.com', industry: 'IT', region: '江苏省-无锡市', score: 78, status: 'ABANDONED', owner: '张三', abandonedReason: '对方已有自研WMS，暂无更换意向', assignedAt: '2026-07-03 09:00:00', followedAt: '2026-07-05 12:00:00', abandonedAt: '2026-07-05 12:00:00', createdAt: '2026-07-02 15:30:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0024', source: 'REFERRAL', company: '康平中药饮片公司', contact: '赵康', phone: '13800010024', email: 'zhaokang@kangping.com', industry: 'HEALTHCARE', region: '安徽省-亳州市', score: 68, status: 'ABANDONED', owner: '李四', abandonedReason: '行业不匹配，客户寻找的是诊所挂号管理软件，而非仓储管理系统', assignedAt: '2026-07-04 14:00:00', followedAt: '2026-07-06 14:15:00', abandonedAt: '2026-07-06 14:15:00', createdAt: '2026-07-04 11:20:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0025', source: 'ONLINE', company: '鼎盛网络技术服务社', contact: '陈鼎', phone: '13800010025', email: 'chending@dingsheng.com', industry: 'IT', region: '广东省-深圳市', score: 38, status: 'ABANDONED', owner: '张三', abandonedReason: '销售打错电话，客户并非强盛相关需求方，系数据录入错误', assignedAt: '2026-07-05 15:00:00', followedAt: '2026-07-07 16:40:00', abandonedAt: '2026-07-07 16:40:00', createdAt: '2026-07-05 14:10:00', createdBy: 'WmsScheduler' }
];

const MOCK_FOLLOW_UPS: FollowUpRecord[] = [
  { leadId: 'LEAD20260717-0009', time: '2026-07-17 10:30:00', operator: '张三', type: '电话', content: '【线索】初次联系，介绍了公司及产品，客户对WMS模块比较感兴趣，确认了当前系统基本满足诉求。' },
  { leadId: 'LEAD20260717-0009', time: '2026-07-17 14:30:00', operator: '张三', type: '电话', content: '【线索】客户确认技术方案可行，表示下周一会给出回复，预算在50万左右，计划同步推送ERP合同。', nextPlan: '下周一电话跟进确认采购审批进度。' },
  { leadId: 'LEAD20260717-0009', time: '2026-07-18 09:12:00', operator: '张三', type: '电话', content: '【线索】沟通了关于电商多平台库存同步方案。客户非常认可 AI 串联 ERP 与 WMS 的库存分配方案。' },
  { leadId: 'LEAD20260717-0009', time: '2026-07-18 10:00:00', operator: '张三', type: '拜访', content: '【线索】上门进行了详细的 AI 库存评分模型讲解，引流到 CRM 建档。' },
  { leadId: 'LEAD20260717-0009', time: '2026-07-18 10:30:00', operator: '张三', type: '电话', content: '【线索】客户认可建档资料并回传相关资质。' },
  { leadId: 'LEAD20260717-0010', time: '2026-07-18 09:12:00', operator: '张三', type: '电话', content: '沟通了关于电商多平台库存同步方案。客户非常认可 AI 串联 ERP 与 WMS 的库存分配方案。' },
  { leadId: 'LEAD20260717-0011', time: '2026-07-17 16:30:00', operator: '李四', type: '电话', content: '电话未接听，已发送短信说明情况，等待客户反馈。' },
  { leadId: 'LEAD20260717-0012', time: '2026-07-17 17:00:00', operator: '李四', type: '拜访', content: '现场拜访，送去了系统白皮书与技术架构白皮书。客户对 AI 预测模型表示极大的关注。' },
  { leadId: 'LEAD20260717-0013', time: '2026-07-18 08:30:00', operator: '张三', type: '邮件', content: '发送了系统演示包和详细报价表，等待高层决策批准。' },
  { leadId: 'LEAD20260717-0014', time: '2026-07-17 17:30:00', operator: '李四', type: '电话', content: '电话接通，客户表示目前在内部评估，稍后安排线上技术对接会。' },
  { leadId: 'LEAD20260717-0015', time: '2026-07-17 18:00:00', operator: '张三', type: '电话', content: '进行了产品功能的初步对接，解答了关于 API 实时同步客户数据的细节疑问。' },
  { leadId: 'LEAD20260717-0016', time: '2026-07-18 09:00:00', operator: '李四', type: '电话', content: '销售接通，客户询问了关于售后运维方案及本地部署服务器的规格配置要求。' },
  { leadId: 'LEAD20260717-0017', time: '2026-07-17 11:30:00', operator: '张三', type: '电话', content: '电话详细解答报价及付款期。客户表示付款流程没有障碍，可以直接建档。' },
  { leadId: 'LEAD20260717-0017', time: '2026-07-17 15:00:00', operator: '张三', type: '拜访', content: '拜访完成合同签约。客户表示下周即注入一期款。' },
  { id: 999, leadId: 'LEAD20260717-0018', time: '2026-07-17 16:00:00', operator: '张三', type: '电话', content: '客户确认在 ERP 中已自动获取到 CRM 建档快照，数据同步流验证通畅。' },
  { leadId: 'LEAD20260717-0019', time: '2026-07-17 14:30:00', operator: '李四', type: '电话', content: '客户明确表示目前使用某竞争对手的产品体验较好，三年内没有更换意向，遂主动放弃。' },
  { leadId: 'LEAD20260717-0020', time: '2026-07-17 15:45:00', operator: '张三', type: '电话', content: '与客户财务及厂长联系，判定预算不足，不符合系统主要客户群定位。已放弃。' }
];

// 4. 商机初始种子数据 (共 16 条)
const MOCK_OPPORTUNITIES: Opportunity[] = [
  // INITIAL_CONTACT (2条)
  { id: 'OPP20260717-0001', title: '智能仓储WMS升级项目', customerId: 'C001', customerName: '强盛科技有限公司', score: 72, status: 'INITIAL_CONTACT', createdAt: '2026-07-17 09:00:00', createdBy: '张三' },
  { id: 'OPP20260717-0002', title: '智能工厂RFID感知一期', customerId: 'C001', customerName: '强盛科技有限公司', score: 45, status: 'INITIAL_CONTACT', createdAt: '2026-07-17 10:15:00', createdBy: '李四' },

  // NEEDS_CONFIRM (3条)
  { id: 'OPP20260717-0003', title: '零售门店进销存软件采购', customerId: 'C002', customerName: '瑞丰生鲜连锁超市', amount: 30000, dealDate: '2026-08-20', desc: '客户希望打通线下收银与线上微商城库存。', score: 68, status: 'NEEDS_CONFIRM', createdAt: '2026-07-17 11:00:00', createdBy: '张三' },
  { id: 'OPP20260717-0004', title: '医疗器械WMS追溯方案', customerId: 'C004', customerName: '安泰医疗器械有限公司', amount: 80000, dealDate: '2026-09-01', desc: '需要严格符合药监局GSP认证规范要求。', score: 79, status: 'NEEDS_CONFIRM', createdAt: '2026-07-17 11:30:00', createdBy: '李四' },
  { id: 'OPP20260717-0005', title: '集团供应链ERP集成项目', customerId: 'C005', customerName: '远东重工制造集团', amount: 150000, dealDate: '2026-10-15', desc: '打通子公司间物料编码的SSOT统一。', score: 83, status: 'NEEDS_CONFIRM', createdAt: '2026-07-17 13:00:00', createdBy: '张三' },

  // PROPOSAL (3条)
  { id: 'OPP20260717-0006', title: '生鲜冷链温控仓储二期', customerId: 'C002', customerName: '瑞丰生鲜连锁超市', amount: 60000, dealDate: '2026-08-10', desc: '提供温湿度传感器联动预警和WMS数据看板。', score: 62, status: 'PROPOSAL', createdAt: '2026-07-17 14:00:00', createdBy: '张三', items: [{ productCode: 'SKU001', productName: 'Forge WMS 标准版', price: 50000, quantity: 1 }] },
  { id: 'OPP20260717-0007', title: '金融信息机房备件备品库', customerId: 'C009', customerName: '金石金融信息服务公司', amount: 110000, dealDate: '2026-08-30', desc: '用于高价值IT资产的精细化出入库管理。', score: 85, status: 'PROPOSAL', createdAt: '2026-07-17 14:30:00', createdBy: '李四', items: [{ productCode: 'SKU001', productName: 'Forge WMS 标准版', price: 50000, quantity: 2 }] },
  { id: 'OPP20260717-0008', title: '化工原材料条码仓管理案', customerId: 'C007', customerName: '聚百川化工材料有限公司', amount: 50000, dealDate: '2026-09-05', desc: '化学防爆等级防错，批次号保质期精细跟踪。', score: 55, status: 'PROPOSAL', createdAt: '2026-07-17 15:00:00', createdBy: '张三', items: [{ productCode: 'SKU001', productName: 'Forge WMS 标准版', price: 50000, quantity: 1 }] },

  // NEGOTIATION (3条)
  { id: 'OPP20260717-0009', title: '华东电商分拣中心WMS部署', customerId: 'C010', customerName: '宏图物流集团有限公司', amount: 200000, dealDate: '2026-08-01', desc: '高并发波次发货，集成播种墙和多面扫描通道。', score: 88, status: 'NEGOTIATION', createdAt: '2026-07-17 15:30:00', createdBy: '张三', items: [{ productCode: 'SKU001', productName: 'Forge WMS 标准版', price: 50000, quantity: 4 }] },
  { id: 'OPP20260717-0010', title: '智能工厂ERP升级采购', customerId: 'C001', customerName: '强盛科技有限公司', amount: 130000, dealDate: '2026-08-15', desc: '老旧ERP系统重构，打通下游WMS，一期采购WMS和ERP标准版各一套。', score: 72, status: 'NEGOTIATION', createdAt: '2026-07-17 09:30:00', createdBy: '张三', items: [
    { productCode: 'SKU001', productName: 'Forge WMS 标准版', price: 50000, quantity: 1 },
    { productCode: 'SKU002', productName: 'Forge ERP 标准版', price: 80000, quantity: 1 }
  ] },
  { id: 'OPP20260717-0011', title: '云网络科技研发仓管理', customerId: 'C010', customerName: '天河云网络科技有限公司', amount: 50000, dealDate: '2026-08-25', desc: '研发测试设备的防盗防丢流转，使用扫码技术。', score: 70, status: 'NEGOTIATION', createdAt: '2026-07-17 16:30:00', createdBy: '李四', items: [{ productCode: 'SKU001', productName: 'Forge WMS 标准版', price: 50000, quantity: 1 }] },

  // CONTRACT (2条)
  { id: 'OPP20260717-0012', title: '百盛生物医药一期仓库WMS', customerId: 'C008', customerName: '百盛生物医药实验室', amount: 100000, dealDate: '2026-08-10', desc: '生物制药仓库温控WMS，符合FDA规范。', score: 81, status: 'CONTRACT', contractNo: 'CT20260717-9001', createdAt: '2026-07-17 17:00:00', createdBy: '李四', items: [{ productCode: 'SKU001', productName: 'Forge WMS 标准版', price: 50000, quantity: 2 }] },
  { id: 'OPP20260717-0013', title: '新华百货连锁一号仓ERP升级', customerId: 'C002', customerName: '新华百货连锁商场', amount: 80000, dealDate: '2026-08-05', desc: '百货类多货位拣货方案，ERP订单对接。', score: 90, status: 'CONTRACT', contractNo: 'CT20260717-9002', createdAt: '2026-07-17 17:30:00', createdBy: '张三', items: [{ productCode: 'SKU002', productName: 'Forge ERP 标准版', price: 80000, quantity: 1 }] },

  // WON (2条)
  { id: 'OPP20260717-0014', title: '鼎泰金融资产仓库条码管理', customerId: 'C009', customerName: '鼎泰信托金融集团', amount: 50000, dealDate: '2026-07-18', desc: '金融抵押物监管仓。一期合同已履约，下推ERP。', score: 98, status: 'WON', contractNo: 'CT20260717-9003', createdAt: '2026-07-17 18:00:00', createdBy: '张三', items: [{ productCode: 'SKU001', productName: 'Forge WMS 标准版', price: 50000, quantity: 1 }] },
  { id: 'OPP20260717-0015', title: '万达商贸华北仓冷链WMS', customerId: 'C003', customerName: '万达商贸进出口公司', amount: 100000, dealDate: '2026-07-18', desc: '万达商贸二期冷链，已经生成ERP销售订单。', score: 100, status: 'WON', contractNo: 'CT20260717-9004', createdAt: '2026-07-17 18:15:00', createdBy: '李四', items: [{ productCode: 'SKU001', productName: 'Forge WMS 标准版', price: 50000, quantity: 2 }] },

  // LOST (1条)
  { id: 'OPP20260717-0016', title: '智能工厂ERP升级采购丢单', customerId: 'C005', customerName: '蓝天制造厂', amount: 130000, dealDate: '2026-07-17', desc: '蓝天制造升级。', score: 0, status: 'LOST', lostReason: '竞争对手报价低30%,我方无法匹配', createdAt: '2026-07-17 19:00:00', createdBy: '张三', items: [{ productCode: 'SKU002', productName: 'Forge ERP 标准版', price: 80000, quantity: 1 }] }
];

// 5. 商机跟进历史种子数据
const MOCK_OPP_FOLLOW_UPS: OpportunityFollowUp[] = [
  { oppId: 'OPP20260717-0010', time: '2026-07-18 09:15:00', operator: '张三', type: '电话', content: '【商机】双方就一期 13 万预算达成一致意见，客户要求我们先发报价单电子版。当前已进入方案谈判细节。' },
  { oppId: 'OPP20260717-0010', time: '2026-07-18 09:40:00', operator: '张三', type: '拜访', content: '【商机】现场演示了 Forge WMS 的播种墙出库和 RFID 看板功能。客户对 AI 评分及智能分库非常认可，已关联商品明细。' },
  { oppId: 'OPP20260717-0010', time: '2026-07-18 10:15:00', operator: '张三', type: '电话', content: '【商机】初次商机确认，客户确实需要升级老旧ERP以打通仓储条码出入库。' }
];

// 6. 客户快照数据 (共 10 条，覆盖不同流失风险)
const MOCK_CUSTOMERS: Customer[] = [
  { id: 'C001', name: '强盛科技有限公司', contact: '赵六', phone: '13800010009', email: 'zhaoliu@qiangsheng.com', industry: 'IT', region: '江苏省-南京市', level: 'VIP', creditLimit: 200000, riskLevel: 'MEDIUM', owner: '张三', createdAt: '2026-07-17 09:30:00' },
  { id: 'C002', name: '瑞丰生鲜连锁超市', contact: '王强', phone: '13800010008', email: 'wangqiang@ruifeng.com', industry: 'RETAIL', region: '湖北省-武汉市', level: 'A', creditLimit: 100000, riskLevel: 'LOW', owner: '张三', createdAt: '2026-07-17 13:40:00' },
  { id: 'C003', name: '万达商贸进出口公司', contact: '陈曦', phone: '13800010019', email: 'chenxi@wanda.com', industry: 'RETAIL', region: '北京市-朝阳区', level: 'B', creditLimit: 150000, riskLevel: 'HIGH', owner: '李四', createdAt: '2026-07-17 13:30:00' },
  { id: 'C004', name: '安泰医疗器械有限公司', contact: '李华', phone: '13800010004', email: 'lihua@antai.com', industry: 'HEALTHCARE', region: '江苏省-苏州市', level: 'VIP', creditLimit: 300000, riskLevel: 'LOW', owner: '李四', createdAt: '2026-07-17 11:00:00' },
  { id: 'C005', name: '远东重工制造集团', contact: '郑军', phone: '13800010007', email: 'zhengjun@yuandong.com', industry: 'MANUFACTURING', region: '辽宁省-沈阳市', level: 'A', creditLimit: 500000, riskLevel: 'HIGH', owner: '李四', createdAt: '2026-07-17 12:30:00' },
  { id: 'C006', name: '龙腾实业有限公司', contact: '赵刚', phone: '13800010001', email: 'zhaogang@longteng.com', industry: 'MANUFACTURING', region: '北京市-东城区', level: 'C', creditLimit: 50000, riskLevel: 'LOW', owner: '张三', createdAt: '2026-07-17 09:00:00' },
  { id: 'C007', name: '海纳商贸有限公司', contact: '孙明', phone: '13800010002', email: 'sunming@haina.com', industry: 'RETAIL', region: '广东省-广州市', level: 'B', creditLimit: 120000, riskLevel: 'MEDIUM', owner: '张三', createdAt: '2026-07-17 09:30:00' },
  { id: 'C008', name: '智芯微电子技术公司', contact: '钱伟', phone: '13800010003', email: 'qianwei@zhixin.com', industry: 'IT', region: '上海市-张江区', level: 'VIP', creditLimit: 400000, riskLevel: 'LOW', owner: '李四', createdAt: '2026-07-17 10:15:00' },
  { id: 'C009', name: '金石金融信息服务公司', contact: '周亮', phone: '13800010005', email: 'zhouliang@jinshi.com', industry: 'FINANCE', region: '四川省-成都市', level: 'A', creditLimit: 250000, riskLevel: 'MEDIUM', owner: '张三', createdAt: '2026-07-17 11:30:00' },
  { id: 'C010', name: '天河云网络科技有限公司', contact: '吴勇', phone: '13800010006', email: 'wuyong@tianhe.com', industry: 'IT', region: '浙江省-杭州市', level: 'B', creditLimit: 88000, riskLevel: 'LOW', owner: '张三', createdAt: '2026-07-17 11:45:00' }
];

// 7. ERP 销售订单数据 (强盛科技有 2 个关联订单)
const MOCK_ERP_ORDERS: ErpOrder[] = [
  { id: 'ORD20260717-0001', customerId: 'C001', amount: 50000, date: '2026-07-17', status: 'SIGNED' },
  { id: 'ORD20260717-0002', customerId: 'C001', amount: 80000, date: '2026-07-18', status: 'PENDING_DELIVERY' },
  { id: 'ORD20260717-0003', customerId: 'C002', amount: 30000, date: '2026-07-17', status: 'SHIPPED' },
  { id: 'ORD20260717-0004', customerId: 'C004', amount: 80000, date: '2026-07-18', status: 'PENDING_DELIVERY' }
];

export async function seedDatabase() {
  const leadCount = await db.leads.count();
  const oppCount = await db.opportunities.count();
  const customerCount = await db.customers.count();
  const orderCount = await db.erp_orders.count();
  
  if (leadCount === 0) {
    await db.transaction('rw', db.leads, db.follow_up_records, async () => {
      await db.leads.bulkAdd(MOCK_LEADS);
      await db.follow_up_records.bulkAdd(MOCK_FOLLOW_UPS);
    });
    console.log('IndexedDB 线索种子数据已初始化！');
  }

  if (oppCount === 0) {
    await db.transaction('rw', db.opportunities, db.opportunity_follow_ups, async () => {
      await db.opportunities.bulkAdd(MOCK_OPPORTUNITIES);
      await db.opportunity_follow_ups.bulkAdd(MOCK_OPP_FOLLOW_UPS);
    });
    console.log('IndexedDB 商机种子数据已初始化！');
  }

  if (customerCount === 0) {
    await db.transaction('rw', db.customers, async () => {
      await db.customers.bulkAdd(MOCK_CUSTOMERS);
    });
    console.log('IndexedDB 客户种子数据已初始化！');
  }

  if (orderCount === 0) {
    await db.transaction('rw', db.erp_orders, async () => {
      await db.erp_orders.bulkAdd(MOCK_ERP_ORDERS);
    });
    console.log('IndexedDB ERP 销售订单种子数据已初始化！');
  }
}

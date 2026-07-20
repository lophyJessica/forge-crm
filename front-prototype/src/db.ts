import Dexie, { type Table } from 'dexie';
import { getErpCustomers } from './api/erpSync';

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
  convertedAt?: string; // 联动业绩目标的线索转化时间
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
  wonAt?: string; // 赢单日期
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

// 合同管理数据结构
export interface Contract {
  id: string; // CT{YYYYMMDD}-{4位序号}
  title: string;
  customerId: string;
  customerName: string;
  oppId: string;
  oppTitle: string;
  amount: number;
  status: 'DRAFT' | 'PENDING_SIGN' | 'SIGNED' | 'ARCHIVED' | 'VOIDED';
  signedDate?: string;
  voidReason?: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
}

// 拜访计划数据结构
export interface Visit {
  id: string; // VS{YYYYMMDD}-{4位序号}
  title: string;
  associationType: 'LEAD' | 'OPPORTUNITY' | 'CUSTOMER';
  associationId: string;
  associationName: string;
  visitMethod: '上门' | '电话' | '视频';
  planTime: string;
  address?: string;
  status: 'PLANNED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED';
  checkedInAt?: string;
  checkedInAddress?: string;
  content?: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
}

// 业绩目标数据结构 (TGT 格式)
export interface Target {
  id: string; // TGT{YYYYMM}-{销售ID}
  salesName: string;
  month: string; // YYYY-MM
  leadTarget: number;
  oppTarget: number;
  amountTarget: number;
  status: 'ACTIVE' | 'ACHIEVED' | 'UNACHIEVED';
  // 锁定快照值 (锁定时写入，防止未来数据漂移)
  lockedLeadCount?: number;
  lockedOppCount?: number;
  lockedAmount?: number;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
}

// 2. 创建数据库实例 (升级至版本 6 以引入业绩目标表)
class ForgeCrmDatabase extends Dexie {
  leads!: Table<Lead, string>;
  follow_up_records!: Table<FollowUpRecord, number>;
  opportunities!: Table<Opportunity, string>;
  opportunity_follow_ups!: Table<OpportunityFollowUp, number>;
  customers!: Table<Customer, string>;
  erp_orders!: Table<ErpOrder, string>;
  contracts!: Table<Contract, string>;
  visits!: Table<Visit, string>;
  targets!: Table<Target, string>;

  constructor() {
    super('ForgeCrmDatabase');
    this.version(6).stores({
      leads: 'id, phone, email, status, owner, createdAt',
      follow_up_records: '++id, leadId, time',
      opportunities: 'id, customerId, status, createdAt',
      opportunity_follow_ups: '++id, oppId, time',
      customers: 'id, name, riskLevel, level',
      erp_orders: 'id, customerId, date',
      contracts: 'id, customerId, oppId, status, createdAt',
      visits: 'id, associationId, associationType, status, planTime',
      targets: 'id, salesName, month, status'
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
  { id: 'LEAD20260717-0017', source: 'ONLINE', company: '聚百川化工材料有限公司', contact: '陈凯', phone: '13800010017', email: 'chenkai@jubaichuan.com', industry: 'MANUFACTURING', region: '山东省-淄博市', score: 88, status: 'CONVERTED', owner: '张三', assignedAt: '2026-07-17 11:00:00', followedAt: '2026-07-17 15:00:00', convertedAt: '2026-07-17 15:00:00', createdAt: '2026-07-17 10:30:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0018', source: 'REFERRAL', company: '新华百货连锁商场', contact: '刘强', phone: '13800010018', email: 'liuqiang@xinhua.com', industry: 'RETAIL', region: '宁夏-银川市', score: 94, status: 'CONVERTED', owner: '张三', assignedAt: '2026-07-17 13:30:00', followedAt: '2026-07-17 16:00:00', convertedAt: '2026-07-17 16:00:00', createdAt: '2026-07-17 13:00:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0019', source: 'ONLINE', company: '万达商贸进出口公司', contact: '陈曦', phone: '13800010019', email: 'chenxi@wanda.com', industry: 'RETAIL', region: '北京市-朝阳区', score: 45, status: 'ABANDONED', owner: '李四', abandonedReason: '客户无购买意向，已使用竞品WMS系统', assignedAt: '2026-07-17 14:00:00', followedAt: '2026-07-17 14:30:00', abandonedAt: '2026-07-17 14:30:00', createdAt: '2026-07-17 13:30:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0020', source: 'ACTIVITY', company: '辉煌重工装备科技公司', contact: '陆军', phone: '13800010020', email: 'lujun@huihuang.com', industry: 'MANUFACTURING', region: '河北省-唐山市', score: 32, status: 'ABANDONED', owner: '张三', abandonedReason: '非目标客户，客户为纯内销代加工，无ERP/CRM预算', assignedAt: '2026-07-17 15:00:00', followedAt: '2026-07-17 15:45:00', abandonedAt: '2026-07-17 15:45:00', createdAt: '2026-07-17 14:40:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0021', source: 'ONLINE', company: '晨光文具供应中心', contact: '王梅', phone: '13800010021', email: 'wangmei@chenguang.com', industry: 'RETAIL', region: '上海市-黄浦区', score: 62, status: 'ABANDONED', owner: '李四', abandonedReason: '电话多次未接听，已发送说明短信，无人回馈，超时放弃', assignedAt: '2026-07-05 10:00:00', followedAt: '2026-07-08 09:00:00', abandonedAt: '2026-07-08 09:00:00', createdAt: '2026-07-05 09:30:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0022', source: 'ACTIVITY', company: '腾飞钢结构工程公司', contact: '李腾', phone: '13800010022', email: 'liteng@tengfei.com', industry: 'MANUFACTURING', region: '山东省-济南市', score: 55, status: 'ABANDONED', owner: '张三', abandonedReason: '非目标群体，客户业务过小，无法承担ERP采购成本', assignedAt: '2026-07-06 11:00:00', followedAt: '2026-07-09 10:30:00', abandonedAt: '2026-07-09 10:30:00', createdAt: '2026-07-06 10:15:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0023', source: 'EXHIBITION', company: '天诚半导体设备厂', contact: '张天', phone: '13800010023', email: 'zhangtian@tiancheng.com', industry: 'IT', region: '江苏省-无锡市', score: 78, status: 'ABANDONED', owner: '张三', abandonedReason: '对方已有自研WMS，暂无更换意向', assignedAt: '2026-07-05 12:00:00', abandonedAt: '2026-07-05 12:00:00', createdAt: '2026-07-02 15:30:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0024', source: 'REFERRAL', company: '康平中药饮片公司', contact: '赵康', phone: '13800010024', email: 'zhaokang@kangping.com', industry: 'HEALTHCARE', region: '安徽省-亳州市', score: 68, status: 'ABANDONED', owner: '李四', abandonedReason: '行业不匹配，客户寻找的是诊所挂号管理软件，而非仓储管理系统', assignedAt: '2026-07-04 14:00:00', followedAt: '2026-07-06 14:15:00', abandonedAt: '2026-07-06 14:15:00', createdAt: '2026-07-04 11:20:00', createdBy: 'WmsScheduler' },
  { id: 'LEAD20260717-0025', source: 'ONLINE', company: '鼎盛网络技术服务社', contact: '陈鼎', phone: '13800010025', email: 'chending@dingsheng.com', industry: 'IT', region: '广东省-深圳市', score: 38, status: 'ABANDONED', owner: '张三', abandonedReason: '销售打错电话，客户并非强盛相关需求方，系数据录入错误', assignedAt: '2026-07-05 15:00:00', followedAt: '2026-07-07 16:40:00', abandonedAt: '2026-07-07 16:40:00', createdAt: '2026-07-05 14:10:00', createdBy: 'WmsScheduler' }
];

const MOCK_FOLLOW_UPS: FollowUpRecord[] = [
  { leadId: 'LEAD20260717-0009', time: '2026-07-17 14:30:00', operator: '张三', type: '电话', content: '客户来电询问 WMS 系统是否支持与金蝶 ERP 双向对接，已做解答，并约定下周演示。', nextPlan: '准备对接 PPT 方案' },
  { leadId: 'LEAD20260717-0009', time: '2026-07-17 16:40:00', operator: '张三', type: '邮件', content: '发送了 Forge 仓储一体化标准产品册及制造业实施白皮书，客户邮件已确认收到。' },
  { leadId: 'LEAD20260717-0010', time: '2026-07-18 09:12:00', operator: '张三', type: '拜访', content: '拜访了宏图物流负责的陈总，对方对条码追溯及库位分配精度有较高期望。', nextPlan: '配合方案部输出一期仓容布局规划图' }
];

const MOCK_OPPORTUNITIES: Opportunity[] = [
  // INITIAL_CONTACT (2条)
  { id: 'OPP20260717-0001', title: '强盛科技智能出入库WMS采购', customerId: 'C001', customerName: '强盛科技有限公司', amount: 80000, dealDate: '2026-08-30', desc: '强盛科技智能出入库升级，意向强烈。', score: 25, status: 'INITIAL_CONTACT', createdAt: '2026-07-17 10:00:00', createdBy: '张三' },
  { id: 'OPP20260717-0002', title: '海纳商贸零售配仓ERP升级', customerId: 'C007', customerName: '海纳商贸有限公司', amount: 150000, dealDate: '2026-09-15', desc: '海纳商贸零售配仓，正在搜集需求。', score: 30, status: 'INITIAL_CONTACT', createdAt: '2026-07-17 10:30:00', createdBy: '张三' },

  // NEEDS_CONFIRM (3条)
  { id: 'OPP20260717-0003', title: '智芯微电子芯片封装条码管理', customerId: 'C008', customerName: '智芯微电子技术公司', amount: 200000, dealDate: '2026-10-10', desc: '智芯微电子需要封装条码追溯。', score: 45, status: 'NEEDS_CONFIRM', createdAt: '2026-07-17 11:15:00', createdBy: '李四', items: [{ productCode: 'SKU001', productName: 'Forge WMS 标准版', price: 50000, quantity: 4 }] },
  { id: 'OPP20260717-0004', title: '安泰医疗高值耗材WMS追溯', customerId: 'C004', customerName: '安泰医疗器械有限公司', amount: 120000, dealDate: '2026-08-15', desc: '耗材防混淆追溯。', score: 50, status: 'NEEDS_CONFIRM', createdAt: '2026-07-17 12:00:00', createdBy: '李四', items: [{ productCode: 'SKU001', productName: 'Forge WMS 标准版', price: 50000, quantity: 1 }] },
  { id: 'OPP20260717-0005', title: '金石金融信托文档电子仓采购', customerId: 'C009', customerName: '金石金融信息服务公司', amount: 90000, dealDate: '2026-08-20', desc: '信托实体文档存储仓开发。', score: 40, status: 'NEEDS_CONFIRM', createdAt: '2026-07-17 13:00:00', createdBy: '张三' },

  // PROPOSAL (2条)
  { id: 'OPP20260717-0006', title: '天河云网络多活IDC资产管理', customerId: 'C010', customerName: '天河云网络科技有限公司', amount: 180000, dealDate: '2026-09-01', desc: '天河云多活机房固定资产。', score: 62, status: 'PROPOSAL', createdAt: '2026-07-17 14:00:00', createdBy: '张三', items: [{ productCode: 'SKU002', productName: 'Forge ERP 标准版', price: 80000, quantity: 2 }] },
  { id: 'OPP20260717-0007', title: '远东重工制造一期MES对接WMS', customerId: 'C005', customerName: '远东重工制造集团', amount: 350000, dealDate: '2026-08-25', desc: 'MES一期对接。', score: 58, status: 'PROPOSAL', createdAt: '2026-07-17 14:30:00', createdBy: '李四', items: [{ productCode: 'SKU001', productName: 'Forge WMS 标准版', price: 50000, quantity: 7 }] },

  // NEGOTIATION (2条)
  { id: 'OPP20260717-0010', title: '强盛科技多基地仓储协同系统', customerId: 'C001', customerName: '强盛科技有限公司', amount: 130000, dealDate: '2026-08-10', desc: '谈判焦点在于二期扩容授权。已完成报价与演示，近期需签单。', score: 75, status: 'NEGOTIATION', createdAt: '2026-07-17 15:00:00', createdBy: '张三', items: [{ productCode: 'SKU001', productName: 'Forge WMS 标准版', price: 50000, quantity: 1 }, { productCode: 'SKU002', productName: 'Forge ERP 标准版', price: 80000, quantity: 1 }] },
  { id: 'OPP20260717-0011', title: '瑞丰生鲜连锁配仓WMS部署', customerId: 'C002', customerName: '瑞丰生鲜连锁超市', amount: 50000, dealDate: '2026-08-18', desc: '生鲜恒温冷库条码仓实施。', score: 70, status: 'NEGOTIATION', createdAt: '2026-07-17 15:45:00', createdBy: '张三', items: [{ productCode: 'SKU001', productName: 'Forge WMS 标准版', price: 50000, quantity: 1 }] },

  // CONTRACT (3条)
  { id: 'OPP20260717-0012', title: '百盛生物医药试剂冷链WMS采购', customerId: 'C003', customerName: '万达商贸进出口公司', amount: 60000, dealDate: '2026-07-28', desc: '合同审批中。', score: 85, status: 'CONTRACT', createdAt: '2026-07-17 16:30:00', createdBy: '李四', items: [{ productCode: 'SKU001', productName: 'Forge WMS 标准版', price: 50000, quantity: 1.2 }] },
  { id: 'OPP20260717-0013', title: '鼎泰信托固定收益凭证智能仓', customerId: 'C009', customerName: '金石金融信息服务公司', amount: 100000, dealDate: '2026-07-25', desc: '纸质凭证保管。', score: 90, status: 'CONTRACT', createdAt: '2026-07-17 17:00:00', createdBy: '张三', items: [{ productCode: 'SKU002', productName: 'Forge ERP 标准版', price: 80000, quantity: 1.25 }] },
  { id: 'OPP20260717-0014', title: '星河泛娱周边仓智能配货WMS', customerId: 'C010', customerName: '天河云网络科技有限公司', amount: 50000, dealDate: '2026-07-30', desc: '周边仓储配货。', score: 88, status: 'CONTRACT', createdAt: '2026-07-17 17:30:00', createdBy: '李四', items: [{ productCode: 'SKU001', productName: 'Forge WMS 标准版', price: 50000, quantity: 1 }] },

  // WON (2条)
  { id: 'OPP20260717-0015', title: '万达商贸华北仓冷链WMS', customerId: 'C003', customerName: '万达商贸进出口公司', amount: 100000, dealDate: '2026-07-18', desc: '万达商贸二期冷链，已经生成ERP销售订单。', score: 100, status: 'WON', contractNo: 'CT20260717-9004', createdAt: '2026-07-17 18:15:00', createdBy: '李四', items: [{ productCode: 'SKU001', productName: 'Forge WMS 标准版', price: 50000, quantity: 2 }] },

  // LOST (1条)
  { id: 'OPP20260717-0016', title: '智能工厂ERP升级采购丢单', customerId: 'C005', customerName: '蓝天制造厂', amount: 130000, dealDate: '2026-07-17', desc: '蓝天制造升级。', score: 0, status: 'LOST', lostReason: '竞争对手报价低30%,我方无法匹配', createdAt: '2026-07-17 19:00:00', createdBy: '张三', items: [{ productCode: 'SKU002', productName: 'Forge ERP 标准版', price: 80000, quantity: 1 }] }
];

const MOCK_OPP_FOLLOW_UPS: OpportunityFollowUp[] = [
  { oppId: 'OPP20260717-0010', time: '2026-07-18 09:15:00', operator: '张三', type: '电话', content: '【商机】双方就一期 13 万预算达成一致意见，客户要求我们先发报价单电子版。当前已进入方案谈判细节。' },
  { oppId: 'OPP20260717-0010', time: '2026-07-18 09:40:00', operator: '张三', type: '拜访', content: '【商机】现场演示了 Forge WMS 的播种墙出库 and RFID 看板功能。客户对 AI 评分及智能分库非常认可，已关联商品明细。' },
  { oppId: 'OPP20260717-0010', time: '2026-07-18 10:15:00', operator: '张三', type: '电话', content: '【商机】初次商机确认，客户确实需要升级老旧ERP以打通仓储条码出入库。' }
];

// MOCK_CUSTOMERS 已移除，客户列表改为直接从 ERP 获取。

const MOCK_ERP_ORDERS: ErpOrder[] = [
  { id: 'ORD20260717-0001', customerId: 'C001', amount: 50000, date: '2026-07-17', status: 'SIGNED' },
  { id: 'ORD20260717-0002', customerId: 'C001', amount: 80000, date: '2026-07-18', status: 'PENDING_DELIVERY' },
  { id: 'ORD20260717-0003', customerId: 'C002', amount: 30000, date: '2026-07-17', status: 'SHIPPED' },
  { id: 'ORD20260717-0004', customerId: 'C004', amount: 80000, date: '2026-07-18', status: 'PENDING_DELIVERY' }
];

const MOCK_CONTRACTS: Contract[] = [
  { id: 'CT20260717-0001', title: '强盛科技多基地仓储系统实施合同', customerId: 'C001', customerName: '强盛科技有限公司', oppId: 'OPP20260717-0010', oppTitle: '强盛科技多基地仓储协同系统', amount: 130000, status: 'SIGNED', signedDate: '2026-07-17', createdAt: '2026-07-17 15:30:00', createdBy: '张三' },
  { id: 'CT20260718-0002', title: '强盛科技智能出入库升级采购合同', customerId: 'C001', customerName: '强盛科技有限公司', oppId: 'OPP20260717-0001', oppTitle: '强盛科技智能出入库WMS采购', amount: 80000, status: 'DRAFT', createdAt: '2026-07-18 10:00:00', createdBy: '张三' },
  { id: 'CT20260718-0003', title: '瑞丰生鲜冷链配仓WMS部署签署书', customerId: 'C002', customerName: '瑞丰生鲜连锁超市', oppId: 'OPP20260717-0011', oppTitle: '瑞丰生鲜连锁配仓WMS部署', amount: 50000, status: 'PENDING_SIGN', createdAt: '2026-07-18 10:15:00', createdBy: '张三' },
  { id: 'CT20260718-0004', title: '安泰医疗耗材追溯WMS采购合同', customerId: 'C004', customerName: '安泰医疗器械有限公司', oppId: 'OPP20260717-0004', oppTitle: '安泰医疗高值耗材WMS追溯', amount: 120000, status: 'SIGNED', signedDate: '2026-07-18', createdAt: '2026-07-18 10:30:00', createdBy: '李四' },
  { id: 'CT20260718-0005', title: '远东重工制造MES对接合同(已废)', customerId: 'C005', customerName: '远东重工制造集团', oppId: 'OPP20260717-0007', oppTitle: '远东重工制造一期MES对接WMS', amount: 350000, status: 'VOIDED', voidReason: '方案变更，重新谈判', createdAt: '2026-07-18 10:45:00', createdBy: '李四' },
  { id: 'CT20260718-0006', title: '聚百川化工材料销售主合同', customerId: 'C006', customerName: '龙腾实业有限公司', oppId: 'OPP20260717-0001', oppTitle: '强盛科技智能出入库WMS采购', amount: 50000, status: 'ARCHIVED', signedDate: '2026-07-17', createdAt: '2026-07-17 11:00:00', createdBy: '张三' },
  { id: 'CT20260718-0007', title: '海纳商贸零售配仓ERP实施协议', customerId: 'C007', customerName: '海纳商贸有限公司', oppId: 'OPP20260717-0002', oppTitle: '海纳商贸零售配仓ERP升级', amount: 150000, status: 'DRAFT', createdAt: '2026-07-18 11:15:00', createdBy: '张三' },
  { id: 'CT20260718-0008', title: '智芯微电子芯片条码实施采购合同', customerId: 'C008', customerName: '智芯微电子技术公司', oppId: 'OPP20260717-0003', oppTitle: '智芯微电子芯片封装条码管理', amount: 200000, status: 'PENDING_SIGN', createdAt: '2026-07-18 11:30:00', createdBy: '李四' }
];

const MOCK_VISITS: Visit[] = [
  { id: 'VS20260718-0001', title: '强盛科技二基地RFID播种墙现场演示', associationType: 'CUSTOMER', associationId: 'C001', associationName: '强盛科技有限公司', visitMethod: '上门', planTime: '2026-07-18 14:00', address: '江苏省南京市江宁区强盛科技园B座1楼大堂', status: 'PLANNED', createdAt: '2026-07-18 09:30', createdBy: '张三' },
  { id: 'VS20260718-0002', title: '海纳商贸WMS需求对接视频会', associationType: 'LEAD', associationId: 'LEAD20260717-0002', associationName: '海纳商贸有限公司', visitMethod: '视频', planTime: '2026-07-18 15:30', status: 'PLANNED', createdAt: '2026-07-18 10:00', createdBy: '张三' },
  { id: 'VS20260718-0003', title: '智芯微电子芯片封装库区条码化细节沟通', associationType: 'OPPORTUNITY', associationId: 'OPP20260717-0003', associationName: '智芯微电子芯片封装条码管理', visitMethod: '上门', planTime: '2026-07-18 10:00', address: '上海市浦东新区张江高科智芯大厦', status: 'CHECKED_IN', checkedInAt: '2026-07-18 09:55', checkedInAddress: '上海市浦东新区张江高科智芯大厦正门', createdAt: '2026-07-18 08:30', createdBy: '李四' },
  { id: 'VS20260718-0004', title: '安泰医疗耗材防混淆WMS一期规划探讨', associationType: 'OPPORTUNITY', associationId: 'OPP20260717-0004', associationName: '安泰医疗高值耗材WMS追溯', visitMethod: '视频', planTime: '2026-07-18 11:00', status: 'CHECKED_IN', checkedInAt: '2026-07-18 10:58', checkedInAddress: '在线视频会议房间 663-882-901', createdAt: '2026-07-18 09:00', createdBy: '李四' },
  { id: 'VS20260718-0005', title: '瑞丰生鲜冷链配仓WMS部署跟进拜访', associationType: 'OPPORTUNITY', associationId: 'OPP20260717-0011', associationName: '瑞丰生鲜连锁配仓WMS部署', visitMethod: '上门', planTime: '2026-07-17 14:00', address: '湖北省武汉市东西湖瑞丰冷链产业园', status: 'COMPLETED', checkedInAt: '2026-07-17 13:50', checkedInAddress: '湖北省武汉市东西湖区瑞丰冷链A库门卫室', content: '【商务谈判】拜访了瑞丰冷链项目负责人李总。双方就一期 5 万恒温库部署合同条款达成了一致，对方承诺下周内盖章提交。', createdAt: '2026-07-17 10:00', createdBy: '张三' },
  { id: 'VS20260718-0006', title: '龙腾实业制造业WMS上线前拜访', associationType: 'CUSTOMER', associationId: 'C006', associationName: '龙腾实业有限公司', visitMethod: '电话', planTime: '2026-07-17 16:00', status: 'COMPLETED', checkedInAt: '2026-07-17 15:58', checkedInAddress: '电话回访系统记录', content: '【常规跟进】致电赵总进行了项目上线前电话确认，硬件手持PDA已成功抵达现场并完成开箱检测，软件接口全部调通。', createdAt: '2026-07-17 11:00', createdBy: '张三' },
  { id: 'VS20260718-0007', title: '百盛生物医药一期防错料测试回访', associationType: 'LEAD', associationId: 'LEAD20260717-0012', associationName: '百盛生物医药实验室', visitMethod: '上门', planTime: '2026-07-17 10:00', address: '陕西省西安市高新区百盛科技园', status: 'COMPLETED', checkedInAt: '2026-07-17 09:50', checkedInAddress: '陕西省西安市雁塔区百盛科技大厦主楼', content: '【方案沟通】现场协助客户做了一期冷链电子标签防错料分拣性能评测。系统响应速度在 200ms 内，效果优秀。', createdAt: '2026-07-16 15:00', createdBy: '李四' },
  { id: 'VS20260718-0008', title: '鼎泰信托固定收益凭证项目取消会晤', associationType: 'OPPORTUNITY', associationId: 'OPP20260717-0013', associationName: '鼎泰信托固定收益凭证智能仓', visitMethod: '上门', planTime: '2026-07-18 16:00', address: '北京市西城区金融街鼎泰大厦', status: 'CANCELLED', createdAt: '2026-07-18 10:00', createdBy: '张三' }
];

// 10. 业绩目标模拟数据种子 (3个销售 x 2个月 = 6条，包含历史月已锁定和当月进行中)
const MOCK_TARGETS: Target[] = [
  // 6月份历史已结算归档 (已锁定，防止数据漂移)
  { id: 'TGT202606-S001', salesName: '张三', month: '2026-06', leadTarget: 2, oppTarget: 2, amountTarget: 100000, status: 'ACHIEVED', lockedLeadCount: 2, lockedOppCount: 2, lockedAmount: 130000, createdAt: '2026-06-01 09:00:00', createdBy: '系统主管' },
  { id: 'TGT202606-S002', salesName: '李四', month: '2026-06', leadTarget: 2, oppTarget: 2, amountTarget: 200000, status: 'UNACHIEVED', lockedLeadCount: 1, lockedOppCount: 1, lockedAmount: 60000, createdAt: '2026-06-01 09:15:00', createdBy: '系统主管' },
  { id: 'TGT202606-S003', salesName: '王五', month: '2026-06', leadTarget: 1, oppTarget: 1, amountTarget: 50000, status: 'ACHIEVED', lockedLeadCount: 1, lockedOppCount: 1, lockedAmount: 50000, createdAt: '2026-06-01 09:30:00', createdBy: '系统主管' },

  // 7月份当前进行中 (ACTIVE)
  { id: 'TGT202607-S001', salesName: '张三', month: '2026-07', leadTarget: 3, oppTarget: 4, amountTarget: 300000, status: 'ACTIVE', createdAt: '2026-07-01 09:00:00', createdBy: '系统主管' },
  { id: 'TGT202607-S002', salesName: '李四', month: '2026-07', leadTarget: 4, oppTarget: 4, amountTarget: 350000, status: 'ACTIVE', createdAt: '2026-07-01 09:15:00', createdBy: '系统主管' },
  { id: 'TGT202607-S003', salesName: '王五', month: '2026-07', leadTarget: 2, oppTarget: 2, amountTarget: 100000, status: 'ACTIVE', createdAt: '2026-07-01 09:30:00', createdBy: '系统主管' }
];

export async function seedDatabase() {
  const leadCount = await db.leads.count();
  const oppCount = await db.opportunities.count();
  const customerCount = await db.customers.count();
  const orderCount = await db.erp_orders.count();
  const contractCount = await db.contracts.count();
  const visitCount = await db.visits.count();
  const targetCount = await db.targets.count();
  
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
    const erpCustomers = await getErpCustomers();
    if (erpCustomers && erpCustomers.length > 0) {
      await db.transaction('rw', db.customers, async () => {
        const syncedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
        const formatted: Customer[] = erpCustomers.map(cust => ({
          id: String(cust.id),
          name: cust.name,
          contact: cust.contact,
          phone: cust.phone,
          email: '',
          industry: 'OTHER',
          region: '',
          level: cust.priceLevel === '一级' ? 'A' : cust.priceLevel === '二级' ? 'B' : 'C',
          creditLimit: cust.creditLimit,
          riskLevel: 'LOW',
          owner: 'ERP 同步',
          createdAt: syncedAt
        }));
        await db.customers.bulkAdd(formatted);
      });
      console.log('IndexedDB 客户数据已从 ERP 同步加载初始化！');
    }
  }

  if (orderCount === 0) {
    await db.transaction('rw', db.erp_orders, async () => {
      await db.erp_orders.bulkAdd(MOCK_ERP_ORDERS);
    });
    console.log('IndexedDB ERP 销售订单种子数据已初始化！');
  }

  if (contractCount === 0) {
    await db.transaction('rw', db.contracts, async () => {
      await db.contracts.bulkAdd(MOCK_CONTRACTS);
    });
    console.log('IndexedDB 合同种子数据已初始化！');
  }

  if (visitCount === 0) {
    await db.transaction('rw', db.visits, async () => {
      await db.visits.bulkAdd(MOCK_VISITS);
    });
    console.log('IndexedDB 拜访计划种子数据已初始化！');
  }

  if (targetCount === 0) {
    await db.transaction('rw', db.targets, async () => {
      await db.targets.bulkAdd(MOCK_TARGETS);
    });
    console.log('IndexedDB 业绩目标种子数据已初始化！');
  }
}

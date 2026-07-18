import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { 
  ChevronLeft, 
  AlertTriangle, 
  TrendingUp, 
  ShoppingCart,
  Plus,
  ExternalLink,
  CheckCircle,
  XCircle
} from 'lucide-react';

const INDUSTRY_MAP: Record<string, string> = {
  MANUFACTURING: '制造业',
  RETAIL: '零售与电商',
  HEALTHCARE: '医疗健康',
  FINANCE: '金融与信托',
  IT: '信息技术',
  OTHER: '其他行业'
};

const getStageLabel = (stage: string) => {
  const map: Record<string, string> = {
    INITIAL_CONTACT: '初步接触',
    NEEDS_CONFIRM: '需求确认',
    PROPOSAL: '方案报价',
    NEGOTIATION: '商务谈判',
    CONTRACT: '合同签订',
    WON: '赢单',
    LOST: '输单'
  };
  return map[stage] || stage;
};

const getStageBadgeColor = (stage: string) => {
  const colors: Record<string, string> = {
    INITIAL_CONTACT: 'bg-slate-100 text-slate-650 border-slate-200',
    NEEDS_CONFIRM: 'bg-blue-50 text-blue-650 border-blue-150',
    PROPOSAL: 'bg-amber-50 text-amber-600 border-amber-200',
    NEGOTIATION: 'bg-yellow-50 text-yellow-600 border-yellow-250',
    CONTRACT: 'bg-purple-50 text-purple-650 border-purple-150',
    WON: 'bg-green-50 text-green-700 border-green-200',
    LOST: 'bg-red-50 text-red-650 border-red-150',
  };
  return colors[stage] || 'bg-slate-100 text-slate-600';
};

const getProbabilityStyles = (prob: number) => {
  if (prob >= 70) return 'bg-emerald-50 text-emerald-600 border-emerald-250';
  if (prob >= 40) return 'bg-amber-50 text-amber-600 border-amber-250';
  return 'bg-red-50 text-red-650 border-red-200';
};

const getOrderStatusLabel = (status: string) => {
  switch (status) {
    case 'PENDING_DELIVERY': return '待发货';
    case 'SHIPPED': return '已发货';
    case 'SIGNED': return '已签收';
    default: return status;
  }
};

const getOrderStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING_DELIVERY': return 'bg-orange-50 text-orange-600 border-orange-200';
    case 'SHIPPED': return 'bg-blue-50 text-blue-600 border-blue-200';
    case 'SIGNED': return 'bg-green-50 text-green-700 border-green-200';
    default: return 'bg-slate-50 text-slate-500 border-slate-200';
  }
};

// 格式化金额
const formatCurrency = (val?: number) => {
  if (val === undefined || val === null) return '—';
  return '¥' + val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function CustomerDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. 实时读取该客户、所有商机、订单、跟进及线索用于聚合
  const customer = useLiveQuery(() => db.customers.get(id || '')) || null;
  const opportunities = useLiveQuery(() => db.opportunities.where('customerId').equals(id || '').toArray()) || [];
  const erpOrders = useLiveQuery(() => db.erp_orders.where('customerId').equals(id || '').toArray()) || [];
  const leads = useLiveQuery(() => db.leads.toArray()) || [];
  const leadFollows = useLiveQuery(() => db.follow_up_records.toArray()) || [];
  const oppFollows = useLiveQuery(() => db.opportunity_follow_ups.toArray()) || [];

  if (!customer) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        客户快照资料加载中，或该客户不存在...
      </div>
    );
  }

  // 2. 聚合历史跟进记录算法 (线索跟进 + 商机跟进)
  // 获取该客户匹配的线索 (公司名称相同)
  const matchingLeads = leads.filter(l => l.company === customer.name);
  
  // 提取线索跟进
  const currentLeadFollowRecords = leadFollows
    .filter(f => matchingLeads.some(l => l.id === f.leadId))
    .map(f => {
      const parentLead = matchingLeads.find(l => l.id === f.leadId);
      return {
        id: `LEAD-${f.id || Math.random()}`,
        time: f.time,
        operator: f.operator,
        type: '线索跟进',
        sourceName: parentLead ? `线索 ID: ${parentLead.id}` : '线索转化',
        content: f.content
      };
    });

  // 提取商机跟进
  const currentOppFollowRecords = oppFollows
    .filter(f => opportunities.some(o => o.id === f.oppId))
    .map(f => {
      const parentOpp = opportunities.find(o => o.id === f.oppId);
      return {
        id: `OPP-${f.id || Math.random()}`,
        time: f.time,
        operator: f.operator,
        type: '商机跟进',
        sourceName: parentOpp ? `商机: ${parentOpp.title}` : '商机谈判',
        content: f.content
      };
    });

  // 合并并按时间倒序
  const aggregatedFollows = [...currentLeadFollowRecords, ...currentOppFollowRecords]
    .sort((a, b) => b.time.localeCompare(a.time));

  // 新窗口模拟打开 ERP 发货单
  const handleOpenErpOrder = (orderId: string) => {
    showToast(`正在新窗口中打开 ERP 发货单 [${orderId}] 的履约详情页...`, 'success');
    // 仿真新窗口跳转
    setTimeout(() => {
      window.open(`https://example.com/erp/orders/${orderId}`, '_blank');
    }, 800);
  };

  return (
    <div className="space-y-4 pb-24 animate-fade-in">
      {/* 顶部 Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg bg-white border border-slate-200 animate-slide-in text-xs font-bold text-slate-800">
          {toastMessage.type === 'success' ? <CheckCircle size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-500" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 1. AI 流失预警 Banner (仅在风险级别为 HIGH 时渲染) */}
      {customer.riskLevel === 'HIGH' && (
        <div className="bg-red-50 border border-red-150 rounded-lg p-3.5 flex items-start gap-2.5 animate-slide-in">
          <AlertTriangle className="text-red-650 shrink-0 mt-0.5" size={16} />
          <div className="text-xs text-red-700 leading-relaxed font-bold">
            ⚠️ 警告：该客户存在流失风险（上次跟进已超过 30 天，且近期未产生任何销售订单），建议尽快安排联系跟进并通知 ERP 系统冻结其信用额度！
          </div>
        </div>
      )}

      {/* 顶部面包屑与导航 */}
      <div className="flex items-center gap-3">
        <button 
          type="button" 
          onClick={() => navigate('/customers')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex flex-col">
          <h1 className="text-lg font-black text-slate-800">{customer.name}</h1>
          <p className="text-[10px] text-slate-400">客户编码 (ERP SSOT): {customer.id} · 创建于 {customer.createdAt}</p>
        </div>
      </div>

      {/* 2. 快照卡片 */}
      <div className="forge-card space-y-4">
        <div className="border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold text-slate-850">ERP 客户主数据快照</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {[
            { label: '公司名称', val: customer.name },
            { label: '首要联系人', val: customer.contact },
            { label: '联系电话', val: customer.phone, mono: true },
            { label: '电子邮箱', val: customer.email, mono: true },
            { label: '所属行业', val: INDUSTRY_MAP[customer.industry] || customer.industry },
            { label: '所在地区', val: customer.region },
            { label: '客户等级', val: `${customer.level} 等级` },
            { label: '信用额度 (元)', val: formatCurrency(customer.creditLimit), mono: true },
            { 
              label: 'ERP信用状态', 
              val: customer.riskLevel === 'HIGH' ? '冻结' : '正常', 
              colorClass: customer.riskLevel === 'HIGH' 
                ? 'text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded font-bold w-fit block' 
                : 'text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded font-bold w-fit block' 
            }
          ].map((field, idx) => (
            <div key={idx} className="space-y-1">
              <span className="text-[10px] text-slate-400 block font-semibold">{field.label}</span>
              <span className={field.colorClass || `text-slate-700 font-bold block ${field.mono ? 'font-mono' : ''}`}>{field.val}</span>
            </div>
          ))}
          <div className="col-span-2 md:col-span-4 bg-slate-50 border border-slate-100 p-2.5 rounded text-[10px] text-slate-400 italic">
            💡 本卡片由 ERP 权威管控同步。CRM 不提供任何客户主属性的直接修改和编辑入口。
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* 3. 左侧关联卡片组 (商机 + 订单) */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* 3.1 关联商机卡片 */}
          <div className="forge-card space-y-4">
            <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-slate-800">
                <TrendingUp size={15} className="text-[#1677ff]" />
                <h3 className="text-xs font-bold">关联商机 ({opportunities.length})</h3>
              </div>
              <button 
                type="button" 
                onClick={() => navigate('/opportunities/new', { state: { defaultCustomerId: customer.id } })}
                className="flex items-center gap-1 text-[#1677ff] hover:text-blue-500 text-[10px] font-bold"
              >
                <Plus size={12} />
                <span>新建商机</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="forge-table text-xs">
                <thead>
                  <tr>
                    <th>商机编号</th>
                    <th>商机名称</th>
                    <th>当前阶段</th>
                    <th>预计金额</th>
                    <th>AI 概率</th>
                  </tr>
                </thead>
                <tbody>
                  {opportunities.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-400 italic">
                        暂无关联商机，点击右上角新建商机启动业务推进。
                      </td>
                    </tr>
                  ) : (
                    opportunities.map(opp => (
                      <tr 
                        key={opp.id} 
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => navigate(`/opportunities/${opp.id}`)}
                      >
                        <td className="font-mono font-bold text-[#1677ff]">{opp.id}</td>
                        <td className="font-bold text-slate-850">{opp.title}</td>
                        <td>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStageBadgeColor(opp.status)}`}>
                            {getStageLabel(opp.status)}
                          </span>
                        </td>
                        <td className="font-mono text-slate-700">{formatCurrency(opp.amount)}</td>
                        <td>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${getProbabilityStyles(opp.score)}`}>
                            {opp.score}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3.2 关联订单卡片 */}
          <div className="forge-card space-y-4">
            <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-slate-800">
                <ShoppingCart size={15} className="text-[#1677ff]" />
                <h3 className="text-xs font-bold">关联 ERP 发货订单 ({erpOrders.length})</h3>
              </div>
              <button 
                type="button" 
                onClick={() => showToast('正在请求 ERP 获取全部订单数据...', 'success')}
                className="text-slate-500 hover:text-slate-700 text-[10px] font-bold"
              >
                查看全部
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="forge-table text-xs">
                <thead>
                  <tr>
                    <th>订单编号</th>
                    <th>金额</th>
                    <th>下单日期</th>
                    <th>发货履约状态</th>
                    <th className="text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {erpOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-400 italic">
                        该客户当前无任何销售履约订单。
                      </td>
                    </tr>
                  ) : (
                    erpOrders.map(order => (
                      <tr key={order.id}>
                        <td 
                          className="font-mono font-bold text-[#1677ff] cursor-pointer hover:underline"
                          onClick={() => handleOpenErpOrder(order.id)}
                        >
                          {order.id}
                        </td>
                        <td className="font-mono text-slate-800">{formatCurrency(order.amount)}</td>
                        <td className="font-mono text-slate-500">{order.date}</td>
                        <td>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getOrderStatusColor(order.status)}`}>
                            {getOrderStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="text-right">
                          <button 
                            type="button" 
                            onClick={() => handleOpenErpOrder(order.id)}
                            className="inline-flex items-center gap-1 text-[#1677ff] hover:text-blue-500 text-xs font-bold"
                          >
                            <span>新窗口查看</span>
                            <ExternalLink size={10} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* 4. 右侧聚合跟进记录时间线 */}
        <div className="forge-card flex flex-col space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-850">CRM 聚合跟进时间线</h3>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[480px] pr-1 space-y-4 relative pl-4 border-l border-slate-200">
            {aggregatedFollows.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs italic">
                该客户暂无历史跟进沟通记录。
              </div>
            ) : (
              aggregatedFollows.map((record) => (
                <div key={record.id} className="relative">
                  {/* 时间轴小圆点 */}
                  <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#1677ff] bg-white" />
                  
                  <div className="bg-slate-50 border border-slate-150 rounded-lg p-3 space-y-1">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">{record.operator}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          record.type === '商机跟进' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-blue-50 text-blue-600 border border-blue-150'
                        }`}>
                          {record.type}
                        </span>
                      </div>
                      <span className="font-mono text-[9px]">{record.time.substring(2, 16)}</span>
                    </div>
                    <div className="text-[9px] text-[#1677ff] font-bold truncate">
                      {record.sourceName}
                    </div>
                    <p className="text-xs text-slate-650 leading-relaxed break-all pt-0.5">{record.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 底部固定返回 */}
      <div className="fixed bottom-0 left-0 right-0 z-45 bg-white border-t border-slate-200 py-3.5 px-6 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] flex justify-end gap-2 lg:pl-[220px]">
        <button
          type="button"
          onClick={() => navigate('/customers')}
          className="px-5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-md transition-colors"
        >
          返回列表
        </button>
      </div>
    </div>
  );
}

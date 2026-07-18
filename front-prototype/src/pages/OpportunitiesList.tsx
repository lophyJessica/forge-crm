import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Opportunity } from '../db';
import { 
  Plus, 
  LayoutGrid, 
  List, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  FileText,
  Clock
} from 'lucide-react';

const CURRENT_USER = '张三';

// 七阶段定义
const STAGES = [
  { id: 'INITIAL_CONTACT', label: '初步接触', badgeColor: 'bg-slate-100 text-slate-650 border-slate-200' },
  { id: 'NEEDS_CONFIRM', label: '需求确认', badgeColor: 'bg-blue-50 text-blue-600 border-blue-150' },
  { id: 'PROPOSAL', label: '方案报价', badgeColor: 'bg-amber-50 text-amber-600 border-amber-200' },
  { id: 'NEGOTIATION', label: '商务谈判', badgeColor: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
  { id: 'CONTRACT', label: '合同签订', badgeColor: 'bg-purple-50 text-purple-600 border-purple-150' },
  { id: 'WON', label: '赢单', badgeColor: 'bg-green-50 text-green-700 border-green-200' },
  { id: 'LOST', label: '输单', badgeColor: 'bg-red-50 text-red-600 border-red-150' },
];

const getStageLabel = (stage: string) => {
  const found = STAGES.find(s => s.id === stage);
  return found ? found.label : stage;
};

const getStageBadgeColor = (stage: string) => {
  const found = STAGES.find(s => s.id === stage);
  return found ? found.badgeColor : 'bg-slate-100 text-slate-600';
};

// 获取概率 Tag 样式
const getProbabilityStyles = (prob: number) => {
  if (prob >= 70) return 'bg-emerald-50 text-emerald-600 border-emerald-250';
  if (prob >= 40) return 'bg-amber-50 text-amber-600 border-amber-250';
  return 'bg-red-50 text-red-650 border-red-200';
};

// 格式化 ¥千分位 金额
const formatCurrency = (val?: number) => {
  if (val === undefined || val === null) return '—';
  return '¥' + val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function OpportunitiesList() {
  const navigate = useNavigate();

  // 1. 视图切换与查询参数
  const [viewMode, setViewMode] = useState<'KANBAN' | 'LIST'>('KANBAN');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterOwner, setFilterOwner] = useState('');
  const [listActiveTab, setListActiveTab] = useState<'ALL' | 'ONGOING' | 'WON' | 'LOST'>('ALL');

  // 弹窗控制
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // 输单 Modal 控制
  const [lostModalOppId, setLostModalOppId] = useState<string | null>(null);
  const [lostReason, setLostReason] = useState('');

  // 启动合同流程 Modal 控制 (NEGOTIATION -> CONTRACT 专用)
  const [contractModalOppId, setContractModalOppId] = useState<string | null>(null);
  const [contractNoInput, setContractNoInput] = useState('');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 2. 从数据库实时订阅商机与跟进记录
  const allOpps = useLiveQuery(() => db.opportunities.toArray()) || [];

  // 3. 看板拖放和推进的核心校验函数
  const checkTransitionPreconditions = (opp: Opportunity, targetStage: string): { allowed: boolean; reason?: string } => {
    // 终态不可回退
    if (opp.status === 'WON' || opp.status === 'LOST') {
      return { allowed: false, reason: '终态 (赢单/输单) 商机不可再流转或回退' };
    }

    // 直接拖拽至输单 (LOST) 始终允许 (需要输入输单原因)
    if (targetStage === 'LOST') {
      return { allowed: true };
    }

    // 校验是否为右侧相邻列
    const order = ['INITIAL_CONTACT', 'NEEDS_CONFIRM', 'PROPOSAL', 'NEGOTIATION', 'CONTRACT', 'WON'];
    const currentIdx = order.indexOf(opp.status);
    const targetIdx = order.indexOf(targetStage);

    if (targetIdx !== currentIdx + 1) {
      const nextStageLabel = order[currentIdx + 1] ? getStageLabel(order[currentIdx + 1]) : '';
      return { 
        allowed: false, 
        reason: `推进阻断：阶段必须严格逐级推进，当前仅可推进至「${nextStageLabel}」或直接拖至「输单」` 
      };
    }

    // 针对每个推进步骤校验前置条件
    if (opp.status === 'INITIAL_CONTACT' && targetStage === 'NEEDS_CONFIRM') {
      if (!opp.desc || !opp.desc.trim()) {
        return { allowed: false, reason: '推进失败：请先填写需求描述再进入需求确认阶段' };
      }
    }

    if (opp.status === 'NEEDS_CONFIRM' && targetStage === 'PROPOSAL') {
      if (!opp.items || opp.items.length === 0) {
        return { allowed: false, reason: '推进失败：进入方案报价阶段前，请至少关联一个商品' };
      }
    }

    if (opp.status === 'PROPOSAL' && targetStage === 'NEGOTIATION') {
      if (!opp.amount || opp.amount <= 0) {
        return { allowed: false, reason: '推进失败：请先填写有效的报价（预计金额）再进入商务谈判阶段' };
      }
    }

    if (opp.status === 'NEGOTIATION' && targetStage === 'CONTRACT') {
      // 启动合同流程，需提示录入合同号
      return { allowed: true, reason: 'TRIGGER_CONTRACT_MODAL' };
    }

    if (opp.status === 'CONTRACT' && targetStage === 'WON') {
      if (!opp.contractNo || !opp.contractNo.trim()) {
        return { allowed: false, reason: '推进失败：在赢单前，请先到详情页录入合同编号并完成在线签署' };
      }
    }

    return { allowed: true };
  };

  // 执行具体推进
  const executeTransition = async (oppId: string, targetStage: string, customParams: Partial<Opportunity> = {}) => {
    const opp = await db.opportunities.get(oppId);
    if (!opp) return;

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    
    // 如果是流转至赢单 WON，触发下推 ERP 销售订单草稿规则
    const additionalData: Partial<Opportunity> = { ...customParams };
    if (targetStage === 'WON') {
      // 模拟下推 ERP 销售订单
      console.log(`[ERP Push] 自动向 ERP 下推销售订单草稿: OPP=${opp.id}, 客户=${opp.customerName}, 金额=${opp.amount}`);
      showToast(`商机已赢单！ERP 销售订单草稿已生成并下推`, 'success');
    }

    await db.transaction('rw', db.opportunities, db.opportunity_follow_ups, async () => {
      await db.opportunities.update(oppId, {
        status: targetStage as any,
        updatedAt: nowStr,
        ...additionalData
      });
      // 写入跟进记录
      await db.opportunity_follow_ups.add({
        oppId,
        time: nowStr,
        operator: CURRENT_USER,
        type: targetStage === 'LOST' ? '电话' : '邮件',
        content: targetStage === 'LOST' 
          ? `商机输单变更，输单原因：${additionalData.lostReason}`
          : `商机阶段推进：由「${getStageLabel(opp.status)}」进入「${getStageLabel(targetStage)}」阶段。`
      });
    });

    if (targetStage !== 'WON') {
      showToast(`阶段成功流转至「${getStageLabel(targetStage)}」`);
    }
  };

  // 4. HTML5 看板拖拽事件处理器
  const handleDragStart = (e: React.DragEvent, oppId: string) => {
    e.dataTransfer.setData('text/plain', oppId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // 允许 Drop
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    const oppId = e.dataTransfer.getData('text/plain');
    if (!oppId) return;

    const opp = await db.opportunities.get(oppId);
    if (!opp) return;

    const check = checkTransitionPreconditions(opp, targetStage);
    if (!check.allowed) {
      showToast(check.reason!, 'error');
      return;
    }

    if (check.reason === 'TRIGGER_CONTRACT_MODAL') {
      setContractModalOppId(oppId);
      setContractNoInput(`CT20260718-${Math.floor(Math.random() * 9000 + 1000)}`);
      return;
    }

    if (targetStage === 'LOST') {
      setLostModalOppId(oppId);
      setLostReason('');
      return;
    }

    await executeTransition(oppId, targetStage);
  };

  // 5. 数据过滤与排序
  const filteredOpps = allOpps.filter(opp => {
    // 列表 Tab 过滤
    if (viewMode === 'LIST') {
      if (listActiveTab === 'ONGOING' && ['WON', 'LOST'].includes(opp.status)) return false;
      if (listActiveTab === 'WON' && opp.status !== 'WON') return false;
      if (listActiveTab === 'LOST' && opp.status !== 'LOST') return false;
    }

    // 关键词过滤 (商机名/客户名)
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      const matchTitle = opp.title.toLowerCase().includes(kw);
      const matchCustomer = opp.customerName.toLowerCase().includes(kw);
      const matchId = opp.id.toLowerCase().includes(kw);
      if (!matchTitle && !matchCustomer && !matchId) return false;
    }

    if (filterStage && opp.status !== filterStage) return false;
    if (filterOwner && opp.createdBy !== filterOwner) return false;

    return true;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // 默认创建时间倒序

  // 看板模式按阶段分组
  const getGroupedOpps = (stageId: string) => {
    return filteredOpps.filter(o => o.status === stageId);
  };

  // 输单确认
  const handleLostConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lostModalOppId || !lostReason.trim()) return;
    await executeTransition(lostModalOppId, 'LOST', { lostReason: lostReason.trim() });
    setLostModalOppId(null);
    setLostReason('');
  };

  // 合同启动确认
  const handleContractConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractModalOppId || !contractNoInput.trim()) return;
    await executeTransition(contractModalOppId, 'CONTRACT', { contractNo: contractNoInput.trim() });
    setContractModalOppId(null);
    setContractNoInput('');
  };

  // 行内推进按钮点击
  const handleRowAdvance = async (opp: Opportunity) => {
    const order = ['INITIAL_CONTACT', 'NEEDS_CONFIRM', 'PROPOSAL', 'NEGOTIATION', 'CONTRACT', 'WON'];
    const currentIdx = order.indexOf(opp.status);
    if (currentIdx === -1 || currentIdx >= order.length - 1) return;
    const targetStage = order[currentIdx + 1];

    const check = checkTransitionPreconditions(opp, targetStage);
    if (!check.allowed) {
      showToast(check.reason!, 'error');
      return;
    }

    if (check.reason === 'TRIGGER_CONTRACT_MODAL') {
      setContractModalOppId(opp.id);
      setContractNoInput(`CT20260718-${Math.floor(Math.random() * 9000 + 1000)}`);
      return;
    }

    await executeTransition(opp.id, targetStage);
  };

  return (
    <div className="space-y-4">
      {/* 顶部 Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg bg-white border border-slate-200 animate-slide-in text-xs font-bold text-slate-800">
          {toastMessage.type === 'success' ? <CheckCircle size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-500" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 头部导航及操作 */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black text-slate-800">商机管理</h1>
          <p className="text-xs text-slate-500">跟踪客户的采购意向与成交概率，驱动漏斗漏出并同步生成 ERP 订单。</p>
        </div>
        <div className="flex items-center gap-3">
          {/* 看板 / 列表 切换视图按钮 */}
          <div className="inline-flex rounded-md border border-slate-200 p-0.5 bg-slate-50">
            <button
              type="button"
              onClick={() => setViewMode('KANBAN')}
              className={`p-1.5 rounded-md text-slate-500 transition-colors ${viewMode === 'KANBAN' ? 'bg-white text-[#1677ff] shadow-sm' : 'hover:text-slate-800'}`}
              title="看板视图"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('LIST')}
              className={`p-1.5 rounded-md text-slate-500 transition-colors ${viewMode === 'LIST' ? 'bg-white text-[#1677ff] shadow-sm' : 'hover:text-slate-800'}`}
              title="列表视图"
            >
              <List size={15} />
            </button>
          </div>

          <button 
            type="button"
            onClick={() => navigate('/opportunities/new')}
            className="flex items-center gap-1.5 px-4 h-9 text-xs font-bold text-white bg-[#1677ff] hover:bg-blue-500 active:bg-blue-600 rounded-md transition-colors shadow-sm"
          >
            <Plus size={15} />
            <span>新建商机</span>
          </button>
        </div>
      </div>

      {/* 筛选与搜索区 */}
      <div className="forge-action-bar grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2 relative">
          <input 
            type="text" 
            placeholder="搜索商机名称、客户公司、ID..." 
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full h-9 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
        </div>
        <div>
          <select 
            value={filterStage} 
            onChange={(e) => setFilterStage(e.target.value)}
            className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-600 focus:outline-none focus:border-blue-500"
          >
            <option value="">阶段(全部)</option>
            {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div className="flex justify-between items-center gap-2">
          <select 
            value={filterOwner} 
            onChange={(e) => setFilterOwner(e.target.value)}
            className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-600 focus:outline-none focus:border-blue-500"
          >
            <option value="">创建人(全部)</option>
            <option value="张三">张三</option>
            <option value="李四">李四</option>
          </select>
          <button 
            type="button"
            onClick={() => {
              setSearchKeyword('');
              setFilterStage('');
              setFilterOwner('');
            }}
            className="h-9 px-3 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors shrink-0"
          >
            重置
          </button>
        </div>
      </div>

      {/* 看板视图 */}
      {viewMode === 'KANBAN' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-start overflow-x-auto min-h-[500px] pb-4">
          {STAGES.map(stage => {
            const list = getGroupedOpps(stage.id);
            return (
              <div 
                key={stage.id} 
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
                className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 min-w-[200px] flex flex-col gap-2 min-h-[400px] transition-colors hover:bg-slate-100/50"
              >
                {/* 看板列头 */}
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 text-xs font-bold text-slate-700">
                  <span className="truncate">{stage.label}</span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-200 font-mono text-[10px]">{list.length}</span>
                </div>

                {/* 看板卡片列表 */}
                <div className="flex flex-col gap-2 flex-1">
                  {list.map(opp => (
                    <div
                      key={opp.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, opp.id)}
                      onClick={() => navigate(`/opportunities/${opp.id}`)}
                      className="bg-white border border-slate-150 p-3 rounded-lg shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer space-y-2 group relative"
                    >
                      <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#1677ff] line-clamp-1">{opp.title}</h4>
                      <div className="text-[10px] text-slate-400 font-semibold">{opp.customerName}</div>
                      
                      <div className="flex justify-between items-center pt-1 text-[10px]">
                        <span className="font-mono font-bold text-slate-600">{formatCurrency(opp.amount)}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${getProbabilityStyles(opp.score)}`}>
                          AI {opp.score}%
                        </span>
                      </div>

                      {opp.dealDate && (
                        <div className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
                          <Clock size={10} />
                          <span>预计: {opp.dealDate}</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {list.length === 0 && (
                    <div className="text-center py-10 text-[10px] text-slate-305 italic">
                      拖拽卡片至此
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 列表视图 */}
      {viewMode === 'LIST' && (
        <div className="space-y-3">
          {/* 列表 Tab 栏 */}
          <div className="border-b border-slate-200">
            <div className="flex gap-6">
              {[
                { id: 'ALL', label: '全部' },
                { id: 'ONGOING', label: '进行中' },
                { id: 'WON', label: '赢单' },
                { id: 'LOST', label: '输单' }
              ].map(tab => {
                const active = listActiveTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setListActiveTab(tab.id as any)}
                    className={`pb-2.5 text-xs font-bold transition-all relative ${
                      active ? 'text-[#1677ff]' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {active && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1677ff] rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 表格卡片 */}
          <div className="forge-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="forge-table">
                <thead>
                  <tr>
                    <th>商机编号</th>
                    <th>商机名称</th>
                    <th>客户名称</th>
                    <th>预计金额</th>
                    <th>商机阶段</th>
                    <th>AI成交概率</th>
                    <th>预计成交日期</th>
                    <th>创建时间</th>
                    <th className="text-right font-bold">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOpps.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-400">
                        暂无符合条件的商机数据
                      </td>
                    </tr>
                  ) : (
                    filteredOpps.map(opp => (
                      <tr key={opp.id}>
                        <td className="font-mono font-bold text-[#1677ff] cursor-pointer hover:underline" onClick={() => navigate(`/opportunities/${opp.id}`)}>
                          {opp.id}
                        </td>
                        <td className="font-bold text-slate-800">{opp.title}</td>
                        <td className="font-semibold text-slate-600">{opp.customerName}</td>
                        <td className="font-mono font-bold text-slate-700">{formatCurrency(opp.amount)}</td>
                        <td>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStageBadgeColor(opp.status)}`}>
                            {getStageLabel(opp.status)}
                          </span>
                        </td>
                        <td>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getProbabilityStyles(opp.score)}`}>
                            {opp.score}%
                          </span>
                        </td>
                        <td className="font-mono text-slate-500">{opp.dealDate || '—'}</td>
                        <td className="font-mono text-slate-400 text-[10px]">{opp.createdAt.substring(2, 16)}</td>
                        <td className="text-right space-x-2">
                          {/* 按阶段动态显示行内操作 (不显示 disabled 置灰按钮) */}
                          {['INITIAL_CONTACT', 'NEEDS_CONFIRM', 'PROPOSAL'].includes(opp.status) && (
                            <>
                              <button type="button" onClick={() => navigate(`/opportunities/${opp.id}`)} className="text-slate-500 hover:text-slate-800 text-xs font-semibold">查看</button>
                              <button type="button" onClick={() => navigate(`/opportunities/${opp.id}/edit`)} className="text-[#1677ff] hover:text-blue-500 text-xs font-semibold">编辑</button>
                              <button type="button" onClick={() => handleRowAdvance(opp)} className="text-emerald-600 hover:text-emerald-500 text-xs font-semibold">推进</button>
                              <button type="button" onClick={() => { setLostModalOppId(opp.id); setLostReason(''); }} className="text-red-500 hover:text-red-650 text-xs font-semibold">输单</button>
                            </>
                          )}

                          {opp.status === 'NEGOTIATION' && (
                            <>
                              <button type="button" onClick={() => navigate(`/opportunities/${opp.id}`)} className="text-slate-500 hover:text-slate-800 text-xs font-semibold">查看</button>
                              <button type="button" onClick={() => handleRowAdvance(opp)} className="text-emerald-600 hover:text-emerald-500 text-xs font-semibold">推进</button>
                              <button type="button" onClick={() => { setLostModalOppId(opp.id); setLostReason(''); }} className="text-red-500 hover:text-red-650 text-xs font-semibold">输单</button>
                            </>
                          )}

                          {opp.status === 'CONTRACT' && (
                            <>
                              <button type="button" onClick={() => navigate(`/opportunities/${opp.id}`)} className="text-slate-500 hover:text-slate-800 text-xs font-semibold">查看</button>
                              <button type="button" onClick={() => handleRowAdvance(opp)} className="text-green-600 hover:text-green-550 text-xs font-semibold">赢单</button>
                              <button type="button" onClick={() => { setLostModalOppId(opp.id); setLostReason(''); }} className="text-red-500 hover:text-red-650 text-xs font-semibold">输单</button>
                            </>
                          )}

                          {['WON', 'LOST'].includes(opp.status) && (
                            <button type="button" onClick={() => navigate(`/opportunities/${opp.id}`)} className="text-slate-500 hover:text-slate-800 text-xs font-semibold">查看</button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5.1 输单原因填写 Modal */}
      {lostModalOppId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form onSubmit={handleLostConfirm} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl border border-slate-100 text-xs space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle size={18} />
              <h3 className="text-sm font-bold text-slate-800">确认商机输单</h3>
            </div>
            <p className="text-slate-500">商机流转为 LOST 后将无法回退，请填写丢单/输单原因（必填）：</p>
            <textarea
              required
              rows={3}
              placeholder="请输入输单原因（例如：价格劣势较大、客户需求不满足、竞争对手特批特价等）..."
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button 
                type="button" 
                onClick={() => { setLostModalOppId(null); setLostReason(''); }}
                className="px-3 py-2 font-semibold text-slate-500 hover:bg-slate-50 rounded"
              >
                取消
              </button>
              <button 
                type="submit" 
                disabled={!lostReason.trim()}
                className="px-4 py-2 font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 rounded"
              >
                确认输单
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5.2 启动在线合同 Modal */}
      {contractModalOppId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form onSubmit={handleContractConfirm} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl border border-slate-100 text-xs space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 text-[#1677ff]">
              <FileText size={18} />
              <h3 className="text-sm font-bold text-slate-800">启动在线合同流程</h3>
            </div>
            <p className="text-slate-500">系统将为该商机创建在线签署流程，请录入拟定的合同草案编号（系统已自动预分配）：</p>
            <input
              type="text"
              required
              value={contractNoInput}
              onChange={(e) => setContractNoInput(e.target.value)}
              className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button 
                type="button" 
                onClick={() => { setContractModalOppId(null); setContractNoInput(''); }}
                className="px-3 py-2 font-semibold text-slate-500 hover:bg-slate-50 rounded"
              >
                取消
              </button>
              <button 
                type="submit"
                disabled={!contractNoInput.trim()}
                className="px-4 py-2 font-bold text-white bg-[#1677ff] hover:bg-blue-500 disabled:opacity-40 rounded"
              >
                启动并进入合同阶段
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

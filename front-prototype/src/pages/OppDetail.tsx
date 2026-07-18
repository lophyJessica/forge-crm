import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Opportunity } from '../db';
import { 
  ChevronLeft, 
  Plus, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  TrendingUp,
  ShoppingCart
} from 'lucide-react';

const CURRENT_USER = '张三';

// 七阶段定义
const STAGES = [
  { id: 'INITIAL_CONTACT', label: '初步接触' },
  { id: 'NEEDS_CONFIRM', label: '需求确认' },
  { id: 'PROPOSAL', label: '方案报价' },
  { id: 'NEGOTIATION', label: '商务谈判' },
  { id: 'CONTRACT', label: '合同签订' },
  { id: 'WON', label: '赢单' },
  { id: 'LOST', label: '输单' }
];

const getStageBadgeColor = (stage: string) => {
  const colors: Record<string, string> = {
    INITIAL_CONTACT: 'bg-slate-100 text-slate-650 border-slate-200',
    NEEDS_CONFIRM: 'bg-blue-50 text-blue-600 border-blue-150',
    PROPOSAL: 'bg-amber-50 text-amber-600 border-amber-200',
    NEGOTIATION: 'bg-yellow-50 text-yellow-600 border-yellow-250',
    CONTRACT: 'bg-purple-50 text-purple-650 border-purple-150',
    WON: 'bg-green-50 text-green-700 border-green-200',
    LOST: 'bg-red-50 text-red-600 border-red-150',
  };
  return colors[stage] || 'bg-slate-100 text-slate-600';
};

const getStageLabel = (stage: string) => {
  const found = STAGES.find(s => s.id === stage);
  return found ? found.label : stage;
};

// 格式化金额
const formatCurrency = (val?: number) => {
  if (val === undefined || val === null) return '—';
  return '¥' + val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function OppDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();

  // 1. 数据库实时读取
  const opp = useLiveQuery(() => db.opportunities.get(id || '')) || null;
  const followUps = useLiveQuery(() => 
    db.opportunity_follow_ups.where('oppId').equals(id || '').toArray()
  ) || [];

  // Modals 控制
  const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
  const [isAbandonModalOpen, setIsAbandonModalOpen] = useState(false); // 输单 Modal
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false); // 赢单 Modal
  const [isContractModalOpen, setIsContractModalOpen] = useState(false); // 合同 Modal

  // 输入表单状态
  const [followType, setFollowType] = useState('电话');
  const [followContent, setFollowContent] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [contractNoInput, setContractNoInput] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 响应外部跳转指令 (直接拉起跟进弹窗等)
  useEffect(() => {
    if (location.state && opp) {
      const state = location.state as any;
      if (state.openFollowModal) {
        setIsFollowModalOpen(true);
      }
      if (state.triggerConvert) {
        setIsConvertModalOpen(true);
      }
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate, location.pathname, opp]);

  if (!opp) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        商机数据加载中，或该商机不存在...
      </div>
    );
  }

  // 2. 状态机流转核心校验
  const checkTransition = (targetStage: string): { allowed: boolean; reason?: string } => {
    if (opp.status === 'WON' || opp.status === 'LOST') {
      return { allowed: false, reason: '该商机已结案，无法修改状态' };
    }

    if (targetStage === 'LOST') return { allowed: true };

    const order = ['INITIAL_CONTACT', 'NEEDS_CONFIRM', 'PROPOSAL', 'NEGOTIATION', 'CONTRACT', 'WON'];
    const currentIdx = order.indexOf(opp.status);
    const targetIdx = order.indexOf(targetStage);

    if (targetIdx !== currentIdx + 1) {
      const nextLabel = order[currentIdx + 1] ? getStageLabel(order[currentIdx + 1]) : '';
      return { allowed: false, reason: `阶段必须逐级推进，当前仅可推进到「${nextLabel}」` };
    }

    if (opp.status === 'INITIAL_CONTACT' && targetStage === 'NEEDS_CONFIRM') {
      if (!opp.desc || !opp.desc.trim()) {
        return { allowed: false, reason: '推进失败：请先填写“需求描述”以供后续阶段对齐。' };
      }
    }

    if (opp.status === 'NEEDS_CONFIRM' && targetStage === 'PROPOSAL') {
      if (!opp.items || opp.items.length === 0) {
        return { allowed: false, reason: '推进失败：请在基本信息中“关联至少一个商品”后再进行报价方案设计。' };
      }
    }

    if (opp.status === 'PROPOSAL' && targetStage === 'NEGOTIATION') {
      if (!opp.amount || opp.amount <= 0) {
        return { allowed: false, reason: '推进失败：预计金额（报价金额）必须大于 0 才可以进入谈判环节。' };
      }
    }

    if (opp.status === 'NEGOTIATION' && targetStage === 'CONTRACT') {
      return { allowed: true, reason: 'TRIGGER_CONTRACT_MODAL' };
    }

    if (opp.status === 'CONTRACT' && targetStage === 'WON') {
      if (!opp.contractNo || !opp.contractNo.trim()) {
        return { allowed: false, reason: '推进失败：在赢单成交前，必须录入合同编号并完成是在线签署。' };
      }
    }

    return { allowed: true };
  };

  // 状态推进执行
  const executeTransition = async (targetStage: string, customParams: Partial<Opportunity> = {}) => {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const additionalData = { ...customParams };

    if (targetStage === 'WON') {
      console.log(`[ERP Push] 商机赢单下推 ERP 订单草稿: OPP=${opp.id}`);
      showToast('商机赢单！销售订单草稿已自动生成并下推至 ERP 系统', 'success');
    }

    await db.transaction('rw', db.opportunities, db.opportunity_follow_ups, async () => {
      await db.opportunities.update(opp.id, {
        status: targetStage as any,
        updatedAt: nowStr,
        ...additionalData
      });

      await db.opportunity_follow_ups.add({
        oppId: opp.id,
        time: nowStr,
        operator: CURRENT_USER,
        type: targetStage === 'LOST' ? '电话' : '邮件',
        content: targetStage === 'LOST'
          ? `商机输单结案。输单原因：${additionalData.lostReason}`
          : `商机阶段推进：由「${getStageLabel(opp.status)}」进入「${getStageLabel(targetStage)}」阶段。`
      });
    });

    if (targetStage !== 'WON') {
      showToast(`阶段已推进至「${getStageLabel(targetStage)}」`);
    }
  };

  // 3. 推进按钮触发
  const handleAdvance = () => {
    const order = ['INITIAL_CONTACT', 'NEEDS_CONFIRM', 'PROPOSAL', 'NEGOTIATION', 'CONTRACT', 'WON'];
    const currentIdx = order.indexOf(opp.status);
    if (currentIdx === -1 || currentIdx >= order.length - 1) return;
    
    const targetStage = order[currentIdx + 1];
    const check = checkTransition(targetStage);
    if (!check.allowed) {
      showToast(check.reason!, 'error');
      return;
    }

    if (check.reason === 'TRIGGER_CONTRACT_MODAL') {
      setContractNoInput(`CT20260718-${Math.floor(Math.random() * 9000 + 1000)}`);
      setIsContractModalOpen(true);
      return;
    }

    if (targetStage === 'WON') {
      setIsConvertModalOpen(true);
      return;
    }

    executeTransition(targetStage);
  };

  // 添加跟进记录
  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followContent.trim()) return;

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    await db.transaction('rw', db.opportunities, db.opportunity_follow_ups, async () => {
      await db.opportunity_follow_ups.add({
        oppId: opp.id,
        time: nowStr,
        operator: CURRENT_USER,
        type: followType,
        content: followContent.trim()
      });
      await db.opportunities.update(opp.id, {
        updatedAt: nowStr
      });
    });

    setIsFollowModalOpen(false);
    setFollowContent('');
    showToast('跟进记录添加成功');
  };

  // 输单处理
  const handleLostConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lostReason.trim()) return;
    await executeTransition('LOST', { lostReason: lostReason.trim() });
    setIsAbandonModalOpen(false);
    setLostReason('');
  };

  // 合同录入处理
  const handleContractConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractNoInput.trim()) return;
    await executeTransition('CONTRACT', { contractNo: contractNoInput.trim() });
    setIsContractModalOpen(false);
    setContractNoInput('');
  };

  // 获取阶段完成样式并返回渲染判定
  const getTimelineNodeClass = (stageId: string) => {
    const order = ['INITIAL_CONTACT', 'NEEDS_CONFIRM', 'PROPOSAL', 'NEGOTIATION', 'CONTRACT', 'WON', 'LOST'];
    const currentIdx = order.indexOf(opp.status);
    const nodeIdx = order.indexOf(stageId);

    // 输单 LOST 特殊处理
    if (opp.status === 'LOST') {
      if (stageId === 'LOST') return 'bg-red-500 text-white border-red-500 ring-2 ring-red-200 animate-pulse';
      if (nodeIdx < order.indexOf('CONTRACT') + 1) return 'bg-slate-200 text-slate-500 border-slate-300';
      return 'bg-white text-slate-300 border-slate-200';
    }

    if (stageId === 'LOST') return 'bg-white text-slate-300 border-slate-200';

    if (nodeIdx < currentIdx) {
      return 'bg-[#1677ff] text-white border-[#1677ff]'; // 已完成
    }
    if (nodeIdx === currentIdx) {
      return 'bg-blue-500 text-white border-blue-500 ring-2 ring-blue-100 animate-pulse'; // 当前阶段闪烁
    }
    return 'bg-white text-slate-400 border-slate-200'; // 未完成
  };

  return (
    <div className="space-y-4 pb-24">
      {/* 顶部 Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg bg-white border border-slate-200 animate-slide-in text-xs font-bold text-slate-800">
          {toastMessage.type === 'success' ? <CheckCircle size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-500" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 导航面包屑 */}
      <div className="flex items-center gap-3">
        <button 
          type="button" 
          onClick={() => navigate('/opportunities')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex flex-col">
          <h1 className="text-lg font-black text-slate-800">{opp.title}</h1>
          <p className="text-[10px] text-slate-400">商机编号: {opp.id} · 创建于 {opp.createdAt}</p>
        </div>
      </div>

      {/* 状态区 Banner */}
      <div className="forge-card flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-black border ${getStageBadgeColor(opp.status)}`}>
            {getStageLabel(opp.status)}
          </span>
          <div className="text-xs text-slate-600 flex items-center gap-1.5 font-bold">
            <TrendingUp size={14} className="text-[#1677ff]" />
            <span>AI 成交预测概率：<strong>{opp.score}%</strong></span>
          </div>
        </div>
      </div>

      {/* 3. 阶段时间线 */}
      <div className="forge-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-2 text-xs">
          {STAGES.map((s, idx) => {
            const isLast = idx === STAGES.length - 1;
            const nodeClass = getTimelineNodeClass(s.id);
            return (
              <React.Fragment key={s.id}>
                <div className="flex items-center gap-2 flex-1">
                  <div className={`h-6 w-6 rounded-full border flex items-center justify-center font-bold font-mono text-[10px] shrink-0 ${nodeClass}`}>
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-slate-700 truncate block">{s.label}</span>
                  </div>
                </div>
                {!isLast && (
                  <div className="hidden md:block h-px bg-slate-200 flex-1 mx-2" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* 4. 基本信息卡片 */}
          <div className="forge-card space-y-4">
            <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-850">基本信息</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              {[
                { label: '商机名称', val: opp.title },
                { label: '关联客户', val: opp.customerName },
                { label: '预计金额 (元)', val: formatCurrency(opp.amount), mono: true },
                { label: '预计成交日期', val: opp.dealDate || '—', mono: true }
              ].map((field, idx) => (
                <div key={idx} className="space-y-1">
                  <span className="text-[10px] text-slate-400 block font-semibold">{field.label}</span>
                  <span className={`text-slate-700 font-semibold block ${field.mono ? 'font-mono' : ''}`}>{field.val}</span>
                </div>
              ))}
              
              {/* 合同编号仅在 CONTRACT 和 WON 展示 */}
              {['CONTRACT', 'WON'].includes(opp.status) && (
                <div className="space-y-1">
                  <span className="text-[10px] text-purple-500 block font-bold">合同编号</span>
                  <span className="text-purple-700 font-mono font-bold block">{opp.contractNo || '签署中(无合同号)'}</span>
                </div>
              )}

              <div className="col-span-2 md:col-span-4 space-y-1">
                <span className="text-[10px] text-slate-400 block font-semibold">需求描述</span>
                <p className="text-slate-650 bg-slate-50 border border-slate-100 p-2.5 rounded text-xs leading-relaxed">
                  {opp.desc || '暂无详细描述需求（从“初步接触”推进到“需求确认”时必填）。'}
                </p>
              </div>

              {opp.status === 'LOST' && opp.lostReason && (
                <div className="col-span-2 md:col-span-4 space-y-1 animate-fade-in">
                  <span className="text-[10px] text-red-500 block font-bold">输单/丢单原因</span>
                  <p className="text-red-700 bg-red-50 border border-red-100 p-2.5 rounded text-xs leading-relaxed font-bold">
                    {opp.lostReason}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 5. 商品明细表 (仅在 NEEDS_CONFIRM 及以上阶段展示) */}
          {opp.status !== 'INITIAL_CONTACT' && (
            <div className="forge-card space-y-4 animate-fade-in">
              <div className="border-b border-slate-100 pb-2 flex items-center gap-1.5 text-slate-800">
                <ShoppingCart size={15} className="text-[#1677ff]" />
                <h3 className="text-xs font-bold">关联商品明细</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="forge-table text-xs">
                  <thead>
                    <tr>
                      <th>商品编码</th>
                      <th>商品名称</th>
                      <th>单价</th>
                      <th>数量</th>
                      <th className="text-right">小计</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!opp.items || opp.items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-slate-400 italic">
                          暂未关联商品 (推进到方案报价前请通过编辑补充商品)
                        </td>
                      </tr>
                    ) : (
                      opp.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="font-mono">{item.productCode}</td>
                          <td className="font-semibold">{item.productName}</td>
                          <td className="font-mono text-slate-550">{formatCurrency(item.price)}</td>
                          <td className="font-mono">{item.quantity}</td>
                          <td className="font-mono font-bold text-slate-850 text-right">
                            {formatCurrency(item.price * item.quantity)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 6. 右侧跟进记录时间线 */}
        <div className="forge-card flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-850">推进与跟进历史</h3>
            {!['WON', 'LOST'].includes(opp.status) && (
              <button 
                type="button"
                onClick={() => setIsFollowModalOpen(true)}
                className="flex items-center gap-1 text-blue-500 hover:text-blue-600 text-[10px] font-bold"
              >
                <Plus size={12} />
                <span>添加跟进</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto max-h-[350px] pr-1 space-y-4 relative pl-4 border-l border-slate-200">
            {followUps.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                暂无推进和跟进活动
              </div>
            ) : (
              followUps
                .sort((a, b) => b.time.localeCompare(a.time))
                .map((record) => (
                  <div key={record.id} className="relative">
                    <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#1677ff] bg-white" />
                    <div className="bg-slate-50 border border-slate-150 rounded-lg p-3 space-y-1">
                      <div className="flex justify-between items-center text-xs text-slate-400">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-700">{record.operator}</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 text-[9px] font-semibold">{record.type}</span>
                        </div>
                        <span className="font-mono text-[9px]">{record.time.substring(5, 16)}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed break-all">{record.content}</p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* 固定底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 py-3.5 px-6 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] flex justify-end gap-2 lg:pl-[220px]">
        <button
          type="button"
          onClick={() => navigate('/opportunities')}
          className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-md transition-colors"
        >
          返回列表
        </button>

        {/* 根据阶段展示按钮，不展示 disabled */}
        {['INITIAL_CONTACT', 'NEEDS_CONFIRM'].includes(opp.status) && (
          <>
            <button
              type="button"
              onClick={() => setIsAbandonModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 border border-red-100 rounded-md transition-colors"
            >
              判定输单
            </button>
            <button
              type="button"
              onClick={() => navigate(`/opportunities/${opp.id}/edit`)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
            >
              编辑信息
            </button>
            <button
              type="button"
              onClick={handleAdvance}
              className="px-5 py-2 text-xs font-bold text-white bg-[#1677ff] hover:bg-blue-500 rounded-md transition-colors shadow-sm"
            >
              推进至下一步
            </button>
          </>
        )}

        {opp.status === 'PROPOSAL' && (
          <>
            <button
              type="button"
              onClick={() => setIsAbandonModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 border border-red-100 rounded-md transition-colors"
            >
              报价未通过(输单)
            </button>
            <button
              type="button"
              onClick={handleAdvance}
              className="px-5 py-2 text-xs font-bold text-white bg-[#1677ff] hover:bg-blue-500 rounded-md transition-colors shadow-sm"
            >
              发送报价(商务谈判)
            </button>
          </>
        )}

        {opp.status === 'NEGOTIATION' && (
          <>
            <button
              type="button"
              onClick={() => setIsAbandonModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 border border-red-100 rounded-md transition-colors"
            >
              谈判破裂(输单)
            </button>
            <button
              type="button"
              onClick={handleAdvance}
              className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-550 rounded-md transition-colors shadow-sm"
            >
              推进(启动在线合同)
            </button>
          </>
        )}

        {opp.status === 'CONTRACT' && (
          <>
            <button
              type="button"
              onClick={() => setIsAbandonModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 border border-red-100 rounded-md transition-colors"
            >
              违约/输单
            </button>
            <button
              type="button"
              onClick={handleAdvance}
              className="px-5 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-550 rounded-md transition-colors shadow-sm"
            >
              签署完成(确认赢单)
            </button>
          </>
        )}
      </div>

      {/* 5.1 添加跟进记录 Modal */}
      {isFollowModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form onSubmit={handleAddFollowUp} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl border border-slate-100 text-xs space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-850 flex items-center gap-1">
              <Clock size={16} className="text-[#1677ff]" />
              <span>添加跟进沟通</span>
            </h3>
            
            <div>
              <label htmlFor="followType" className="block text-slate-500 font-bold mb-1">跟进方式 <span className="text-red-500">*</span></label>
              <select
                id="followType"
                value={followType}
                onChange={(e) => setFollowType(e.target.value)}
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded text-slate-700 focus:outline-none focus:border-blue-500"
              >
                <option value="电话">电话</option>
                <option value="拜访">拜访</option>
                <option value="邮件">邮件</option>
              </select>
            </div>

            <div>
              <label htmlFor="followContent" className="block text-slate-500 font-bold mb-1">沟通纪要 <span className="text-red-500">*</span></label>
              <textarea
                id="followContent"
                required
                rows={4}
                placeholder="记录详细的报价谈判情况、技术集成细节..."
                value={followContent}
                onChange={(e) => setFollowContent(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setIsFollowModalOpen(false); setFollowContent(''); }}
                className="px-3 py-2 font-semibold text-slate-500 hover:bg-slate-50 rounded"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!followContent.trim()}
                className="px-4 py-2 font-bold text-white bg-[#1677ff] hover:bg-blue-500 disabled:opacity-40 rounded shadow-sm"
              >
                保存纪要
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5.2 输单原因填写 Modal */}
      {isAbandonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form onSubmit={handleLostConfirm} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl border border-slate-100 text-xs space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-red-500 flex items-center gap-1.5">
              <AlertTriangle size={18} />
              <span>确认商机输单</span>
            </h3>
            <p className="text-slate-500">商机置为输单状态后将无法撤销，请输入丢单/输单的复盘原因（必填）：</p>
            <textarea
              required
              rows={3}
              placeholder="请描述原因（例如：价格被友商击穿30%，无法配给等）..."
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setIsAbandonModalOpen(false); setLostReason(''); }}
                className="px-3 py-2 font-semibold text-slate-500 hover:bg-slate-50 rounded"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!lostReason.trim()}
                className="px-4 py-2 font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 rounded shadow-sm"
              >
                确认输单
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5.3 赢单确认 Modal */}
      {isConvertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl border border-slate-100 text-xs space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-green-600 flex items-center gap-1.5">
              <CheckCircle size={18} />
              <span>商机签约赢单</span>
            </h3>
            <p className="text-slate-500 leading-relaxed">
              确认已签署合同，并对商机 <strong>「{opp.title}」</strong> 执行赢单？系统将自动在 ERP 生成销售订单草稿，数据不可回退。
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConvertModalOpen(false)}
                className="px-3 py-2 font-semibold text-slate-500 hover:bg-slate-50 rounded"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => executeTransition('WON')}
                className="px-4 py-2 font-bold text-white bg-green-600 hover:bg-green-500 rounded shadow-sm"
              >
                确认赢单
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5.4 启动在线合同 Modal */}
      {isContractModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form onSubmit={handleContractConfirm} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl border border-slate-100 text-xs space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-purple-600 flex items-center gap-1.5">
              <FileText size={18} />
              <span>启动在线合同流程</span>
            </h3>
            <p className="text-slate-500">商机推进到合同签订阶段。系统已自动生成预分配合同编号，请确认：</p>
            <input
              type="text"
              required
              value={contractNoInput}
              onChange={(e) => setContractNoInput(e.target.value)}
              className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setIsContractModalOpen(false); setContractNoInput(''); }}
                className="px-3 py-2 font-semibold text-slate-500 hover:bg-slate-50 rounded"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!contractNoInput.trim()}
                className="px-4 py-2 font-bold text-white bg-purple-600 hover:bg-purple-550 disabled:opacity-40 rounded shadow-sm"
              >
                启动流程
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

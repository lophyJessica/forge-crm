import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ChevronLeft, AlertTriangle, CheckCircle, XCircle, FileText, TrendingUp, Users } from 'lucide-react';

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'DRAFT':
      return 'bg-slate-50 text-slate-500 border-slate-200';
    case 'PENDING_SIGN':
      return 'bg-blue-50 text-blue-600 border-blue-150';
    case 'SIGNED':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'ARCHIVED':
      return 'bg-emerald-50 text-emerald-600 border-emerald-250';
    case 'VOIDED':
      return 'bg-red-50 text-red-650 border-red-150';
    default:
      return 'bg-slate-50 text-slate-500 border-slate-200';
  }
};

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    DRAFT: '草稿',
    PENDING_SIGN: '待签署',
    SIGNED: '已签署',
    ARCHIVED: '已归档',
    VOIDED: '已作废'
  };
  return map[status] || status;
};

const formatCurrency = (val?: number) => {
  if (val === undefined || val === null) return '—';
  return '¥' + val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function ContractDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [voidReasonModal, setVoidReasonModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. 实时读取合同详情、对应的商机和客户信息
  const contract = useLiveQuery(() => db.contracts.get(id || '')) || null;
  const opp = useLiveQuery(async () => {
    if (contract?.oppId) return await db.opportunities.get(contract.oppId);
    return null;
  }, [contract?.oppId]) || null;

  if (!contract) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        合同信息加载中，或该合同不存在...
      </div>
    );
  }

  // 2. 交互操作函数
  const handleSubmitSign = async () => {
    await db.contracts.update(contract.id, {
      status: 'PENDING_SIGN',
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
    });
    showToast('合同已提交，已成功通知签约方进行签署！');
  };

  const handleSign = async () => {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const todayYmd = nowStr.slice(0, 10);

    await db.transaction('rw', db.contracts, db.opportunities, db.erp_orders, db.opportunity_follow_ups, async () => {
      // A. 合同状态 -> SIGNED
      await db.contracts.update(contract.id, {
        status: 'SIGNED',
        signedDate: todayYmd,
        updatedAt: nowStr
      });

      // B. 关联商机 -> WON，回写预计金额和合同号
      if (contract.oppId) {
        await db.opportunities.update(contract.oppId, {
          status: 'WON',
          contractNo: contract.id,
          wonAt: nowStr,
          amount: contract.amount, // P1 金额回写
          updatedAt: nowStr
        });

        // 插入商机跟进记录
        await db.opportunity_follow_ups.add({
          oppId: contract.oppId,
          time: nowStr,
          operator: contract.createdBy || '系统',
          type: '系统',
          content: `【合同回写】电子合同 [${contract.id}] 签署通过。商机自动达成 [赢单] 阶段，最终成交金额定格为 ${formatCurrency(contract.amount)}，并下推 ERP 发货单。`
        });

        // C. 下推 ERP
        const orderId = `ORD${todayYmd.replace(/-/g, '')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
        await db.erp_orders.add({
          id: orderId,
          customerId: contract.customerId,
          amount: contract.amount,
          date: todayYmd,
          status: 'PENDING_DELIVERY'
        });
      }
    });

    showToast('合同签署成功！已联动将商机推进至赢单状态并生成 ERP 发货单。');
  };

  const handleArchive = async () => {
    await db.contracts.update(contract.id, {
      status: 'ARCHIVED',
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
    });
    showToast('合同已成功归档。');
  };

  const handleVoid = async () => {
    if (!voidReason.trim()) return;
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

    await db.transaction('rw', db.contracts, db.opportunities, db.opportunity_follow_ups, async () => {
      // A. 合同状态 -> VOIDED
      await db.contracts.update(contract.id, {
        status: 'VOIDED',
        voidReason: voidReason,
        updatedAt: nowStr
      });

      // B. 商机解绑退回
      if (contract.oppId) {
        await db.opportunities.update(contract.oppId, {
          status: 'NEGOTIATION',
          contractNo: undefined,
          updatedAt: nowStr
        });

        await db.opportunity_follow_ups.add({
          oppId: contract.oppId,
          time: nowStr,
          operator: '系统',
          type: '系统',
          content: `【合同作废】关联合同 [${contract.id}] 已被作废（原因：${voidReason}），商机解除绑定并重置退回到 [商务谈判] 阶段，以允许重新签订。`
        });
      }
    });

    setVoidReasonModal(false);
    setVoidReason('');
    showToast('合同已成功作废，关联商机已释放互锁退回谈判阶段。');
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

      {/* 1. 作废状态警示 Banner */}
      {contract.status === 'VOIDED' && (
        <div className="bg-red-50 border border-red-150 rounded-lg p-3.5 flex items-start gap-2.5">
          <AlertTriangle className="text-red-650 shrink-0 mt-0.5" size={16} />
          <div className="text-xs text-red-700 leading-relaxed font-bold">
            ⚠️ 本合同已被作废归档。作废原因：{contract.voidReason || '未指定'}。关联商机已退回至商务谈判阶段并重新开放签署绑定。
          </div>
        </div>
      )}

      {/* 顶部面包屑与导航 */}
      <div className="flex items-center gap-3">
        <button 
          type="button" 
          onClick={() => navigate('/contracts')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex flex-col">
          <h1 className="text-lg font-black text-slate-800">{contract.title}</h1>
          <p className="text-[10px] text-slate-400">合同单号: {contract.id} · 创建于 {contract.createdAt}</p>
        </div>
      </div>

      {/* 2. 状态与核心卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        
        {/* 左侧合同基本信息卡片 */}
        <div className="md:col-span-2 space-y-4">
          
          <div className="forge-card space-y-4">
            <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-slate-800">
                <FileText size={15} className="text-[#1677ff]" />
                <h3 className="text-xs font-bold">合同基础档案</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${getStatusBadgeColor(contract.status)}`}>
                {getStatusLabel(contract.status)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">合同名称</span>
                <span className="text-slate-700 font-bold block">{contract.title}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">合同编号</span>
                <span className="text-slate-700 font-mono font-bold block">{contract.id}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">合同签约金额</span>
                <span className="text-[#1677ff] font-mono font-bold block text-sm">{formatCurrency(contract.amount)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">签署生效日期</span>
                <span className="text-slate-700 font-mono font-bold block">{contract.signedDate || '未完成签署'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">创建人</span>
                <span className="text-slate-600 font-bold block">{contract.createdBy}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">创建时间</span>
                <span className="text-slate-650 font-mono block">{contract.createdAt}</span>
              </div>
            </div>
          </div>

          {/* 联动对象信息卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* 关联商机卡片 */}
            <div className="forge-card space-y-3">
              <div className="flex items-center gap-1.5 text-slate-800 border-b border-slate-100 pb-1.5">
                <TrendingUp size={14} className="text-[#1677ff]" />
                <h4 className="text-xs font-bold">关联 CRM 商机</h4>
              </div>
              {opp ? (
                <div className="text-xs space-y-2">
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold">商机名称</span>
                    <span 
                      className="font-bold text-[#1677ff] cursor-pointer hover:underline"
                      onClick={() => navigate(`/opportunities/${opp.id}`)}
                    >
                      {opp.title}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] text-slate-400 block">商机金额</span>
                      <span className="font-mono font-bold text-slate-650">{formatCurrency(opp.amount)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block">当前状态</span>
                      <span className="font-bold text-slate-600">{opp.status}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 italic">加载商机明细中...</p>
              )}
            </div>

            {/* 关联客户卡片 */}
            <div className="forge-card space-y-3">
              <div className="flex items-center gap-1.5 text-slate-800 border-b border-slate-100 pb-1.5">
                <Users size={14} className="text-[#1677ff]" />
                <h4 className="text-xs font-bold">关联正式客户</h4>
              </div>
              <div className="text-xs space-y-2">
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold">客户公司</span>
                  <span 
                    className="font-bold text-[#1677ff] cursor-pointer hover:underline"
                    onClick={() => navigate(`/customers/${contract.customerId}`)}
                  >
                    {contract.customerName}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block">客户编码</span>
                  <span className="font-mono text-slate-600 font-bold">{contract.customerId}</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* 右侧电子合同演示区 */}
        <div className="forge-card space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-850">在线签署模拟仿真</h3>
          </div>
          <div className="border border-slate-200 rounded p-4 h-64 bg-slate-50 flex flex-col justify-between items-center text-center relative overflow-hidden">
            <div className="absolute top-2.5 right-2.5 select-none font-black text-[32px] text-red-400/10 border-4 border-red-450/15 rounded-full px-3 py-1 rotate-12">
              {contract.status === 'SIGNED' || contract.status === 'ARCHIVED' ? '合同专用章' : ''}
              {contract.status === 'VOIDED' ? '作废注销章' : ''}
            </div>

            <div className="space-y-1">
              <FileText size={48} className="mx-auto text-slate-400" />
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Electronic Contract</p>
            </div>
            
            <div className="space-y-1 text-xs">
              <p className="font-bold text-slate-700">签署各方主体</p>
              <p className="text-[10px] text-slate-500">甲方：{contract.customerName}</p>
              <p className="text-[10px] text-slate-500">乙方：强盛科技(系统演示方)</p>
            </div>

            <div className="text-[10px] text-slate-450">
              {contract.status === 'DRAFT' && '📝 合同草稿，请提交以通知各方在线签署'}
              {contract.status === 'PENDING_SIGN' && '⏳ 签约方认证已通过，等待签署盖章'}
              {(contract.status === 'SIGNED' || contract.status === 'ARCHIVED') && `✅ 双方已于 ${contract.signedDate} 在线签署生效`}
              {contract.status === 'VOIDED' && '❌ 该合同已作废归档，法律效力已解除'}
            </div>
          </div>
        </div>

      </div>

      {/* 底部固定操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-45 bg-white border-t border-slate-200 py-3.5 px-6 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] flex justify-end gap-2 lg:pl-[220px]">
        <button
          type="button"
          onClick={() => navigate('/contracts')}
          className="px-5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-md transition-colors"
        >
          返回列表
        </button>

        {contract.status === 'DRAFT' && (
          <>
            <button
              type="button"
              onClick={() => navigate(`/contracts/${contract.id}/edit`)}
              className="px-5 py-2 text-xs font-semibold text-slate-650 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors"
            >
              编辑合同
            </button>
            <button
              type="button"
              onClick={handleSubmitSign}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-650 hover:bg-indigo-600 rounded-md transition-colors shadow-sm"
            >
              提交签署
            </button>
            <button
              type="button"
              onClick={() => setVoidReasonModal(true)}
              className="px-5 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-650 rounded-md transition-colors"
            >
              作废合同
            </button>
          </>
        )}

        {contract.status === 'PENDING_SIGN' && (
          <>
            <button
              type="button"
              onClick={handleSign}
              className="px-5 py-2 text-xs font-bold text-white bg-[#1677ff] hover:bg-blue-500 rounded-md transition-colors shadow-sm"
            >
              确认在线签署
            </button>
            <button
              type="button"
              onClick={() => setVoidReasonModal(true)}
              className="px-5 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-650 rounded-md transition-colors"
            >
              作废合同
            </button>
          </>
        )}

        {contract.status === 'SIGNED' && (
          <button
            type="button"
            onClick={handleArchive}
            className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition-colors shadow-sm"
          >
            归档封存
          </button>
        )}
      </div>

      {/* 作废原因确认 Modal */}
      {voidReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle size={18} />
              <h3 className="text-sm font-bold text-slate-800">作废合同确认</h3>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-bold block">请填写作废原因 (必填)</label>
              <textarea
                rows={3}
                placeholder="请输入详细的合同作废原因，此操作将解除商机强绑定并回退商机到商务谈判阶段..."
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full p-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <button 
                type="button" 
                onClick={() => {
                  setVoidReasonModal(false);
                  setVoidReason('');
                }}
                className="px-3 py-2 font-semibold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded"
              >
                取消
              </button>
              <button 
                type="button" 
                disabled={!voidReason.trim()}
                onClick={handleVoid}
                className="px-3 py-2 font-bold text-white bg-red-500 hover:bg-red-650 disabled:opacity-40 rounded"
              >
                确认作废
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

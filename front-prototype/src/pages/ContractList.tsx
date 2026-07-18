import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Search, Plus, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

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

const formatCurrency = (val: number) => {
  return '¥' + val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function ContractList() {
  const navigate = useNavigate();

  // 1. 查询条件与过滤状态
  const [activeTab, setActiveTab] = useState<'ALL' | 'DRAFT' | 'PENDING' | 'SIGNED'>('ALL');
  const [keyword, setKeyword] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // 作废弹窗状态
  const [voidContractId, setVoidContractId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 2. 实时从数据库加载合同
  const contracts = useLiveQuery(() => db.contracts.toArray()) || [];

  // 3. 联动重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, keyword]);

  // 4. 内存过滤与排序
  const filteredContracts = contracts.filter(ct => {
    // Tab 过滤
    if (activeTab === 'DRAFT' && ct.status !== 'DRAFT') return false;
    if (activeTab === 'PENDING' && ct.status !== 'PENDING_SIGN') return false;
    if (activeTab === 'SIGNED' && ct.status !== 'SIGNED' && ct.status !== 'ARCHIVED') return false;

    // 关键词过滤
    if (keyword.trim()) {
      const kw = keyword.toLowerCase();
      const matchId = ct.id.toLowerCase().includes(kw);
      const matchTitle = ct.title.toLowerCase().includes(kw);
      const matchCustomer = ct.customerName.toLowerCase().includes(kw);
      const matchOpp = ct.oppTitle?.toLowerCase().includes(kw);
      if (!matchId && !matchTitle && !matchCustomer && !matchOpp) return false;
    }

    return true;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // 按创建时间倒序

  const totalCount = filteredContracts.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const pagedContracts = filteredContracts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 5. 核心行内操作
  // 5.1 提交签署
  const handleSubmitSign = async (id: string) => {
    await db.contracts.update(id, {
      status: 'PENDING_SIGN',
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
    });
    showToast('合同已提交签署，已成功通知签约各方！');
  };

  // 5.2 签署合同 (自动联动商机赢单并下推订单)
  const handleSign = async (id: string) => {
    const contract = await db.contracts.get(id);
    if (!contract) return;

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const todayYmd = nowStr.slice(0, 10);

    await db.transaction('rw', db.contracts, db.opportunities, db.erp_orders, db.opportunity_follow_ups, async () => {
      // A. 合同状态 -> SIGNED，回写签署日期
      await db.contracts.update(id, {
        status: 'SIGNED',
        signedDate: todayYmd,
        updatedAt: nowStr
      });

      // B. 关联商机 -> WON，回写合同编号和赢单时间，回写预计金额
      if (contract.oppId) {
        await db.opportunities.update(contract.oppId, {
          status: 'WON',
          contractNo: contract.id,
          wonAt: nowStr,
          amount: contract.amount, // 金额回写 (P1-1 规则)
          updatedAt: nowStr
        });

        // 插入商机跟进记录
        await db.opportunity_follow_ups.add({
          oppId: contract.oppId,
          time: nowStr,
          operator: contract.createdBy || '系统',
          type: '系统',
          content: `【合同回写】关联电子签署合同 [${contract.id}] 已签署通过。商机自动推进至 [赢单] 阶段，最终成交金额定格为 ${formatCurrency(contract.amount)}，并下推 ERP 销售订单。`
        });

        // C. 下推 ERP 销售订单
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

    showToast('合同签署成功！已联动触发商机赢单并同步下推 ERP 生成销售发货单。');
  };

  // 5.3 归档合同
  const handleArchive = async (id: string) => {
    await db.contracts.update(id, {
      status: 'ARCHIVED',
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
    });
    showToast('合同已成功归档并归档封存。');
  };

  // 5.4 作废合同 (联动商机回退至 NEGOTIATION 并解绑 1:1)
  const handleVoid = async () => {
    if (!voidContractId || !voidReason.trim()) return;
    const contract = await db.contracts.get(voidContractId);
    if (!contract) return;

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

    await db.transaction('rw', db.contracts, db.opportunities, db.opportunity_follow_ups, async () => {
      // A. 合同状态 -> VOIDED
      await db.contracts.update(voidContractId, {
        status: 'VOIDED',
        voidReason: voidReason,
        updatedAt: nowStr
      });

      // B. 关联商机 -> 解除绑定，商机状态退回 NEGOTIATION
      if (contract.oppId) {
        await db.opportunities.update(contract.oppId, {
          status: 'NEGOTIATION',
          contractNo: undefined, // 解除绑定
          updatedAt: nowStr
        });

        // 插入商机跟进记录说明退回原因
        await db.opportunity_follow_ups.add({
          oppId: contract.oppId,
          time: nowStr,
          operator: '系统',
          type: '系统',
          content: `【合同作废】关联合同 [${contract.id}] 已被作废（作废原因：${voidReason}），解除 1:1 互锁，商机重置回退至 [商务谈判] 阶段，允许重新发起合同签订。`
        });
      }
    });

    setVoidContractId(null);
    setVoidReason('');
    showToast('合同已作废，关联商机已自动退回至商务谈判阶段并解除互锁。');
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

      {/* 头部标题区 */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black text-slate-800">合同管理</h1>
          <p className="text-xs text-slate-500">管理商机成交归结的电子签署文件，签署完成自动触发商机赢单并下推 ERP，作废可解锁商机退回谈判。</p>
        </div>
        <button 
          type="button" 
          onClick={() => navigate('/contracts/new')}
          className="flex items-center gap-1 px-4 h-9 text-xs font-bold text-white bg-[#1677ff] hover:bg-blue-500 rounded-md transition-colors shadow-sm"
        >
          <Plus size={14} />
          <span>新建合同</span>
        </button>
      </div>

      {/* 6个Tab（这里融合为 4 个业务核心 Tab） */}
      <div className="forge-tabs">
        {[
          { key: 'ALL', label: '全部合同', count: contracts.length },
          { key: 'DRAFT', label: '草稿', count: contracts.filter(c => c.status === 'DRAFT').length },
          { key: 'PENDING', label: '待签署', count: contracts.filter(c => c.status === 'PENDING_SIGN').length },
          { key: 'SIGNED', label: '已签署/归档', count: contracts.filter(c => ['SIGNED', 'ARCHIVED'].includes(c.status)).length }
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            className={`forge-tab-item text-xs font-bold px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab.key 
                ? 'border-[#1677ff] text-[#1677ff]' 
                : 'border-transparent text-slate-400 hover:text-slate-650'
            }`}
          >
            <span>{tab.label}</span>
            <span className="ml-1.5 px-1.5 py-0.2 text-[10px] rounded-full bg-slate-100 text-slate-500">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* 筛选过滤区 */}
      <div className="forge-action-bar flex gap-3 items-center">
        <div className="relative flex-1">
          <input 
            type="text" 
            placeholder="搜索合同名称、编号、关联客户、关联商机..." 
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full h-9 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:border-blue-500"
          />
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
        </div>
        <button 
          type="button"
          onClick={() => setKeyword('')}
          className="h-9 px-3 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors"
        >
          重置
        </button>
      </div>

      {/* 合同表格 */}
      <div className="forge-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="forge-table text-xs">
            <thead>
              <tr>
                <th className="w-[160px]">合同编号</th>
                <th className="w-[200px]">合同名称</th>
                <th className="w-[160px]">关联客户</th>
                <th className="w-[120px]">合同金额</th>
                <th className="w-[100px]">合同状态</th>
                <th className="w-[140px]">签署日期</th>
                <th className="text-right w-[200px]">操作</th>
              </tr>
            </thead>
            <tbody>
              {totalCount === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    未检索到符合条件的合同记录
                  </td>
                </tr>
              ) : (
                pagedContracts.map(ct => (
                  <tr key={ct.id}>
                    <td 
                      className="font-mono font-bold text-[#1677ff] cursor-pointer hover:underline"
                      onClick={() => navigate(`/contracts/${ct.id}`)}
                    >
                      {ct.id}
                    </td>
                    <td className="font-bold text-slate-850">{ct.title}</td>
                    <td className="font-medium text-slate-600">{ct.customerName}</td>
                    <td className="font-mono font-bold text-slate-700">{formatCurrency(ct.amount)}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadgeColor(ct.status)}`}>
                        {getStatusLabel(ct.status)}
                      </span>
                    </td>
                    <td className="font-mono text-slate-500">{ct.signedDate || '—'}</td>
                    <td className="text-right space-x-3">
                      <button 
                        type="button" 
                        onClick={() => navigate(`/contracts/${ct.id}`)}
                        className="text-slate-500 hover:text-slate-700 font-bold"
                      >
                        查看
                      </button>

                      {ct.status === 'DRAFT' && (
                        <>
                          <button 
                            type="button" 
                            onClick={() => navigate(`/contracts/${ct.id}/edit`)}
                            className="text-[#1677ff] hover:text-blue-500 font-bold"
                          >
                            编辑
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleSubmitSign(ct.id)}
                            className="text-indigo-600 hover:text-indigo-500 font-bold"
                          >
                            提交签署
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setVoidContractId(ct.id)}
                            className="text-red-650 hover:text-red-500 font-bold"
                          >
                            作废
                          </button>
                        </>
                      )}

                      {ct.status === 'PENDING_SIGN' && (
                        <>
                          <button 
                            type="button" 
                            onClick={() => handleSign(ct.id)}
                            className="text-green-700 hover:text-green-600 font-bold"
                          >
                            签署完成
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setVoidContractId(ct.id)}
                            className="text-red-650 hover:text-red-500 font-bold"
                          >
                            作废
                          </button>
                        </>
                      )}

                      {ct.status === 'SIGNED' && (
                        <button 
                          type="button" 
                          onClick={() => handleArchive(ct.id)}
                          className="text-emerald-600 hover:text-emerald-500 font-bold"
                        >
                          合同归档
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="flex justify-between items-center px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>共 {totalCount} 条记录</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setCurrentPage(1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="h-7 px-2 text-xs bg-white border border-slate-200 rounded text-slate-650 focus:outline-none"
            >
              <option value={20}>20 条/页</option>
              <option value={50}>50 条/页</option>
              <option value={100}>100 条/页</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={() => {
                if (currentPage > 1) {
                  setCurrentPage(prev => prev - 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="px-2 py-1 rounded bg-white border border-slate-200 disabled:opacity-40" 
              disabled={currentPage === 1}
            >
              上一页
            </button>
            <span className="font-mono">{currentPage} / {totalPages}</span>
            <button 
              type="button" 
              onClick={() => {
                if (currentPage < totalPages) {
                  setCurrentPage(prev => prev + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="px-2 py-1 rounded bg-white border border-slate-200 disabled:opacity-40" 
              disabled={currentPage === totalPages}
            >
              下一页
            </button>
          </div>
        </div>
      </div>

      {/* 作废原因确认 Modal */}
      {voidContractId && (
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
                  setVoidContractId(null);
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

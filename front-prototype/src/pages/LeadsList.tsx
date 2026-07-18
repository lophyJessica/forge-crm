import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Lead } from '../db';
import { 
  Plus, 
  Search, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

const CURRENT_USER = '张三'; // 模拟当前登录的销售

// 获取状态 Tag 样式（07产品设计通用规范.md 亮色淡色方案）
const getStatusStyles = (status: string) => {
  switch (status) {
    case 'DRAFT':
      return 'text-slate-500 bg-slate-100 border-slate-200';
    case 'PENDING_ASSIGN':
      return 'text-blue-600 bg-blue-50 border-blue-100';
    case 'ASSIGNED':
      return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'FOLLOWING':
      return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    case 'CONVERTED':
      return 'text-green-700 bg-green-50 border-green-200';
    case 'ABANDONED':
      return 'text-red-600 bg-red-50 border-red-100';
    default:
      return 'text-slate-500 bg-slate-100 border-slate-200';
  }
};

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    DRAFT: '草稿',
    PENDING_ASSIGN: '待分配',
    ASSIGNED: '已分配',
    FOLLOWING: '跟进中',
    CONVERTED: '已转客户',
    ABANDONED: '已作废'
  };
  return map[status] || status;
};

// 获取 AI 评分配色
const getScoreStyles = (score: number) => {
  if (score >= 80) return 'bg-emerald-50 text-emerald-600 border-emerald-200';
  if (score >= 50) return 'bg-amber-50 text-amber-600 border-amber-200';
  return 'bg-red-50 text-red-600 border-red-200';
};

export default function LeadsList() {
  const navigate = useNavigate();

  // 1. 查询条件与过滤状态
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'MY' | 'HIGHSEAS' | 'CONVERTED' | 'ABANDONED'>('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('');
  const [filterMinScore, setFilterMinScore] = useState('');
  const [filterMaxScore, setFilterMaxScore] = useState('');
  const [filterOwner, setFilterOwner] = useState('');

  // 分页状态
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  // 筛选项改变时自动重设当前页为 1
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchKeyword, filterSource, filterIndustry, filterMinScore, filterMaxScore, filterOwner]);
  
  // 勾选与弹窗状态
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // 弹窗确认状态
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmAbandonId, setConfirmAbandonId] = useState<string | null>(null);
  const [abandonReason, setAbandonReason] = useState('');
  const [batchActionType, setBatchActionType] = useState<'VOID' | null>(null); // 批量作废确认

  // 快捷显示 Toast
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 2. 从数据库中实时订阅所有线索与跟进
  const allLeads = useLiveQuery(() => db.leads.toArray()) || [];

  // 判断是否已过公海保护期 (放弃已超7天)
  const isHighseasAbandoned = (lead: Lead) => {
    if (lead.status !== 'ABANDONED' || !lead.followedAt) return false;
    const abandonedTime = new Date(lead.followedAt).getTime();
    const now = new Date().getTime();
    const days = (now - abandonedTime) / (1000 * 60 * 60 * 24);
    return days > 7;
  };

  // 3. 计算各个 Tab 的统计计数
  const counts = {
    ALL: allLeads.length,
    PENDING: allLeads.filter(l => l.status === 'PENDING_ASSIGN').length,
    MY: allLeads.filter(l => l.owner === CURRENT_USER && ['DRAFT', 'ASSIGNED', 'FOLLOWING'].includes(l.status)).length,
    HIGHSEAS: allLeads.filter(l => l.status === 'PENDING_ASSIGN' || isHighseasAbandoned(l)).length,
    CONVERTED: allLeads.filter(l => l.status === 'CONVERTED').length,
    ABANDONED: allLeads.filter(l => l.status === 'ABANDONED').length,
  };

  // 4. 按 Tab 逻辑和筛选框过滤线索
  const filteredLeads = allLeads.filter(lead => {
    // A. Tab 状态过滤
    if (activeTab === 'PENDING' && lead.status !== 'PENDING_ASSIGN') return false;
    if (activeTab === 'MY' && !(lead.owner === CURRENT_USER && ['DRAFT', 'ASSIGNED', 'FOLLOWING'].includes(lead.status))) return false;
    if (activeTab === 'HIGHSEAS' && !(lead.status === 'PENDING_ASSIGN' || isHighseasAbandoned(lead))) return false;
    if (activeTab === 'CONVERTED' && lead.status !== 'CONVERTED') return false;
    if (activeTab === 'ABANDONED' && lead.status !== 'ABANDONED') return false;

    // B. 查询条件过滤
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      const matchId = lead.id.toLowerCase().includes(kw);
      const matchCompany = lead.company.toLowerCase().includes(kw);
      const matchContact = lead.contact?.toLowerCase().includes(kw);
      const matchPhone = lead.phone?.includes(kw);
      if (!matchId && !matchCompany && !matchContact && !matchPhone) return false;
    }

    if (filterSource && lead.source !== filterSource) return false;
    if (filterIndustry && lead.industry !== filterIndustry) return false;
    if (filterOwner && lead.owner !== filterOwner) return false;

    if (filterMinScore && lead.score < parseInt(filterMinScore)) return false;
    if (filterMaxScore && lead.score > parseInt(filterMaxScore)) return false;

    return true;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // 创建时间倒序

  // 分页计算
  const totalCount = filteredLeads.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const pagedLeads = filteredLeads.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 5. 核心交互函数
  // 认领线索
  const handleClaim = async (id: string) => {
    await db.leads.update(id, {
      status: 'ASSIGNED',
      owner: CURRENT_USER,
      assignedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
    });
    showToast('线索已认领，请及时跟进');
  };

  // 确认删除草稿
  const handleDeleteDraft = async () => {
    if (!confirmDeleteId) return;
    await db.transaction('rw', db.leads, db.follow_up_records, async () => {
      await db.leads.delete(confirmDeleteId);
      await db.follow_up_records.where('leadId').equals(confirmDeleteId).delete();
    });
    setConfirmDeleteId(null);
    showToast('草稿线索已成功删除');
  };

  // 确认放弃线索
  const handleAbandon = async () => {
    if (!confirmAbandonId || !abandonReason.trim()) return;
    await db.leads.update(confirmAbandonId, {
      status: 'ABANDONED',
      abandonedReason: abandonReason,
      followedAt: new Date().toISOString().replace('T', ' ').slice(0, 19) // 用作作废日期判定公海保护
    });
    // 添加放弃的一条跟进日志记录
    await db.follow_up_records.add({
      leadId: confirmAbandonId,
      time: new Date().toISOString().replace('T', ' ').slice(0, 19),
      operator: CURRENT_USER,
      type: '电话',
      content: `销售放弃了线索，放弃原因：${abandonReason}`
    });
    setConfirmAbandonId(null);
    setAbandonReason('');
    showToast('线索已退回公海');
  };

  // 批量作废
  const handleBatchVoid = async () => {
    if (selectedLeadIds.length === 0) return;
    await db.transaction('rw', db.leads, async () => {
      for (const id of selectedLeadIds) {
        await db.leads.update(id, {
          status: 'ABANDONED',
          abandonedReason: '管理员批量作废'
        });
      }
    });
    setSelectedLeadIds([]);
    setBatchActionType(null);
    showToast('已成功批量作废选中线索');
  };

  // 勾选切换
  const handleToggleSelect = (id: string) => {
    setSelectedLeadIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    } else {
      setSelectedLeadIds([]);
    }
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

      {/* 头部导航与操作 */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black text-slate-800">线索管理</h1>
          <p className="text-xs text-slate-500">处理全渠道收集的线索并评估 AI 分数，推动转化为商机或客户。</p>
        </div>
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={() => navigate('/leads/new')}
            className="flex items-center gap-1.5 px-4 h-9 text-xs font-bold text-white bg-[#1677ff] hover:bg-blue-500 active:bg-blue-600 rounded-md transition-colors shadow-sm"
          >
            <Plus size={15} />
            <span>新建线索</span>
          </button>
        </div>
      </div>

      {/* 6 状态 Tab 栏 */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          {[
            { id: 'ALL', label: '全部' },
            { id: 'PENDING', label: '待分配' },
            { id: 'MY', label: '我的线索' },
            { id: 'HIGHSEAS', label: '公海' },
            { id: 'CONVERTED', label: '已转客户' },
            { id: 'ABANDONED', label: '已作废' }
          ].map(tab => {
            const active = activeTab === tab.id;
            const count = counts[tab.id as keyof typeof counts] || 0;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSelectedLeadIds([]);
                }}
                className={`pb-3 text-xs font-bold transition-all relative ${
                  active ? 'text-[#1677ff]' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 text-[10px] font-mono">
                  {count > 99 ? '99+' : count}
                </span>
                {active && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1677ff] rounded-full animate-fade-in" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 筛选与查询区 */}
      <div className="forge-action-bar grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="md:col-span-2 relative">
          <input 
            type="text" 
            placeholder="搜索线索编号、公司、联系人、手机号..." 
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full h-9 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
        </div>
        <div>
          <select 
            value={filterSource} 
            onChange={(e) => setFilterSource(e.target.value)}
            className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-600 focus:outline-none focus:border-blue-500"
          >
            <option value="">线索来源(全部)</option>
            <option value="ONLINE">官网</option>
            <option value="ACTIVITY">线下活动</option>
            <option value="EXHIBITION">展会</option>
            <option value="REFERRAL">转介绍</option>
            <option value="IMPORT">批量导入</option>
            <option value="OTHER">其他</option>
          </select>
        </div>
        <div>
          <select 
            value={filterIndustry} 
            onChange={(e) => setFilterIndustry(e.target.value)}
            className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-600 focus:outline-none focus:border-blue-500"
          >
            <option value="">所属行业(全部)</option>
            <option value="MANUFACTURING">制造业</option>
            <option value="RETAIL">零售</option>
            <option value="HEALTHCARE">医疗</option>
            <option value="FINANCE">金融</option>
            <option value="IT">信息技术</option>
            <option value="OTHER">其他</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <input 
            type="number" 
            placeholder="最小评分" 
            value={filterMinScore}
            onChange={(e) => setFilterMinScore(e.target.value)}
            className="w-full h-9 px-2 text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
          <span className="text-slate-400">-</span>
          <input 
            type="number" 
            placeholder="最大评分" 
            value={filterMaxScore}
            onChange={(e) => setFilterMaxScore(e.target.value)}
            className="w-full h-9 px-2 text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex justify-between items-center gap-2">
          <select 
            value={filterOwner} 
            onChange={(e) => setFilterOwner(e.target.value)}
            className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-600 focus:outline-none focus:border-blue-500"
          >
            <option value="">负责人(全部)</option>
            <option value="张三">张三 (当前用户)</option>
            <option value="李四">李四</option>
          </select>
          <button 
            type="button"
            onClick={() => {
              setSearchKeyword('');
              setFilterSource('');
              setFilterIndustry('');
              setFilterMinScore('');
              setFilterMaxScore('');
              setFilterOwner('');
              setSelectedLeadIds([]);
            }}
            className="h-9 px-3 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors shrink-0"
          >
            重置
          </button>
        </div>
      </div>

      {/* 批量操作工具条 */}
      {selectedLeadIds.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg animate-fade-in text-xs">
          <span className="font-bold text-blue-700">已选择 {selectedLeadIds.length} 项</span>
          <button 
            type="button" 
            onClick={() => setBatchActionType('VOID')}
            className="px-3 py-1 font-bold text-white bg-red-500 hover:bg-red-600 rounded"
          >
            批量作废
          </button>
          <button 
            type="button"
            onClick={() => setSelectedLeadIds([])}
            className="text-slate-500 hover:text-slate-800"
          >
            取消选择
          </button>
        </div>
      )}

      {/* 数据表格卡片 */}
      <div className="forge-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="forge-table">
            <thead>
              <tr>
                <th className="w-12 text-center">
                  <input 
                    type="checkbox" 
                    checked={pagedLeads.length > 0 && selectedLeadIds.length === pagedLeads.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th>线索单号</th>
                <th>公司名称</th>
                <th>联系人</th>
                <th>手机号</th>
                <th>邮箱</th>
                <th>线索来源</th>
                <th>AI评分</th>
                <th>状态</th>
                <th>负责人</th>
                <th>最近跟进</th>
                <th>创建时间</th>
                <th className="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {totalCount === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-10 text-slate-400">
                    暂无符合条件的线索数据
                  </td>
                </tr>
              ) : (
                pagedLeads.map((lead) => (
                  <tr key={lead.id} className={selectedLeadIds.includes(lead.id) ? 'bg-blue-50/20' : ''}>
                    <td className="text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedLeadIds.includes(lead.id)}
                        onChange={() => handleToggleSelect(lead.id)}
                      />
                    </td>
                    <td className="font-mono font-bold text-[#1677ff] cursor-pointer hover:underline" onClick={() => navigate(`/leads/${lead.id}`)}>
                      {lead.id}
                    </td>
                    <td className="font-semibold text-slate-800">{lead.company}</td>
                    <td>{lead.contact || '—'}</td>
                    <td className="font-mono">{lead.phone || '—'}</td>
                    <td className="font-mono">{lead.email || '—'}</td>
                    <td>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
                        {lead.source === 'ONLINE' ? '官网' : 
                         lead.source === 'ACTIVITY' ? '线下活动' : 
                         lead.source === 'EXHIBITION' ? '展会' : 
                         lead.source === 'REFERRAL' ? '转介绍' : 
                         lead.source === 'IMPORT' ? '批量导入' : '其他'}
                      </span>
                    </td>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getScoreStyles(lead.score)}`}>
                        {lead.score}分
                      </span>
                    </td>
                    <td>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusStyles(lead.status)}`}>
                        {getStatusLabel(lead.status)}
                      </span>
                    </td>
                    <td>{lead.owner || <span className="text-slate-400">—</span>}</td>
                    <td className="text-slate-500 font-mono">{lead.followedAt?.substring(2, 16) || '—'}</td>
                    <td className="text-slate-500 font-mono">{lead.createdAt.substring(2, 16)}</td>
                    <td className="text-right space-x-2">
                      {/* 按状态动态展示操作 (不渲染灰色 disabled 按钮) */}
                      {lead.status === 'DRAFT' && (
                        <>
                          <button type="button" onClick={() => navigate(`/leads/${lead.id}`)} className="text-slate-500 hover:text-slate-800 text-xs font-semibold">查看</button>
                          <button type="button" onClick={() => navigate(`/leads/${lead.id}/edit`)} className="text-[#1677ff] hover:text-blue-500 text-xs font-semibold">编辑</button>
                          <button type="button" onClick={() => setConfirmDeleteId(lead.id)} className="text-red-500 hover:text-red-600 text-xs font-semibold">删除</button>
                        </>
                      )}
                      
                      {(lead.status === 'PENDING_ASSIGN' || (lead.status === 'ABANDONED' && isHighseasAbandoned(lead))) && (
                        <>
                          <button type="button" onClick={() => navigate(`/leads/${lead.id}`)} className="text-slate-500 hover:text-slate-800 text-xs font-semibold">查看</button>
                          <button type="button" onClick={() => handleClaim(lead.id)} className="text-[#1677ff] hover:text-blue-500 text-xs font-semibold">认领</button>
                        </>
                      )}

                      {lead.status === 'ASSIGNED' && (
                        <>
                          <button type="button" onClick={() => navigate(`/leads/${lead.id}`)} className="text-slate-500 hover:text-slate-800 text-xs font-semibold">查看</button>
                          <button type="button" onClick={() => navigate(`/leads/${lead.id}`, { state: { openFollowModal: true } })} className="text-emerald-600 hover:text-emerald-500 text-xs font-semibold">跟进</button>
                          <button type="button" onClick={() => setConfirmAbandonId(lead.id)} className="text-amber-600 hover:text-amber-500 text-xs font-semibold">放弃</button>
                        </>
                      )}

                      {lead.status === 'FOLLOWING' && (
                        <>
                          <button type="button" onClick={() => navigate(`/leads/${lead.id}`)} className="text-slate-500 hover:text-slate-800 text-xs font-semibold">查看</button>
                          <button type="button" onClick={() => navigate(`/leads/${lead.id}`, { state: { openFollowModal: true } })} className="text-emerald-600 hover:text-emerald-500 text-xs font-semibold">跟进</button>
                          <button type="button" onClick={() => navigate(`/leads/${lead.id}`, { state: { triggerConvert: true } })} className="text-purple-600 hover:text-purple-550 text-xs font-semibold">转客户</button>
                          <button type="button" onClick={() => setConfirmAbandonId(lead.id)} className="text-amber-600 hover:text-amber-500 text-xs font-semibold">放弃</button>
                        </>
                      )}

                      {(lead.status === 'CONVERTED' || (lead.status === 'ABANDONED' && !isHighseasAbandoned(lead))) && (
                        <button type="button" onClick={() => navigate(`/leads/${lead.id}`)} className="text-slate-500 hover:text-slate-800 text-xs font-semibold">查看</button>
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

      {/* 6.1 删除草稿确认 Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl border border-slate-100">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle size={18} />
              <h3 className="text-sm font-bold text-slate-800">确认删除</h3>
            </div>
            <p className="mt-3 text-xs text-slate-500 leading-relaxed">删除后不可恢复，确认删除？</p>
            <div className="mt-6 flex justify-end gap-2 text-xs">
              <button 
                type="button" 
                onClick={() => setConfirmDeleteId(null)}
                className="px-3 py-2 font-semibold text-slate-500 hover:bg-slate-50 rounded"
              >
                取消
              </button>
              <button 
                type="button" 
                onClick={handleDeleteDraft}
                className="px-3 py-2 font-bold text-white bg-red-500 hover:bg-red-600 rounded"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6.2 放弃原因 Modal */}
      {confirmAbandonId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl border border-slate-100">
            <div className="flex items-center gap-2 text-amber-500">
              <AlertTriangle size={18} />
              <h3 className="text-sm font-bold text-slate-800">确认放弃线索</h3>
            </div>
            <p className="mt-2 text-xs text-slate-500">放弃后线索将回退至公海，请输入您的放弃原因（必填）：</p>
            <textarea
              placeholder="请输入放弃原因，例如：客户无采购预算、已采购竞品等..."
              rows={3}
              value={abandonReason}
              onChange={(e) => setAbandonReason(e.target.value)}
              className="mt-3 w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-blue-500"
            />
            <div className="mt-6 flex justify-end gap-2 text-xs">
              <button 
                type="button" 
                onClick={() => {
                  setConfirmAbandonId(null);
                  setAbandonReason('');
                }}
                className="px-3 py-2 font-semibold text-slate-500 hover:bg-slate-50 rounded"
              >
                取消
              </button>
              <button 
                type="button" 
                disabled={!abandonReason.trim()}
                onClick={handleAbandon}
                className="px-3 py-2 font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-40 rounded"
              >
                确认放弃
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6.3 批量作废确认 Modal */}
      {batchActionType === 'VOID' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl border border-slate-100">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle size={18} />
              <h3 className="text-sm font-bold text-slate-800">确认批量作废</h3>
            </div>
            <p className="mt-3 text-xs text-slate-500 leading-relaxed">
              已选择 <strong className="text-red-500">{selectedLeadIds.length}</strong> 条线索，作废后将无法修改及操作，确认作废？
            </p>
            <div className="mt-6 flex justify-end gap-2 text-xs">
              <button 
                type="button" 
                onClick={() => setBatchActionType(null)}
                className="px-3 py-2 font-semibold text-slate-500 hover:bg-slate-50 rounded"
              >
                取消
              </button>
              <button 
                type="button" 
                onClick={handleBatchVoid}
                className="px-3 py-2 font-bold text-white bg-red-500 hover:bg-red-600 rounded"
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

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Lead } from '../db';
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  UserCheck
} from 'lucide-react';

const CURRENT_USER = '张三';

// 线索来源和行业字典
const SOURCE_MAP: Record<string, string> = {
  ONLINE: '线上申请',
  ACTIVITY: '市场活动',
  EXHIBITION: '展会渠道',
  REFERRAL: '客户转介绍',
  IMPORT: '批量导入',
  OTHER: '其他渠道'
};

const INDUSTRY_MAP: Record<string, string> = {
  MANUFACTURING: '制造业',
  RETAIL: '零售与电商',
  HEALTHCARE: '医疗健康',
  FINANCE: '金融与信托',
  IT: '信息技术',
  OTHER: '其他行业'
};

// AI评分配色样式
const getScoreBadgeClass = (score: number) => {
  if (score >= 70) return 'bg-emerald-50 text-emerald-600 border-emerald-250';
  if (score >= 40) return 'bg-amber-50 text-amber-600 border-amber-250';
  return 'bg-red-50 text-red-650 border-red-200';
};

export default function LeadPool() {
  const navigate = useNavigate();

  // 查询筛选状态
  const [keyword, setKeyword] = useState('');
  const [source, setSource] = useState('');
  const [industry, setIndustry] = useState('');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [poolType, setPoolType] = useState(''); // NEW | RELEASED

  // Toast 状态
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. 获取所有线索
  const leads = useLiveQuery(() => db.leads.toArray()) || [];

  // P1-4: 自动回收超48小时未跟进的已分配线索
  useEffect(() => {
    if (leads.length === 0) return;

    const checkTimeoutLeads = async () => {
      const assigned = leads.filter(l => l.status === 'ASSIGNED' && l.assignedAt);
      if (assigned.length === 0) return;

      const now = new Date().getTime();
      const timeoutIds: string[] = [];

      for (const lead of assigned) {
        const assignedTime = new Date(lead.assignedAt!).getTime();
        const diffHours = (now - assignedTime) / (1000 * 60 * 60);
        if (diffHours > 48) {
          const followCount = await db.follow_up_records.where('leadId').equals(lead.id).count();
          if (followCount === 0) {
            timeoutIds.push(lead.id);
          }
        }
      }

      if (timeoutIds.length > 0) {
        console.log('检测到以下已分配线索超48h且无跟进，自动退回待分配池：', timeoutIds);
        await db.transaction('rw', db.leads, async () => {
          for (const id of timeoutIds) {
            await db.leads.update(id, {
              status: 'PENDING_ASSIGN',
              owner: undefined,
              assignedAt: undefined
            });
          }
        });
        showToast('系统已自动将分配超48h且未跟进的线索退回待分配池', 'success');
      }
    };

    checkTimeoutLeads();
  }, [leads]);

  // 判断是否已被释放满7天
  const isAbandonedAndReleased = (lead: Lead) => {
    if (lead.status !== 'ABANDONED') return false;
    const timeStr = lead.abandonedAt || lead.followedAt;
    if (!timeStr) return false;
    const abandonedTime = new Date(timeStr).getTime();
    const now = new Date().getTime();
    const diffDays = (now - abandonedTime) / (1000 * 60 * 60 * 24);
    return diffDays >= 7;
  };

  // 2. 筛选在公海里的线索 (PENDING_ASSIGN 或 放弃满7天的 ABANDONED，或当前用户是原负责人)
  const poolLeads = leads.filter(lead => {
    const isNew = lead.status === 'PENDING_ASSIGN';
    const isReleased = isAbandonedAndReleased(lead);
    const isOwnerAbandon = lead.status === 'ABANDONED' && lead.owner === CURRENT_USER;
    
    // 必须符合公海的定义
    if (!isNew && !isReleased && !isOwnerAbandon) return false;

    // 关键词过滤 (公司名称/手机号/编号)
    if (keyword.trim()) {
      const kw = keyword.toLowerCase();
      const matchComp = lead.company.toLowerCase().includes(kw);
      const matchPhone = lead.phone ? lead.phone.includes(kw) : false;
      const matchId = lead.id.toLowerCase().includes(kw);
      if (!matchComp && !matchPhone && !matchId) return false;
    }

    // 来源过滤
    if (source && lead.source !== source) return false;

    // 行业过滤
    if (industry && lead.industry !== industry) return false;

    // AI评分区间过滤
    if (minScore && lead.score < parseInt(minScore)) return false;
    if (maxScore && lead.score > parseInt(maxScore)) return false;

    // 入池类型过滤
    if (poolType) {
      if (poolType === 'NEW' && !isNew) return false;
      if (poolType === 'RELEASED' && !isReleased) return false;
    }

    return true;
  }).map(lead => {
    // 动态增加附加属性方便表格展示
    const isNew = lead.status === 'PENDING_ASSIGN';
    return {
      ...lead,
      poolType: isNew ? 'NEW' : 'RELEASED',
      poolTime: isNew ? lead.createdAt : (lead.abandonedAt || lead.followedAt || lead.createdAt)
    };
  }).sort((a, b) => b.score - a.score); // 默认按 AI 评分倒序排序

  // 3. 认领交互
  const handleClaim = async (leadId: string) => {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    try {
      let isOwnerAbandon = false;
      await db.transaction('rw', db.leads, db.follow_up_records, async () => {
        const lead = await db.leads.get(leadId);
        isOwnerAbandon = !!(lead && lead.status === 'ABANDONED' && lead.owner === CURRENT_USER);

        await db.leads.update(leadId, {
          status: 'ASSIGNED',
          owner: CURRENT_USER,
          assignedAt: nowStr
        });

        // 插入跟进记录
        await db.follow_up_records.add({
          leadId,
          time: nowStr,
          operator: CURRENT_USER,
          type: '系统记录',
          content: isOwnerAbandon 
            ? `销售 [${CURRENT_USER}] 撤销了放弃，重新恢复跟进该线索。`
            : `销售 [${CURRENT_USER}] 从公海主动认领了该线索。`
        });
      });

      // 成功 Toast 提示 (无二次确认弹窗)
      showToast(isOwnerAbandon ? '撤销放弃成功，线索已恢复' : '线索已认领，请及时跟进', 'success');
    } catch (err) {
      console.error(err);
      showToast('认领失败，请重试', 'error');
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

      {/* 顶部标题栏 */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black text-slate-800">线索公海</h1>
          <p className="text-xs text-slate-500">展示所有等待分配的新线索或被放弃流失的呆滞线索，销售可主动认领直接跟进。</p>
        </div>
      </div>

      {/* 查询检索栏 */}
      <div className="forge-action-bar grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="relative md:col-span-2">
          <input
            type="text"
            placeholder="搜索公司名称/线索编号/手机号..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full h-9 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:border-blue-500"
          />
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
        </div>
        
        <div>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-650 focus:outline-none focus:border-blue-500"
          >
            <option value="">线索来源(全部)</option>
            {Object.entries(SOURCE_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-650 focus:outline-none focus:border-blue-500"
          >
            <option value="">所属行业(全部)</option>
            {Object.entries(INDUSTRY_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={poolType}
            onChange={(e) => setPoolType(e.target.value)}
            className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-650 focus:outline-none focus:border-blue-500"
          >
            <option value="">入池类型(全部)</option>
            <option value="NEW">新线索</option>
            <option value="RELEASED">已释放</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <input
              type="number"
              placeholder="评分Min"
              min="0"
              max="100"
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              className="w-full h-9 px-1.5 text-center text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            <span className="text-slate-400">-</span>
            <input
              type="number"
              placeholder="Max"
              min="0"
              max="100"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              className="w-full h-9 px-1.5 text-center text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setKeyword('');
              setSource('');
              setIndustry('');
              setPoolType('');
              setMinScore('');
              setMaxScore('');
            }}
            className="h-9 px-3 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors shrink-0"
          >
            重置
          </button>
        </div>
      </div>

      {/* 公海表格区 */}
      <div className="forge-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="forge-table text-xs">
            <thead>
              <tr>
                <th className="w-[160px]">线索编号</th>
                <th className="w-[180px]">公司名称</th>
                <th className="w-[100px]">线索来源</th>
                <th className="w-[120px]">所属行业</th>
                <th className="w-[80px]">AI评分</th>
                <th className="w-[100px]">入池类型</th>
                <th className="w-[160px]">入池时间</th>
                <th>放弃原因</th>
                <th className="text-right w-[100px] font-bold">操作</th>
              </tr>
            </thead>
            <tbody>
              {poolLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    公海暂无符合筛选要求的线索
                  </td>
                </tr>
              ) : (
                poolLeads.map(lead => (
                  <tr key={lead.id}>
                    {/* 线索编号链接至详情 */}
                    <td 
                      className="font-mono font-bold text-[#1677ff] cursor-pointer hover:underline"
                      onClick={() => navigate(`/leads/${lead.id}`)}
                    >
                      {lead.id}
                    </td>
                    <td className="font-bold text-slate-800">{lead.company}</td>
                    <td className="font-semibold text-slate-600">{SOURCE_MAP[lead.source] || lead.source}</td>
                    <td className="font-semibold text-slate-600">{INDUSTRY_MAP[lead.industry || ''] || lead.industry || '—'}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getScoreBadgeClass(lead.score)}`}>
                        {lead.score}分
                      </span>
                    </td>
                    <td>
                      {lead.poolType === 'NEW' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-150">
                          新线索
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200">
                          已释放
                        </span>
                      )}
                    </td>
                    <td className="font-mono text-slate-500 text-[11px]">{lead.poolTime}</td>
                    <td className="max-w-[200px] truncate text-slate-400 font-medium" title={lead.abandonedReason}>
                      {lead.poolType === 'RELEASED' ? lead.abandonedReason : '—'}
                    </td>
                    <td className="text-right">
                      {/* 认领按钮 */}
                      <button
                        type="button"
                        onClick={() => handleClaim(lead.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white rounded transition-colors shadow-sm ${
                          lead.owner === CURRENT_USER && lead.status === 'ABANDONED'
                            ? 'bg-amber-600 hover:bg-amber-500'
                            : 'bg-[#1677ff] hover:bg-blue-500'
                        }`}
                      >
                        <UserCheck size={11} />
                        <span>{lead.owner === CURRENT_USER && lead.status === 'ABANDONED' ? '撤销放弃' : '认领'}</span>
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
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Lead } from '../db';
import { 
  Plus, 
  Search, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CURRENT_USER,
  getLeadRouting,
  getPublicPoolEligibility,
  shanghaiNow,
  shanghaiToday,
} from '@/domain/businessRules';

const CURRENT_USER_NAME = CURRENT_USER.name;
const EMPTY_LEADS: Lead[] = [];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'DRAFT':
      return <Badge variant="secondary">草稿</Badge>;
    case 'PENDING_ASSIGN':
      return <Badge variant="info">待分配</Badge>;
    case 'ASSIGNED':
      return <Badge variant="warning">已分配</Badge>;
    case 'FOLLOWING':
      return <Badge variant="success">跟进中</Badge>;
    case 'CONVERTED':
      return <Badge variant="success">已转客户</Badge>;
    case 'ABANDONED':
      return <Badge variant="destructive">已作废</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getScoreBadge = (score: number) => {
  if (score >= 80) return <Badge variant="success" className="font-mono">{score}分</Badge>;
  if (score >= 50) return <Badge variant="warning" className="font-mono">{score}分</Badge>;
  return <Badge variant="destructive" className="font-mono">{score}分</Badge>;
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
  const [createdDateFrom, setCreatedDateFrom] = useState('');
  const [createdDateTo, setCreatedDateTo] = useState('');

  // 分页状态
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  // 筛选项改变时自动重设当前页为 1
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchKeyword, filterSource, filterIndustry, filterMinScore, filterMaxScore, filterOwner, createdDateFrom, createdDateTo]);
  
  // 勾选与弹窗状态
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // 弹窗确认状态
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmAbandonId, setConfirmAbandonId] = useState<string | null>(null);
  const [abandonReason, setAbandonReason] = useState('');
  const [batchVoidReason, setBatchVoidReason] = useState('');
  const [batchActionType, setBatchActionType] = useState<'VOID' | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<'UPLOAD' | 'PARSING' | 'PREVIEW'>('UPLOAD');
  const [importFileName, setImportFileName] = useState('');

  // 快捷显示 Toast
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 2. 从数据库中实时订阅所有线索
  const allLeads = useLiveQuery(() => db.leads.toArray()) ?? EMPTY_LEADS;

  // P1-4: 自动回收超48小时未跟进的已分配线索
  useEffect(() => {
    if (allLeads.length === 0) return;

    const checkTimeoutLeads = async () => {
      const assigned = allLeads.filter(l => l.status === 'ASSIGNED' && l.assignedAt);
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
        await db.transaction('rw', db.leads, async () => {
          for (const id of timeoutIds) {
            const current = await db.leads.get(id);
            await db.leads.update(id, {
              status: 'PENDING_ASSIGN',
              owner: undefined,
              assignedAt: undefined,
              poolType: 'ASSIGN_POOL',
              version: (current?.version || 0) + 1,
            });
          }
        });
        showToast('系统已自动将分配超48h且未跟进的线索退回待分配池', 'success');
      }
    };

    checkTimeoutLeads();
  }, [allLeads]);

  // 判断公海是否可见
  const isHighseasVisible = (lead: Lead) => getPublicPoolEligibility(lead, CURRENT_USER_NAME).visible;

  // 3. 计算各个 Tab 的统计计数
  const counts = {
    ALL: allLeads.length,
    PENDING: allLeads.filter(l => l.status === 'PENDING_ASSIGN').length,
    MY: allLeads.filter(l => l.owner === CURRENT_USER_NAME && ['DRAFT', 'ASSIGNED', 'FOLLOWING'].includes(l.status)).length,
    HIGHSEAS: allLeads.filter(l => isHighseasVisible(l)).length,
    CONVERTED: allLeads.filter(l => l.status === 'CONVERTED').length,
    ABANDONED: allLeads.filter(l => l.status === 'ABANDONED').length,
  };

  // 4. 按 Tab 逻辑和筛选框过滤线索
  const filteredLeads = allLeads.filter(lead => {
    if (activeTab === 'PENDING' && lead.status !== 'PENDING_ASSIGN') return false;
    if (activeTab === 'MY' && !(lead.owner === CURRENT_USER_NAME && ['DRAFT', 'ASSIGNED', 'FOLLOWING'].includes(lead.status))) return false;
    if (activeTab === 'HIGHSEAS' && !isHighseasVisible(lead)) return false;
    if (activeTab === 'CONVERTED' && lead.status !== 'CONVERTED') return false;
    if (activeTab === 'ABANDONED' && lead.status !== 'ABANDONED') return false;

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
    const createdDate = lead.createdAt.slice(0, 10);
    if (createdDateFrom && createdDate < createdDateFrom) return false;
    if (createdDateTo && createdDate > createdDateTo) return false;

    return true;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // 分页计算
  const totalCount = filteredLeads.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const pagedLeads = filteredLeads.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 5. 核心交互函数
  const handleClaim = async (id: string) => {
    if (!window.confirm('确认认领该公海线索并开始 48 小时首次跟进计时？')) return;
    try {
      const nowStr = shanghaiNow();
      await db.transaction('rw', db.leads, db.follow_up_records, async () => {
        const current = await db.leads.get(id);
        if (!current) throw new Error('线索不存在或已被移除');
        const eligibility = getPublicPoolEligibility(current, CURRENT_USER_NAME);
        if (!eligibility.claimable) throw new Error(eligibility.reason || '该线索当前不可认领');
        await db.leads.update(id, {
          status: 'ASSIGNED',
          owner: CURRENT_USER_NAME,
          assignedAt: nowStr,
          poolType: undefined,
          claimRequestId: `CLAIM-${id}-${Date.now()}`,
          version: (current.version || 0) + 1,
        });
        await db.follow_up_records.add({
          leadId: id,
          time: nowStr,
          operator: CURRENT_USER_NAME,
          type: '系统记录',
          content: `销售 [${CURRENT_USER_NAME}] 从公海认领了该线索。`,
        });
      });
      showToast('线索已认领，请在 48 小时内完成首次跟进');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '线索认领失败', 'error');
    }
  };

  const handleDeleteDraft = async () => {
    if (!confirmDeleteId) return;
    const current = await db.leads.get(confirmDeleteId);
    if (!current || current.status !== 'DRAFT') {
      showToast('仅草稿线索可以作废', 'error');
      return;
    }
    await db.leads.update(confirmDeleteId, {
      status: 'ABANDONED',
      voidType: 'DRAFT_VOID',
      abandonedAt: shanghaiNow(),
      abandonedReason: '创建人作废草稿',
      version: (current.version || 0) + 1,
    });
    setConfirmDeleteId(null);
    showToast('草稿线索已作废，历史记录已保留');
  };

  const handleAbandon = async () => {
    if (!confirmAbandonId || abandonReason.trim().length < 15) return;
    const nowStr = shanghaiNow();
    const current = await db.leads.get(confirmAbandonId);
    if (!current || !['ASSIGNED', 'FOLLOWING'].includes(current.status)) {
      showToast('只有已分配或跟进中的线索可以放弃', 'error');
      return;
    }
    await db.leads.update(confirmAbandonId, {
      status: 'ABANDONED',
      voidType: 'VOLUNTARY_ABANDON',
      abandonedReason: abandonReason.trim(),
      abandonedAt: nowStr,
      assignedAt: undefined,
      version: (current.version || 0) + 1,
    });
    await db.follow_up_records.add({
      leadId: confirmAbandonId,
      time: nowStr,
      operator: CURRENT_USER_NAME,
      type: '系统记录',
      content: `销售主动放弃线索；原负责人 7 天内不可重新认领。原因：${abandonReason.trim()}`,
    });
    setConfirmAbandonId(null);
    setAbandonReason('');
    showToast('线索已退回公海');
  };

  const handleBatchVoid = async () => {
    if (selectedLeadIds.length === 0 || batchVoidReason.trim().length < 15) return;
    const nowStr = shanghaiNow();
    let voidedCount = 0;
    await db.transaction('rw', db.leads, db.follow_up_records, async () => {
      for (const id of selectedLeadIds) {
        const current = await db.leads.get(id);
        if (!current || ['CONVERTED', 'ABANDONED'].includes(current.status)) continue;
        await db.leads.update(id, {
          status: 'ABANDONED',
          voidType: 'MANAGER_VOID',
          abandonedReason: batchVoidReason.trim(),
          abandonedAt: nowStr,
          owner: undefined,
          assignedAt: undefined,
          version: (current.version || 0) + 1,
        });
        await db.follow_up_records.add({
          leadId: id,
          time: nowStr,
          operator: CURRENT_USER_NAME,
          type: '系统记录',
          content: `主管批量作废线索，原因：${batchVoidReason.trim()}`,
        });
        voidedCount += 1;
      }
    });
    setSelectedLeadIds([]);
    setBatchActionType(null);
    setBatchVoidReason('');
    showToast(`已作废 ${voidedCount} 条可操作线索，终态记录未改动`);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedLeadIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeadIds(pagedLeads.map(l => l.id));
    } else {
      setSelectedLeadIds([]);
    }
  };

  return (
    <div className="space-y-4">
      {/* 顶部 Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800">
          {toastMessage.type === 'success' ? <CheckCircle size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-500" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 头部导航与操作 */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1" data-anno="leads-page-header">
          <h1 className="text-xl font-bold text-slate-900">线索管理</h1>
          <p className="text-xs text-slate-500">处理全渠道收集的线索并评估 AI 分数，推动转化为商机或客户。</p>
        </div>
        <div className="flex gap-2" data-anno="leads-create-tools">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => {
              setIsImportModalOpen(true);
              setImportStep('UPLOAD');
              setImportFileName('');
            }}
          >
            <Upload size={14} className="mr-1" />
            <span>批量导入</span>
          </Button>
          <Button 
            size="sm"
            onClick={() => navigate('/leads/new')}
          >
            <Plus size={14} className="mr-1" />
            <span>新建线索</span>
          </Button>
        </div>
      </div>

      {/* 6 状态 Tab 栏 */}
      <div className="border-b border-slate-200" data-anno="leads-status-tabs">
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
                className={`pb-3 text-xs font-semibold transition-all relative cursor-pointer flex items-center gap-1.5 ${
                  active ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                <Badge variant={active ? 'default' : 'secondary'} className="h-4 px-1.5 text-[10px] font-mono">
                  {count > 99 ? '99+' : count}
                </Badge>
                {active && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 筛选与查询区 */}
      <Card data-anno="leads-filter-bar">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2 relative">
            <Input 
              placeholder="搜索线索编号、公司、联系人、手机号..." 
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="pl-8 text-xs h-9"
            />
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          </div>
          <div>
            <select 
              value={filterSource} 
              onChange={(e) => setFilterSource(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            <Input 
              type="number" 
              placeholder="最小分" 
              value={filterMinScore}
              onChange={(e) => setFilterMinScore(e.target.value)}
              className="text-xs h-9"
            />
            <span className="text-slate-400 text-xs">-</span>
            <Input 
              type="number" 
              placeholder="最大分" 
              value={filterMaxScore}
              onChange={(e) => setFilterMaxScore(e.target.value)}
              className="text-xs h-9"
            />
          </div>
          <div className="flex justify-between items-center gap-2" data-anno="leads-permissions">
            <select 
              value={filterOwner} 
              onChange={(e) => setFilterOwner(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">负责人(全部)</option>
              <option value="张三">张三 (当前用户)</option>
              <option value="李四">李四</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchKeyword('');
                setFilterSource('');
                setFilterIndustry('');
                setFilterMinScore('');
                setFilterMaxScore('');
                setFilterOwner('');
                setCreatedDateFrom('');
                setCreatedDateTo('');
                setSelectedLeadIds([]);
              }}
              className="shrink-0 text-xs"
            >
              重置
            </Button>
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <label className="text-xs text-slate-500 shrink-0">创建日期</label>
            <Input type="date" value={createdDateFrom} onChange={(event) => setCreatedDateFrom(event.target.value)} className="text-xs h-9" aria-label="线索创建开始日期" />
            <span className="text-slate-400 text-xs">至</span>
            <Input type="date" value={createdDateTo} onChange={(event) => setCreatedDateTo(event.target.value)} className="text-xs h-9" aria-label="线索创建结束日期" />
          </div>
        </CardContent>
      </Card>

      {/* 批量操作工具条容器 */}
      <div data-anno="leads-batch-tools">
        {selectedLeadIds.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs">
            <span className="font-semibold text-blue-700">已选择 {selectedLeadIds.length} 项</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBatchActionType('VOID')}
              className="h-7 px-2.5 text-xs"
            >
              批量作废
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedLeadIds([])}
              className="h-7 px-2 text-xs text-slate-600"
            >
              取消选择
            </Button>
          </div>
        )}
      </div>

      {/* 数据表格卡片 */}
      <Card className="overflow-hidden" data-anno="leads-table-fields">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">
                <input 
                  type="checkbox" 
                  checked={pagedLeads.length > 0 && selectedLeadIds.length === pagedLeads.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-slate-300"
                />
              </TableHead>
              <TableHead>线索单号</TableHead>
              <TableHead>公司名称</TableHead>
              <TableHead>联系人</TableHead>
              <TableHead>手机号</TableHead>
              <TableHead>邮箱</TableHead>
              <TableHead>线索来源</TableHead>
              <TableHead data-anno="leads-ai-score">AI评分</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>负责人</TableHead>
              <TableHead>最近跟进</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right" data-anno="leads-row-operations">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {totalCount === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-10 text-slate-400">
                  暂无符合条件的线索数据
                </TableCell>
              </TableRow>
            ) : (
              pagedLeads.map((lead) => (
                <TableRow key={lead.id} className={selectedLeadIds.includes(lead.id) ? 'bg-blue-50/40' : ''}>
                  <TableCell className="text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedLeadIds.includes(lead.id)}
                      onChange={() => handleToggleSelect(lead.id)}
                      className="rounded border-slate-300"
                    />
                  </TableCell>
                  <TableCell>
                    <span 
                      className="font-mono font-medium text-blue-600 cursor-pointer hover:underline"
                      onClick={() => navigate(`/leads/${lead.id}`)}
                    >
                      {lead.id}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">{lead.company}</TableCell>
                  <TableCell>{lead.contact || '—'}</TableCell>
                  <TableCell className="font-mono">{lead.phone || '—'}</TableCell>
                  <TableCell className="font-mono">{lead.email || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[11px] font-normal">
                      {lead.source === 'ONLINE' ? '官网' : 
                       lead.source === 'ACTIVITY' ? '线下活动' : 
                       lead.source === 'EXHIBITION' ? '展会' : 
                       lead.source === 'REFERRAL' ? '转介绍' : 
                       lead.source === 'IMPORT' ? '批量导入' : '其他'}
                    </Badge>
                  </TableCell>
                  <TableCell>{getScoreBadge(lead.score)}</TableCell>
                  <TableCell>{getStatusBadge(lead.status)}</TableCell>
                  <TableCell>{lead.owner || <span className="text-slate-400">—</span>}</TableCell>
                  <TableCell className="text-slate-500 font-mono">{lead.followedAt?.substring(2, 16) || '—'}</TableCell>
                  <TableCell className="text-slate-500 font-mono">{lead.createdAt.substring(2, 16)}</TableCell>
                  <TableCell className="text-right space-x-1.5">
                    {lead.status === 'DRAFT' && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/leads/${lead.id}`)} className="h-7 px-2 text-xs">查看</Button>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/leads/${lead.id}/edit`)} className="h-7 px-2 text-xs text-blue-600">编辑</Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(lead.id)} className="h-7 px-2 text-xs text-red-600">作废</Button>
                      </>
                    )}
                    
                    {(lead.status === 'PENDING_ASSIGN' || (lead.status === 'ABANDONED' && isHighseasVisible(lead))) && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/leads/${lead.id}`)} className="h-7 px-2 text-xs">查看</Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleClaim(lead.id)} 
                          disabled={!getPublicPoolEligibility(lead, CURRENT_USER_NAME).claimable}
                          title={getPublicPoolEligibility(lead, CURRENT_USER_NAME).reason}
                          className="h-7 px-2 text-xs text-blue-600 font-medium"
                        >
                          {getPublicPoolEligibility(lead, CURRENT_USER_NAME).claimable ? '认领' : '保护期中'}
                        </Button>
                      </>
                    )}

                    {lead.status === 'ASSIGNED' && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/leads/${lead.id}`)} className="h-7 px-2 text-xs">查看</Button>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/leads/${lead.id}`, { state: { openFollowModal: true } })} className="h-7 px-2 text-xs text-emerald-600">跟进</Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmAbandonId(lead.id)} className="h-7 px-2 text-xs text-amber-600">放弃</Button>
                      </>
                    )}

                    {lead.status === 'FOLLOWING' && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/leads/${lead.id}`)} className="h-7 px-2 text-xs">查看</Button>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/leads/${lead.id}`, { state: { openFollowModal: true } })} className="h-7 px-2 text-xs text-emerald-600">跟进</Button>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/leads/${lead.id}`, { state: { triggerConvert: true } })} className="h-7 px-2 text-xs text-purple-600">转客户</Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmAbandonId(lead.id)} className="h-7 px-2 text-xs text-amber-600">放弃</Button>
                      </>
                    )}

                    {(lead.status === 'CONVERTED' || (lead.status === 'ABANDONED' && !isHighseasVisible(lead))) && (
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/leads/${lead.id}`)} className="h-7 px-2 text-xs">查看</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

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
              className="h-8 px-2 text-xs bg-white border border-slate-200 rounded text-slate-700 focus:outline-none"
            >
              <option value={20}>20 条/页</option>
              <option value={50}>50 条/页</option>
              <option value={100}>100 条/页</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                if (currentPage > 1) {
                  setCurrentPage(prev => prev - 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              disabled={currentPage === 1}
              className="h-8 px-3 text-xs"
            >
              上一页
            </Button>
            <span className="font-mono text-slate-600">{currentPage} / {totalPages}</span>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                if (currentPage < totalPages) {
                  setCurrentPage(prev => prev + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              disabled={currentPage === totalPages}
              className="h-8 px-3 text-xs"
            >
              下一页
            </Button>
          </div>
        </div>
      </Card>

      {/* 作废草稿确认 Dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 text-sm">
              <AlertTriangle size={18} />
              <span>确认作废草稿</span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500 leading-relaxed">作废后记录仍会保留并进入“已作废”，确认继续？</p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setConfirmDeleteId(null)}>取消</Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteDraft}>确认作废</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 放弃原因 Dialog */}
      <Dialog open={!!confirmAbandonId} onOpenChange={(open) => {
        if (!open) {
          setConfirmAbandonId(null);
          setAbandonReason('');
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 text-sm">
              <AlertTriangle size={18} />
              <span>确认放弃线索</span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500">放弃后线索将回退至公海，请输入您的放弃原因（必填）：</p>
          <Textarea
            placeholder="请输入至少15个字的放弃原因，例如：客户本季度无采购预算，计划下季度再联系"
            rows={3}
            value={abandonReason}
            onChange={(e) => setAbandonReason(e.target.value)}
            className="text-xs"
          />
          <p className="text-[11px] text-slate-400">已输入 {abandonReason.trim().length}/15 字；原负责人 7 天内不可重新认领，其他销售可立即认领。</p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => {
              setConfirmAbandonId(null);
              setAbandonReason('');
            }}>取消</Button>
            <Button 
              variant="default"
              size="sm"
              disabled={abandonReason.trim().length < 15}
              onClick={handleAbandon}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              确认放弃
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量作废确认 Dialog */}
      <Dialog open={batchActionType === 'VOID'} onOpenChange={(open) => !open && setBatchActionType(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 text-sm">
              <AlertTriangle size={18} />
              <span>确认批量作废</span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500 leading-relaxed">
            已选择 <strong className="text-red-500">{selectedLeadIds.length}</strong> 条线索。已转客户/已作废等终态会自动跳过，请填写主管作废原因：
          </p>
          <Textarea
            placeholder="请输入至少15个字的主管作废原因"
            rows={3}
            value={batchVoidReason}
            onChange={(event) => setBatchVoidReason(event.target.value)}
            className="text-xs"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setBatchActionType(null)}>取消</Button>
            <Button variant="destructive" size="sm" disabled={batchVoidReason.trim().length < 15} onClick={handleBatchVoid}>确认作废</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量导入 Dialog */}
      <Dialog open={isImportModalOpen} onOpenChange={(open) => setIsImportModalOpen(open)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">批量导入线索 (Excel)</DialogTitle>
          </DialogHeader>

          {importStep === 'UPLOAD' && (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg p-10 bg-slate-50 space-y-3">
              <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Upload size={24} />
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-700 text-xs">点击或拖拽 Excel 文件到此区域上传</p>
                <p className="text-[10px] text-slate-400 mt-1">仅支持 .xlsx, .xls 格式，最大 10MB</p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setImportFileName('leads_import_template_20260718.xlsx');
                  setImportStep('PARSING');
                  setTimeout(() => {
                    setImportStep('PREVIEW');
                  }, 1200);
                }}
              >
                选择模拟 Excel 文件
              </Button>
            </div>
          )}

          {importStep === 'PARSING' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <div className="text-center text-slate-500 text-xs">
                正在解析 Excel 表格数据，联动 AI 评分模型计算转化分数...
              </div>
            </div>
          )}

          {importStep === 'PREVIEW' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-2.5 rounded text-xs font-medium flex items-center gap-2">
                <CheckCircle size={14} />
                <span>已解析文件「{importFileName}」，AI 评分预测已就绪，共找到 3 条新线索：</span>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[250px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>公司名称</TableHead>
                      <TableHead>联系人</TableHead>
                      <TableHead>手机号</TableHead>
                      <TableHead>所属行业</TableHead>
                      <TableHead>AI 预测评分</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { company: '龙翔智能科技有限公司', contact: '孙悟空', phone: '13911112222', industry: 'MANUFACTURING', score: 78 },
                      { company: '卓越医疗器械有限公司', contact: '白骨精', phone: '13500009999', industry: 'HEALTHCARE', score: 85 },
                      { company: '极光微电子有限公司', contact: '哪吒', phone: '18877778888', industry: 'IT', score: 92 }
                    ].map((preview, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-slate-900">{preview.company}</TableCell>
                        <TableCell>{preview.contact}</TableCell>
                        <TableCell className="font-mono">{preview.phone}</TableCell>
                        <TableCell>
                          {preview.industry === 'MANUFACTURING' ? '制造业' : 
                           preview.industry === 'HEALTHCARE' ? '医疗健康' : '信息技术'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="success" className="font-mono">{preview.score}分</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsImportModalOpen(false)}
                >
                  取消
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    const nowStr = shanghaiNow();
                    const idPrefix = `LEAD${shanghaiToday().replace(/-/g, '')}-`;
                    const existingIds = await db.leads.filter(item => item.id.startsWith(idPrefix)).primaryKeys();
                    let nextIndex = existingIds.reduce((max, key) => {
                      const suffix = Number(String(key).slice(idPrefix.length));
                      return Number.isFinite(suffix) ? Math.max(max, suffix) : max;
                    }, 0) + 1;
                    const importRows = [
                      { company: '龙翔智能科技有限公司', contact: '孙悟空', phone: '13911112222', email: 'wukong@longxiang.com', industry: 'MANUFACTURING', region: '北京市-海淀区', score: 78 },
                      { company: '卓越医疗器械有限公司', contact: '白骨精', phone: '13500009999', email: 'gujing@zhuoyue.com', industry: 'HEALTHCARE', region: '广东省-深圳市', score: 85 },
                      { company: '极光微电子有限公司', contact: '哪吒', phone: '18877778888', email: 'nezha@jiguang.com', industry: 'IT', region: '上海市-张江区', score: 92 },
                    ];
                    const mockImportLeads: Lead[] = importRows.map(row => {
                      const routing = getLeadRouting(row.score);
                      return {
                        ...row,
                        id: `${idPrefix}${String(nextIndex++).padStart(4, '0')}`,
                        source: 'IMPORT',
                        status: routing.status,
                        owner: routing.owner,
                        assignedAt: routing.status === 'ASSIGNED' ? nowStr : undefined,
                        poolType: routing.poolType,
                        createdAt: nowStr,
                        createdBy: CURRENT_USER_NAME,
                        version: 1,
                      };
                    });

                    await db.transaction('rw', db.leads, async () => {
                      await db.leads.bulkAdd(mockImportLeads);
                    });

                    setIsImportModalOpen(false);
                    showToast('成功导入 3 条新线索，AI 已自动计算转化分数并分发！', 'success');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  确认导入
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

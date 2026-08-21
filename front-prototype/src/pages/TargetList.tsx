import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Target } from '../db';
import { Download, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { shanghaiMonth } from '@/domain/businessRules';
import { ListPagination } from '@/components/list-pagination';

const salesIdMap: Record<string, string> = {
  '张三': 'S001',
  '李四': 'S002',
  '王五': 'S003'
};
const EMPTY_TARGETS: Target[] = [];

const formatCurrency = (val: number) => {
  return '¥' + val.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
};

// 进度条配色计算 (红线: >=100绿/50-99黄/<50红)
const getProgressColorClass = (pct: number) => {
  if (pct >= 100) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-amber-500';
  return 'bg-red-500';
};

const getTextColorClass = (pct: number) => {
  if (pct >= 100) return 'text-emerald-600 font-semibold';
  if (pct >= 50) return 'text-amber-600 font-semibold';
  return 'text-red-500 font-semibold';
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return <Badge variant="warning">进行中</Badge>;
    case 'ACHIEVED':
      return <Badge variant="success">已达成</Badge>;
    case 'UNACHIEVED':
      return <Badge variant="destructive">未达成</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function TargetList() {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(shanghaiMonth());
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SETTLING' | 'ERROR' | 'FINAL'>('ALL');
  const [salesFilter, setSalesFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  // 1. 实时读取数据库中所有的销售、线索和商机
  const targets = useLiveQuery(() => db.targets.toArray()) ?? EMPTY_TARGETS;
  const leads = useLiveQuery(() => db.leads.toArray()) || [];
  const opps = useLiveQuery(() => db.opportunities.toArray()) || [];

  useEffect(() => {
    if (targets.length === 0 || targets.some(target => target.month === selectedMonth)) return;
    const latestMonth = [...new Set(targets.map(target => target.month))].sort().at(-1);
    if (latestMonth) setSelectedMonth(latestMonth);
  }, [targets, selectedMonth]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth, statusFilter, salesFilter, keyword]);

  // 2. 核心实时计算函数
  const getTargetProgress = (tgt: Target) => {
    if (tgt.status !== 'ACTIVE') {
      const actualLead = tgt.lockedLeadCount ?? 0;
      const actualOpp = tgt.lockedOppCount ?? 0;
      const actualAmount = tgt.lockedAmount ?? 0;

      const leadPct = tgt.leadTarget > 0 ? Math.round((actualLead / tgt.leadTarget) * 100) : 100;
      const oppPct = tgt.oppTarget > 0 ? Math.round((actualOpp / tgt.oppTarget) * 100) : 100;
      const amountPct = tgt.amountTarget > 0 ? Math.round((actualAmount / tgt.amountTarget) * 100) : 100;

      return {
        actualLead,
        actualOpp,
        actualAmount,
        leadPct,
        oppPct,
        amountPct
      };
    }

    const monthPrefix = tgt.month;
    const salesId = tgt.salesId || salesIdMap[tgt.salesName];

    const actualLead = leads.filter(l => 
      l.status === 'CONVERTED' && 
      (l.convertedById === salesId || (!l.convertedById && l.owner === tgt.salesName)) &&
      l.convertedAt?.startsWith(monthPrefix)
    ).length;

    const actualOpp = opps.filter(o => 
      (o.createdById === salesId || (!o.createdById && o.createdBy === tgt.salesName)) &&
      o.createdAt.startsWith(monthPrefix)
    ).length;

    const actualAmount = opps.filter(o => 
      o.status === 'WON' && 
      (o.createdById === salesId || (!o.createdById && o.createdBy === tgt.salesName)) &&
      o.wonAt?.startsWith(monthPrefix)
    ).reduce((sum, o) => sum + (o.amount || 0), 0);

    const leadPct = tgt.leadTarget > 0 ? Math.round((actualLead / tgt.leadTarget) * 100) : 100;
    const oppPct = tgt.oppTarget > 0 ? Math.round((actualOpp / tgt.oppTarget) * 100) : 100;
    const amountPct = tgt.amountTarget > 0 ? Math.round((actualAmount / tgt.amountTarget) * 100) : 100;

    return {
      actualLead,
      actualOpp,
      actualAmount,
      leadPct,
      oppPct,
      amountPct
    };
  };

  // 3. 计算当月全团队汇总数据
  const currentMonthTargets = targets.filter(t => t.month === selectedMonth);
  const filteredTargets = currentMonthTargets.filter(target => {
    if (salesFilter && (target.salesId || salesIdMap[target.salesName]) !== salesFilter) return false;
    if (keyword.trim() && !`${target.id} ${target.salesName} ${target.salesId || ''}`.toLowerCase().includes(keyword.trim().toLowerCase())) return false;
    if (statusFilter === 'ACTIVE' && target.status !== 'ACTIVE') return false;
    if (statusFilter === 'SETTLING' && !['PROCESSING', 'RETRYING'].includes(target.settlementStatus || '')) return false;
    if (statusFilter === 'ERROR' && target.settlementStatus !== 'FAILED') return false;
    if (statusFilter === 'FINAL' && !['ACHIEVED', 'UNACHIEVED'].includes(target.status)) return false;
    return true;
  });
  const totalCount = filteredTargets.length;
  const displayedTargets = [...filteredTargets]
    .sort((a, b) => a.salesName.localeCompare(b.salesName, 'zh-CN'))
    .slice((currentPage - 1) * pageSize, currentPage * pageSize);
  let totalLeadTarget = 0;
  let totalLeadActual = 0;
  let totalOppTarget = 0;
  let totalOppActual = 0;
  let totalAmountTarget = 0;
  let totalAmountActual = 0;

  currentMonthTargets.forEach(t => {
    const prog = getTargetProgress(t);
    totalLeadTarget += t.leadTarget;
    totalLeadActual += prog.actualLead;
    totalOppTarget += t.oppTarget;
    totalOppActual += prog.actualOpp;
    totalAmountTarget += t.amountTarget;
    totalAmountActual += prog.actualAmount;
  });

  const totalLeadPct = currentMonthTargets.length > 0 && totalLeadTarget === 0 ? 100 : totalLeadTarget > 0 ? Math.min(100, Math.round((totalLeadActual / totalLeadTarget) * 100)) : 0;
  const totalOppPct = currentMonthTargets.length > 0 && totalOppTarget === 0 ? 100 : totalOppTarget > 0 ? Math.min(100, Math.round((totalOppActual / totalOppTarget) * 100)) : 0;
  const totalAmountPct = currentMonthTargets.length > 0 && totalAmountTarget === 0 ? 100 : totalAmountTarget > 0 ? Math.min(100, Math.round((totalAmountActual / totalAmountTarget) * 100)) : 0;

  const statusTabs = [
    { key: 'ALL' as const, label: '全部', count: currentMonthTargets.length },
    { key: 'ACTIVE' as const, label: '进行中', count: currentMonthTargets.filter(target => target.status === 'ACTIVE').length },
    { key: 'SETTLING' as const, label: '结算中', count: currentMonthTargets.filter(target => ['PROCESSING', 'RETRYING'].includes(target.settlementStatus || '')).length },
    { key: 'ERROR' as const, label: '结算异常', count: currentMonthTargets.filter(target => target.settlementStatus === 'FAILED').length },
    { key: 'FINAL' as const, label: '已结算', count: currentMonthTargets.filter(target => ['ACHIEVED', 'UNACHIEVED'].includes(target.status)).length },
  ];

  const handleExport = () => {
    const rows = filteredTargets.map(target => {
      const progress = getTargetProgress(target);
      return [target.id, target.salesId || salesIdMap[target.salesName] || '', target.salesName, target.month, target.status, progress.actualLead, progress.actualOpp, progress.actualAmount].join(',');
    });
    const csv = ['目标编号,销售ID,销售代表,目标月份,状态,已转化线索,新增商机,CRM WON金额', ...rows].join('\n');
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `forge-crm-业绩目标-${selectedMonth}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-4">
      {/* 头部标题区 */}
      <div className="flex justify-between items-center" data-anno="target-list-page-header">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-slate-900">业绩目标</h1>
          <p className="text-xs text-slate-500">金额仅按 CRM 当月赢单（WON）归集；结算由服务端月末任务执行，浏览器页面不写结算结果。</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="h-9 w-36" aria-label="查看月份" />
          <Button variant="outline" size="sm" onClick={handleExport} className="h-9 text-xs">
            <Download size={14} className="mr-1" />
            导出
          </Button>
          <Button
            data-anno="target-list-create-tool"
            size="sm"
            onClick={() => navigate('/targets/new')}
          >
            <Plus size={14} className="mr-1" />
            <span>制定目标</span>
          </Button>
        </div>
      </div>

      <div className="border-b border-slate-200" data-anno="target-list-status-tabs">
        <div className="flex gap-6">
          {statusTabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`pb-2.5 text-xs font-semibold transition-all relative cursor-pointer flex items-center gap-1.5 ${statusFilter === tab.key ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <span>{tab.label}</span>
              <Badge variant={statusFilter === tab.key ? 'default' : 'secondary'} className="h-4 px-1.5 text-[10px] font-mono">{tab.count}</Badge>
              {statusFilter === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      <Card data-anno="target-list-filter-bar">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Input placeholder="搜索目标编号、销售姓名或销售ID..." value={keyword} onChange={(event) => setKeyword(event.target.value)} className="pl-8 text-xs h-9" />
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          </div>
          <select value={salesFilter} onChange={(event) => setSalesFilter(event.target.value)} className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500" aria-label="销售代表">
            <option value="">销售代表(全部)</option>
            <option value="S001">张三 (S001)</option>
            <option value="S002">李四 (S002)</option>
            <option value="S003">王五 (S003)</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => { setKeyword(''); setSalesFilter(''); }} className="h-9 text-xs">重置</Button>
        </CardContent>
      </Card>

      {/* 当月目标总览卡片 */}
      <Card data-anno="target-list-overview">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 线索转化总览 */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-500">当月线索转化总额</span>
              <span className="text-slate-800 font-mono">{totalLeadActual} / {totalLeadTarget} 个</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
              <div 
                style={{ width: `${totalLeadPct}%` }}
                className={`h-full transition-all duration-500 ${getProgressColorClass(totalLeadPct)}`}
              />
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">全员总指标</span>
              <span className={getTextColorClass(totalLeadPct)}>达成率: {totalLeadPct}%</span>
            </div>
          </div>

          {/* 商机个数总览 */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-500">当月新增商机总额</span>
              <span className="text-slate-800 font-mono">{totalOppActual} / {totalOppTarget} 个</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
              <div 
                style={{ width: `${totalOppPct}%` }}
                className={`h-full transition-all duration-500 ${getProgressColorClass(totalOppPct)}`}
              />
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">全员总指标</span>
              <span className={getTextColorClass(totalOppPct)}>达成率: {totalOppPct}%</span>
            </div>
          </div>

          {/* 赢单金额总览 */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-500">当月赢单金额总额</span>
              <span className="text-slate-800 font-mono">{formatCurrency(totalAmountActual)} / {formatCurrency(totalAmountTarget)}</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
              <div 
                style={{ width: `${totalAmountPct}%` }}
                className={`h-full transition-all duration-500 ${getProgressColorClass(totalAmountPct)}`}
              />
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">全员总指标</span>
              <span className={getTextColorClass(totalAmountPct)}>达成率: {totalAmountPct}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 业绩目标主表格 */}
      <Card className="overflow-hidden" data-anno="target-list-table-fields">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">目标编号</TableHead>
              <TableHead className="w-[110px]">销售代表</TableHead>
              <TableHead className="w-[90px]">目标月份</TableHead>
              <TableHead className="w-[180px]" data-anno="target-list-progress-fields">线索转化进度</TableHead>
              <TableHead className="w-[180px]">新增商机进度</TableHead>
              <TableHead className="w-[200px]">赢单金额进度</TableHead>
              <TableHead className="w-[100px]" data-anno="target-list-status">状态</TableHead>
              <TableHead className="text-right w-[110px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedTargets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-slate-400">
                  尚未录入任何业绩目标数据
                </TableCell>
              </TableRow>
            ) : (
              displayedTargets.map(tgt => {
                const prog = getTargetProgress(tgt);
                const salesId = salesIdMap[tgt.salesName] || '—';

                return (
                  <TableRow key={tgt.id}>
                    <TableCell className="font-mono font-medium text-slate-800">{tgt.id}</TableCell>
                    <TableCell>
                      <span className="font-medium text-slate-900">{tgt.salesName}</span>
                      <span className="ml-1 text-[10px] text-slate-400 font-mono">({salesId})</span>
                    </TableCell>
                    <TableCell className="font-mono text-slate-600 font-medium">{tgt.month}</TableCell>
                    
                    {/* 线索进度 */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-slate-500">{prog.actualLead} / {tgt.leadTarget} 个</span>
                          <span className={getTextColorClass(prog.leadPct)}>{prog.leadPct}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/20">
                          <div 
                            style={{ width: `${Math.min(100, prog.leadPct)}%` }}
                            className={`h-full ${getProgressColorClass(prog.leadPct)}`}
                          />
                        </div>
                      </div>
                    </TableCell>

                    {/* 商机进度 */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-slate-500">{prog.actualOpp} / {tgt.oppTarget} 个</span>
                          <span className={getTextColorClass(prog.oppPct)}>{prog.oppPct}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/20">
                          <div 
                            style={{ width: `${Math.min(100, prog.oppPct)}%` }}
                            className={`h-full ${getProgressColorClass(prog.oppPct)}`}
                          />
                        </div>
                      </div>
                    </TableCell>

                    {/* 赢单金额进度 */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-slate-500 truncate max-w-[110px] block">{formatCurrency(prog.actualAmount)} / {formatCurrency(tgt.amountTarget)}</span>
                          <span className={getTextColorClass(prog.amountPct)}>{prog.amountPct}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/20">
                          <div 
                            style={{ width: `${Math.min(100, prog.amountPct)}%` }}
                            className={`h-full ${getProgressColorClass(prog.amountPct)}`}
                          />
                        </div>
                      </div>
                    </TableCell>

                    {/* 状态 Tag */}
                    <TableCell>{getStatusBadge(tgt.status)}</TableCell>

                    {/* 操作 */}
                    <TableCell className="text-right" data-anno="target-list-row-operations">
                      {tgt.status === 'ACTIVE' && tgt.month >= shanghaiMonth() && (!tgt.settlementStatus || tgt.settlementStatus === 'NOT_STARTED') && (
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/targets/${tgt.id}/edit`)} className="h-7 px-2 text-xs text-blue-600">
                          调整目标
                        </Button>
                      )}
                      <span className="text-[10px] text-slate-500">
                        {tgt.settlementStatus === 'SUCCESS'
                          ? '🔒 服务端已结算'
                          : tgt.settlementStatus === 'PROCESSING'
                            ? '服务端结算中'
                            : tgt.status === 'ACTIVE' && tgt.month < shanghaiMonth()
                              ? '待服务端结算'
                              : '实时进度'}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <ListPagination
          total={totalCount}
          page={currentPage}
          pageSize={pageSize}
          onPageChange={(page) => {
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </Card>

    </div>
  );
}

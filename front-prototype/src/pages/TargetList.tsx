import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Target } from '../db';
import { Trophy, Plus, CheckCircle, XCircle, Lock } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const salesIdMap: Record<string, string> = {
  '张三': 'S001',
  '李四': 'S002',
  '王五': 'S003'
};

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

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    ACTIVE: '进行中',
    ACHIEVED: '已达成',
    UNACHIEVED: '未达成'
  };
  return map[status] || status;
};

export default function TargetList() {
  const navigate = useNavigate();
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // 结算锁定弹窗
  const [lockTargetId, setLockTargetId] = useState<string | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. 实时读取数据库中所有的销售、线索和商机
  const targets = useLiveQuery(() => db.targets.toArray()) || [];
  const leads = useLiveQuery(() => db.leads.toArray()) || [];
  const opps = useLiveQuery(() => db.opportunities.toArray()) || [];

  const currentMonth = '2026-07';

  // 2. 核心实时计算函数
  const getTargetProgress = (tgt: Target) => {
    if (tgt.status !== 'ACTIVE') {
      const actualLead = tgt.lockedLeadCount ?? 0;
      const actualOpp = tgt.lockedOppCount ?? 0;
      const actualAmount = tgt.lockedAmount ?? 0;

      const leadPct = tgt.leadTarget > 0 ? Math.round((actualLead / tgt.leadTarget) * 100) : 0;
      const oppPct = tgt.oppTarget > 0 ? Math.round((actualOpp / tgt.oppTarget) * 100) : 0;
      const amountPct = tgt.amountTarget > 0 ? Math.round((actualAmount / tgt.amountTarget) * 100) : 0;

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
    const sales = tgt.salesName;

    const actualLead = leads.filter(l => 
      l.status === 'CONVERTED' && 
      l.owner === sales && 
      l.convertedAt?.startsWith(monthPrefix)
    ).length;

    const actualOpp = opps.filter(o => 
      o.createdBy === sales && 
      o.createdAt.startsWith(monthPrefix)
    ).length;

    const actualAmount = opps.filter(o => 
      o.status === 'WON' && 
      o.createdBy === sales && 
      o.wonAt?.startsWith(monthPrefix)
    ).reduce((sum, o) => sum + (o.amount || 0), 0);

    const leadPct = tgt.leadTarget > 0 ? Math.round((actualLead / tgt.leadTarget) * 100) : 0;
    const oppPct = tgt.oppTarget > 0 ? Math.round((actualOpp / tgt.oppTarget) * 100) : 0;
    const amountPct = tgt.amountTarget > 0 ? Math.round((actualAmount / tgt.amountTarget) * 100) : 0;

    return {
      actualLead,
      actualOpp,
      actualAmount,
      leadPct,
      oppPct,
      amountPct
    };
  };

  // 业绩目标历史月份挂载结算逻辑
  useEffect(() => {
    if (targets.length === 0) return;
    
    const autoSettleHistoricTargets = async () => {
      const historicActive = targets.filter(t => t.month < currentMonth && t.status === 'ACTIVE');
      if (historicActive.length === 0) return;

      await db.transaction('rw', db.targets, async () => {
        for (const tgt of historicActive) {
          const prog = getTargetProgress(tgt);
          const isAchieved = prog.leadPct >= 100 && prog.oppPct >= 100 && prog.amountPct >= 100;
          const finalStatus = isAchieved ? 'ACHIEVED' : 'UNACHIEVED';
          const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

          await db.targets.update(tgt.id, {
            status: finalStatus,
            lockedLeadCount: prog.actualLead,
            lockedOppCount: prog.actualOpp,
            lockedAmount: prog.actualAmount,
            updatedAt: nowStr
          });
        }
      });
      showToast('系统已自动结算并锁定历史月份的未结业绩目标', 'success');
    };

    autoSettleHistoricTargets();
  }, [targets, leads, opps]);

  // 3. 计算当月全团队汇总数据
  const currentMonthTargets = targets.filter(t => t.month === currentMonth);
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

  const totalLeadPct = totalLeadTarget > 0 ? Math.min(100, Math.round((totalLeadActual / totalLeadTarget) * 100)) : 0;
  const totalOppPct = totalOppTarget > 0 ? Math.min(100, Math.round((totalOppActual / totalOppTarget) * 100)) : 0;
  const totalAmountPct = totalAmountTarget > 0 ? Math.min(100, Math.round((totalAmountActual / totalAmountTarget) * 100)) : 0;

  // 4. 月底归档结算锁定逻辑
  const handleLockTarget = async () => {
    if (!lockTargetId) return;
    const tgt = await db.targets.get(lockTargetId);
    if (!tgt) return;

    const prog = getTargetProgress(tgt);
    const isAchieved = prog.leadPct >= 100 && prog.oppPct >= 100 && prog.amountPct >= 100;
    const finalStatus = isAchieved ? 'ACHIEVED' : 'UNACHIEVED';

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

    await db.targets.update(lockTargetId, {
      status: finalStatus,
      lockedLeadCount: prog.actualLead,
      lockedOppCount: prog.actualOpp,
      lockedAmount: prog.actualAmount,
      updatedAt: nowStr
    });

    setLockTargetId(null);
    showToast(`业绩目标已锁定！最终判定状态：[${getStatusLabel(finalStatus)}]`);
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

      {/* 头部标题区 */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-slate-900">业绩目标</h1>
          <p className="text-xs text-slate-500">设定并监控销售代表月度业绩达成指标，终态锁定防数据漂移，达成率采用多阶配色提示。</p>
        </div>
        <Button 
          size="sm"
          onClick={() => navigate('/targets/new')}
        >
          <Plus size={14} className="mr-1" />
          <span>制定目标</span>
        </Button>
      </div>

      {/* 当月目标总览卡片 */}
      <Card>
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
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">目标编号</TableHead>
              <TableHead className="w-[110px]">销售代表</TableHead>
              <TableHead className="w-[90px]">目标月份</TableHead>
              <TableHead className="w-[180px]">线索转化进度</TableHead>
              <TableHead className="w-[180px]">新增商机进度</TableHead>
              <TableHead className="w-[200px]">赢单金额进度</TableHead>
              <TableHead className="w-[100px]">状态</TableHead>
              <TableHead className="text-right w-[110px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {targets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-slate-400">
                  尚未录入任何业绩目标数据
                </TableCell>
              </TableRow>
            ) : (
              targets.map(tgt => {
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
                    <TableCell className="text-right">
                      {tgt.status === 'ACTIVE' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLockTargetId(tgt.id)}
                          className="h-7 px-2 text-xs text-blue-600 font-medium"
                        >
                          <Lock size={12} className="mr-0.5" />
                          <span>月终结算</span>
                        </Button>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">🔒 数据已封存</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* 结算锁定 Dialog */}
      <Dialog open={!!lockTargetId} onOpenChange={(open) => !open && setLockTargetId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-blue-600">
              <Trophy size={18} />
              <span>业绩结算与快照锁定</span>
            </DialogTitle>
          </DialogHeader>
          <div className="text-xs text-slate-600 leading-relaxed space-y-2 pt-2">
            <p>您正在对该销售本月的业绩目标执行<strong>归档结算与快照锁定</strong>。</p>
            <p className="bg-slate-50 p-2.5 rounded-md border border-slate-200 text-slate-500 italic">
              锁定后，系统将捕获当前的实时线索转化数、商机个数、赢单总额写入快照字段，防止未来销售数据变动造成报表漂移，状态变更为终态。
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setLockTargetId(null)}
            >
              取消
            </Button>
            <Button 
              size="sm"
              onClick={handleLockTarget}
            >
              确认锁定归档
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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

const CURRENT_USER = '张三';

// 七阶段定义
const STAGES = [
  { id: 'INITIAL_CONTACT', label: '初步接触', badgeVariant: 'secondary' as const },
  { id: 'NEEDS_CONFIRM', label: '需求确认', badgeVariant: 'info' as const },
  { id: 'PROPOSAL', label: '方案报价', badgeVariant: 'warning' as const },
  { id: 'NEGOTIATION', label: '商务谈判', badgeVariant: 'purple' as const },
  { id: 'CONTRACT', label: '合同签订', badgeVariant: 'info' as const },
  { id: 'WON', label: '赢单', badgeVariant: 'success' as const },
  { id: 'LOST', label: '输单', badgeVariant: 'destructive' as const },
];

const getStageLabel = (stage: string) => {
  const found = STAGES.find(s => s.id === stage);
  return found ? found.label : stage;
};

const getStageBadge = (stage: string) => {
  const found = STAGES.find(s => s.id === stage);
  return <Badge variant={found ? found.badgeVariant : 'secondary'}>{getStageLabel(stage)}</Badge>;
};

const getProbabilityBadge = (prob: number) => {
  if (prob >= 70) return <Badge variant="success" className="font-mono">{prob}%</Badge>;
  if (prob >= 40) return <Badge variant="warning" className="font-mono">{prob}%</Badge>;
  return <Badge variant="destructive" className="font-mono">{prob}%</Badge>;
};

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
  const [lostModalOppId, setLostModalOppId] = useState<string | null>(null);
  const [lostReason, setLostReason] = useState('');
  const [contractModalOppId, setContractModalOppId] = useState<string | null>(null);
  const [contractNoInput, setContractNoInput] = useState('');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 2. 从数据库实时订阅商机与合同
  const allOpps = useLiveQuery(() => db.opportunities.toArray()) || [];
  const allContracts = useLiveQuery(() => db.contracts.toArray()) || [];

  // 3. 校验函数
  const checkTransitionPreconditions = (opp: Opportunity, targetStage: string): { allowed: boolean; reason?: string } => {
    const hasActiveContract = allContracts.some(c => c.oppId === opp.id && ['PENDING_SIGN', 'SIGNED', 'ARCHIVED'].includes(c.status));
    if (hasActiveContract) {
      return { allowed: false, reason: '关联合同签署中,商机不可操作' };
    }

    if (opp.status === 'WON' || opp.status === 'LOST') {
      return { allowed: false, reason: '终态 (赢单/输单) 商机不可再流转或回退' };
    }

    if (targetStage === 'LOST') {
      return { allowed: true };
    }

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
    const additionalData: Partial<Opportunity> = { ...customParams };
    if (targetStage === 'WON') {
      console.log(`[ERP Push] 自动向 ERP 下推销售订单草稿: OPP=${opp.id}, 客户=${opp.customerName}, 金额=${opp.amount}`);
      showToast(`商机已赢单！ERP 销售订单草稿已生成并下推`, 'success');
    }

    await db.transaction('rw', db.opportunities, db.opportunity_follow_ups, async () => {
      await db.opportunities.update(oppId, {
        status: targetStage as any,
        updatedAt: nowStr,
        ...additionalData
      });
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

  // 看板拖拽处理器
  const handleDragStart = (e: React.DragEvent, oppId: string) => {
    e.dataTransfer.setData('text/plain', oppId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
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

  // 数据过滤与排序
  const filteredOpps = allOpps.filter(opp => {
    if (viewMode === 'LIST') {
      if (listActiveTab === 'ONGOING' && ['WON', 'LOST'].includes(opp.status)) return false;
      if (listActiveTab === 'WON' && opp.status !== 'WON') return false;
      if (listActiveTab === 'LOST' && opp.status !== 'LOST') return false;
    }

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
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const getGroupedOpps = (stageId: string) => {
    return filteredOpps.filter(o => o.status === stageId);
  };

  const handleLostConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lostModalOppId || !lostReason.trim()) return;
    await executeTransition(lostModalOppId, 'LOST', { lostReason: lostReason.trim() });
    setLostModalOppId(null);
    setLostReason('');
  };

  const handleContractConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractModalOppId || !contractNoInput.trim()) return;
    await executeTransition(contractModalOppId, 'CONTRACT', { contractNo: contractNoInput.trim() });
    setContractModalOppId(null);
    setContractNoInput('');
  };

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
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800">
          {toastMessage.type === 'success' ? <CheckCircle size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-500" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 头部导航及操作 */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-slate-900">商机管理</h1>
          <p className="text-xs text-slate-500">跟踪客户的采购意向与成交概率，驱动漏斗流转并同步生成 ERP 订单。</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-md border border-slate-200 p-0.5 bg-slate-50">
            <button
              type="button"
              onClick={() => setViewMode('KANBAN')}
              className={`p-1.5 rounded text-slate-500 transition-colors cursor-pointer ${viewMode === 'KANBAN' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-slate-800'}`}
              title="看板视图"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('LIST')}
              className={`p-1.5 rounded text-slate-500 transition-colors cursor-pointer ${viewMode === 'LIST' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-slate-800'}`}
              title="列表视图"
            >
              <List size={15} />
            </button>
          </div>

          <Button 
            size="sm"
            onClick={() => navigate('/opportunities/new')}
          >
            <Plus size={14} className="mr-1" />
            <span>新建商机</span>
          </Button>
        </div>
      </div>

      {/* 筛选与搜索区 */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Input 
              placeholder="搜索商机名称、客户公司、ID..." 
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="pl-8 text-xs h-9"
            />
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          </div>
          <div>
            <select 
              value={filterStage} 
              onChange={(e) => setFilterStage(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">阶段(全部)</option>
              {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex justify-between items-center gap-2">
            <select 
              value={filterOwner} 
              onChange={(e) => setFilterOwner(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">创建人(全部)</option>
              <option value="张三">张三</option>
              <option value="李四">李四</option>
            </select>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchKeyword('');
                setFilterStage('');
                setFilterOwner('');
              }}
              className="shrink-0 text-xs"
            >
              重置
            </Button>
          </div>
        </CardContent>
      </Card>

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
                className="bg-slate-50/80 border border-slate-200 rounded-lg p-2.5 min-w-[200px] flex flex-col gap-2 min-h-[400px] transition-colors hover:bg-slate-100/60"
              >
                {/* 看板列头 */}
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 text-xs font-semibold text-slate-700">
                  <span className="truncate">{stage.label}</span>
                  <Badge variant="secondary" className="h-4 px-1.5 font-mono text-[10px]">{list.length}</Badge>
                </div>

                {/* 看板卡片列表 */}
                <div className="flex flex-col gap-2 flex-1">
                  {list.map(opp => (
                    <Card
                      key={opp.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, opp.id)}
                      onClick={() => navigate(`/opportunities/${opp.id}`)}
                      className="p-3 shadow-xs hover:shadow hover:border-blue-300 transition-all cursor-pointer space-y-2 group"
                    >
                      <h4 className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 line-clamp-1">{opp.title}</h4>
                      <div className="text-[11px] text-slate-500 font-medium">{opp.customerName}</div>
                      
                      <div className="flex justify-between items-center pt-1 text-xs">
                        <span className="font-mono font-semibold text-slate-700">{formatCurrency(opp.amount)}</span>
                        {getProbabilityBadge(opp.score)}
                      </div>

                      {opp.dealDate && (
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <Clock size={10} />
                          <span>预计: {opp.dealDate}</span>
                        </div>
                      )}
                    </Card>
                  ))}

                  {list.length === 0 && (
                    <div className="text-center py-10 text-[11px] text-slate-400 italic">
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
                    className={`pb-2.5 text-xs font-semibold transition-all relative cursor-pointer ${
                      active ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {active && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 表格卡片 */}
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>商机编号</TableHead>
                  <TableHead>商机名称</TableHead>
                  <TableHead>客户名称</TableHead>
                  <TableHead>预计金额</TableHead>
                  <TableHead>商机阶段</TableHead>
                  <TableHead>AI成交概率</TableHead>
                  <TableHead>预计成交日期</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOpps.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-slate-400">
                      暂无符合条件的商机数据
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOpps.map(opp => (
                    <TableRow key={opp.id}>
                      <TableCell>
                        <span 
                          className="font-mono font-medium text-blue-600 cursor-pointer hover:underline"
                          onClick={() => navigate(`/opportunities/${opp.id}`)}
                        >
                          {opp.id}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">{opp.title}</TableCell>
                      <TableCell className="text-slate-700">{opp.customerName}</TableCell>
                      <TableCell className="font-mono font-medium text-slate-800">{formatCurrency(opp.amount)}</TableCell>
                      <TableCell>{getStageBadge(opp.status)}</TableCell>
                      <TableCell>{getProbabilityBadge(opp.score)}</TableCell>
                      <TableCell className="font-mono text-slate-500">{opp.dealDate || '—'}</TableCell>
                      <TableCell className="font-mono text-slate-400 text-[11px]">{opp.createdAt.substring(2, 16)}</TableCell>
                      <TableCell className="text-right space-x-1.5">
                        {['INITIAL_CONTACT', 'NEEDS_CONFIRM', 'PROPOSAL'].includes(opp.status) && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/opportunities/${opp.id}`)} className="h-7 px-2 text-xs">查看</Button>
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/opportunities/${opp.id}/edit`)} className="h-7 px-2 text-xs text-blue-600">编辑</Button>
                            <Button variant="ghost" size="sm" onClick={() => handleRowAdvance(opp)} className="h-7 px-2 text-xs text-emerald-600">推进</Button>
                            <Button variant="ghost" size="sm" onClick={() => { setLostModalOppId(opp.id); setLostReason(''); }} className="h-7 px-2 text-xs text-red-600">输单</Button>
                          </>
                        )}

                        {opp.status === 'NEGOTIATION' && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/opportunities/${opp.id}`)} className="h-7 px-2 text-xs">查看</Button>
                            <Button variant="ghost" size="sm" onClick={() => handleRowAdvance(opp)} className="h-7 px-2 text-xs text-emerald-600">推进</Button>
                            <Button variant="ghost" size="sm" onClick={() => { setLostModalOppId(opp.id); setLostReason(''); }} className="h-7 px-2 text-xs text-red-600">输单</Button>
                          </>
                        )}

                        {opp.status === 'CONTRACT' && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/opportunities/${opp.id}`)} className="h-7 px-2 text-xs">查看</Button>
                            <Button variant="ghost" size="sm" onClick={() => handleRowAdvance(opp)} className="h-7 px-2 text-xs text-emerald-600">赢单</Button>
                            <Button variant="ghost" size="sm" onClick={() => { setLostModalOppId(opp.id); setLostReason(''); }} className="h-7 px-2 text-xs text-red-600">输单</Button>
                          </>
                        )}

                        {['WON', 'LOST'].includes(opp.status) && (
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/opportunities/${opp.id}`)} className="h-7 px-2 text-xs">查看</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* 输单原因 Dialog */}
      <Dialog open={!!lostModalOppId} onOpenChange={(open) => !open && setLostModalOppId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-1.5 text-red-600">
              <AlertTriangle size={16} />
              <span>确认商机输单</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLostConfirm} className="space-y-4 pt-2">
            <p className="text-xs text-slate-500">商机流转为 LOST 后将无法回退，请填写丢单/输单原因（必填）：</p>
            <Textarea
              required
              rows={3}
              placeholder="请输入输单原因（例如：价格劣势较大、客户需求不满足、竞争对手特批特价等）..."
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
            />
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setLostModalOppId(null); setLostReason(''); }}
              >
                取消
              </Button>
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                disabled={!lostReason.trim()}
              >
                确认输单
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 启动在线合同 Dialog */}
      <Dialog open={!!contractModalOppId} onOpenChange={(open) => !open && setContractModalOppId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-1.5 text-blue-600">
              <FileText size={16} />
              <span>启动在线合同流程</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleContractConfirm} className="space-y-4 pt-2">
            <p className="text-xs text-slate-500">系统将为该商机创建在线签署流程，请录入拟定的合同草案编号（系统已自动预分配）：</p>
            <Input
              type="text"
              required
              value={contractNoInput}
              onChange={(e) => setContractNoInput(e.target.value)}
            />
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setContractModalOppId(null); setContractNoInput(''); }}
              >
                取消
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!contractNoInput.trim()}
              >
                启动并进入合同阶段
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

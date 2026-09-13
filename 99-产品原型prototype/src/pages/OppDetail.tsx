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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { CURRENT_USER, calculateOpportunityScore, shanghaiNow } from '@/domain/businessRules';
import { createContractFromOpportunity } from '@/domain/opportunityActions';

const CURRENT_USER_NAME = CURRENT_USER.name;

// 七阶段定义
const STAGES = [
  { id: 'INITIAL_CONTACT', label: '初步接触', badgeVariant: 'secondary' as const },
  { id: 'NEEDS_CONFIRM', label: '需求确认', badgeVariant: 'info' as const },
  { id: 'PROPOSAL', label: '方案报价', badgeVariant: 'warning' as const },
  { id: 'NEGOTIATION', label: '商务谈判', badgeVariant: 'purple' as const },
  { id: 'CONTRACT', label: '合同签订', badgeVariant: 'info' as const },
  { id: 'WON', label: '赢单', badgeVariant: 'success' as const },
  { id: 'LOST', label: '输单', badgeVariant: 'destructive' as const }
];

const getStageLabel = (stage: string) => {
  const found = STAGES.find(s => s.id === stage);
  return found ? found.label : stage;
};

const getStageBadge = (stage: string) => {
  const found = STAGES.find(s => s.id === stage);
  return <Badge variant={found ? found.badgeVariant : 'secondary'}>{getStageLabel(stage)}</Badge>;
};

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
  const contracts = useLiveQuery(() => 
    db.contracts.where('oppId').equals(id || '').toArray()
  ) || [];

  // Modals 控制
  const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
  const [isAbandonModalOpen, setIsAbandonModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);

  // 输入表单状态
  const [followType, setFollowType] = useState('电话');
  const [followContent, setFollowContent] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    if (location.state && opp) {
      const state = location.state as any;
      if (state.openFollowModal) {
        setIsFollowModalOpen(true);
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

  // 2. 状态机流转校验
  const checkTransition = (targetStage: string): { allowed: boolean; reason?: string } => {
    const hasActiveContract = contracts.some(c => c.status !== 'VOIDED');
    if (hasActiveContract) {
      return { allowed: false, reason: '关联合同签署中,商机不可操作' };
    }

    if (opp.status === 'WON' || opp.status === 'LOST') {
      return { allowed: false, reason: '该商机已结案，无法修改状态' };
    }

    if (targetStage === 'LOST') return { allowed: true };

    if (targetStage === 'WON') {
      return { allowed: false, reason: '赢单只能由已验签的合同签署完成事件触发，商机页不可手工操作' };
    }

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

    return { allowed: true };
  };

  const executeTransition = async (targetStage: string, customParams: Partial<Opportunity> = {}) => {
    if (targetStage === 'WON') {
      showToast('赢单只能由合同签署完成事件触发', 'error');
      return;
    }
    const nowStr = shanghaiNow();
    const additionalData = { ...customParams };
    const customer = await db.customers.get(opp.customerId);

    await db.transaction('rw', db.opportunities, db.opportunity_follow_ups, async () => {
      await db.opportunities.update(opp.id, {
        status: targetStage as any,
        score: calculateOpportunityScore({
          customerLevel: customer?.level,
          customerRisk: customer?.riskLevel,
          followUpCount: followUps.length,
          items: opp.items,
          status: targetStage as Opportunity['status'],
        }),
        updatedAt: nowStr,
        version: (opp.version || 0) + 1,
        ...additionalData
      });

      await db.opportunity_follow_ups.add({
        oppId: opp.id,
        time: nowStr,
        operator: CURRENT_USER_NAME,
        type: targetStage === 'LOST' ? '电话' : '邮件',
        content: targetStage === 'LOST'
          ? `商机输单结案。输单原因：${additionalData.lostReason}`
          : `商机阶段推进：由「${getStageLabel(opp.status)}」进入「${getStageLabel(targetStage)}」阶段。`
      });
    });

    showToast(`阶段已推进至「${getStageLabel(targetStage)}」`);
  };

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
      setIsContractModalOpen(true);
      return;
    }

    executeTransition(targetStage);
  };

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followContent.trim()) return;

    const nowStr = shanghaiNow();
    const customer = await db.customers.get(opp.customerId);
    await db.transaction('rw', db.opportunities, db.opportunity_follow_ups, async () => {
      await db.opportunity_follow_ups.add({
        oppId: opp.id,
        time: nowStr,
        operator: CURRENT_USER_NAME,
        type: followType,
        content: followContent.trim()
      });
      await db.opportunities.update(opp.id, {
        score: calculateOpportunityScore({
          customerLevel: customer?.level,
          customerRisk: customer?.riskLevel,
          followUpCount: followUps.length + 1,
          items: opp.items,
          status: opp.status,
        }),
        updatedAt: nowStr,
        version: (opp.version || 0) + 1,
      });
    });

    setIsFollowModalOpen(false);
    setFollowContent('');
    showToast('跟进记录添加成功');
  };

  const handleLostConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lostReason.trim()) return;
    await executeTransition('LOST', { lostReason: lostReason.trim() });
    setIsAbandonModalOpen(false);
    setLostReason('');
  };

  const handleContractConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const contract = await createContractFromOpportunity(opp.id, CURRENT_USER_NAME);
      setIsContractModalOpen(false);
      showToast(`合同 ${contract.id} 已创建并绑定，商机进入合同签订阶段`);
      navigate(`/contracts/${contract.id}/edit`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '合同创建失败', 'error');
    }
  };

  const getTimelineNodeClass = (stageId: string) => {
    const order = ['INITIAL_CONTACT', 'NEEDS_CONFIRM', 'PROPOSAL', 'NEGOTIATION', 'CONTRACT', 'WON', 'LOST'];
    const currentIdx = order.indexOf(opp.status);
    const nodeIdx = order.indexOf(stageId);

    if (opp.status === 'LOST') {
      if (stageId === 'LOST') return 'bg-red-500 text-white border-red-500 ring-2 ring-red-200';
      if (nodeIdx < order.indexOf('CONTRACT') + 1) return 'bg-slate-200 text-slate-500 border-slate-300';
      return 'bg-white text-slate-300 border-slate-200';
    }

    if (stageId === 'LOST') return 'bg-white text-slate-300 border-slate-200';

    if (nodeIdx < currentIdx) {
      return 'bg-blue-600 text-white border-blue-600';
    }
    if (nodeIdx === currentIdx) {
      return 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-100';
    }
    return 'bg-white text-slate-400 border-slate-200';
  };

  return (
    <div className="space-y-4 pb-24">
      {/* 顶部 Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800">
          {toastMessage.type === 'success' ? <CheckCircle size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-500" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 导航面包屑 */}
      <div className="flex items-center gap-3" data-anno="opportunity-detail-page-header">
        <Button 
          variant="outline"
          size="icon"
          onClick={() => navigate('/opportunities')}
          className="h-8 w-8"
        >
          <ChevronLeft size={16} />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-slate-900">{opp.title}</h1>
          <p className="text-xs text-slate-500">商机编号: {opp.id} · 创建于 {opp.createdAt}</p>
        </div>
      </div>

      {/* 状态区 Banner */}
      <Card data-anno="opportunity-detail-status-summary">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {getStageBadge(opp.status)}
            <div className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
              <TrendingUp size={14} className="text-blue-600" />
              <span>AI 成交预测概率：<strong className="text-slate-900">{opp.score}%</strong></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 阶段时间线 */}
      <Card data-anno="opportunity-detail-stage-timeline">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            {STAGES.map((s, idx) => {
              const isLast = idx === STAGES.length - 1;
              const nodeClass = getTimelineNodeClass(s.id);
              return (
                <React.Fragment key={s.id}>
                  <div className="flex items-center gap-2 flex-1">
                    <div className={`h-6 w-6 rounded-full border flex items-center justify-center font-semibold font-mono text-[10px] shrink-0 ${nodeClass}`}>
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <span className="font-medium text-slate-800 truncate block">{s.label}</span>
                    </div>
                  </div>
                  {!isLast && (
                    <div className="hidden md:block h-px bg-slate-200 flex-1 mx-2" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* 基本信息卡片 */}
          <Card data-anno="opportunity-detail-basic-info">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-sm font-semibold">基本信息</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                {[
                  { label: '商机名称', val: opp.title },
                  { label: '关联客户', val: opp.customerName },
                  { label: '预计金额 (元)', val: formatCurrency(opp.amount), mono: true },
                  { label: '预计成交日期', val: opp.dealDate || '—', mono: true }
                ].map((field, idx) => (
                  <div key={idx} className="space-y-1">
                    <span className="text-[10px] text-slate-400 block font-medium">{field.label}</span>
                    <span className={`text-slate-700 font-semibold block ${field.mono ? 'font-mono' : ''}`}>{field.val}</span>
                  </div>
                ))}
                
                {['CONTRACT', 'WON'].includes(opp.status) && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-purple-600 block font-semibold">合同编号</span>
                    <span className="text-purple-700 font-mono font-bold block">{opp.contractNo || '签署中(无合同号)'}</span>
                  </div>
                )}

                <div className="col-span-2 md:col-span-4 space-y-1">
                  <span className="text-[10px] text-slate-400 block font-medium">需求描述</span>
                  <p className="text-slate-650 bg-slate-50 border border-slate-100 p-2.5 rounded-md text-xs leading-relaxed">
                    {opp.desc || '暂无详细描述需求（从“初步接触”推进到“需求确认”时必填）。'}
                  </p>
                </div>

                {opp.status === 'LOST' && opp.lostReason && (
                  <div className="col-span-2 md:col-span-4 space-y-1">
                    <span className="text-[10px] text-red-500 block font-semibold">输单/丢单原因</span>
                    <p className="text-red-700 bg-red-50 border border-red-100 p-2.5 rounded-md text-xs leading-relaxed font-semibold">
                      {opp.lostReason}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 商品明细表 (仅在 NEEDS_CONFIRM 及以上阶段展示) */}
          {opp.status !== 'INITIAL_CONTACT' && (
            <Card data-anno="opportunity-detail-product-items">
              <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center gap-1.5">
                <ShoppingCart size={15} className="text-blue-600" />
                <CardTitle className="text-sm font-semibold">关联商品明细</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>商品编码</TableHead>
                      <TableHead>商品名称</TableHead>
                      <TableHead>单价</TableHead>
                      <TableHead>数量</TableHead>
                      <TableHead className="text-right">小计</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!opp.items || opp.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-slate-400 italic">
                          暂未关联商品 (推进到方案报价前请通过编辑补充商品)
                        </TableCell>
                      </TableRow>
                    ) : (
                      opp.items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono">{item.productCode}</TableCell>
                          <TableCell className="font-medium text-slate-900">{item.productName}</TableCell>
                          <TableCell className="font-mono text-slate-600">{formatCurrency(item.price)}</TableCell>
                          <TableCell className="font-mono">{item.quantity}</TableCell>
                          <TableCell className="font-mono font-medium text-slate-900 text-right">
                            {formatCurrency(item.price * item.quantity)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧跟进记录时间线 */}
        <Card className="flex flex-col" data-anno="opportunity-detail-follow-up">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
            <CardTitle className="text-sm font-semibold">推进与跟进历史</CardTitle>
            {!['WON', 'LOST'].includes(opp.status) && (
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => setIsFollowModalOpen(true)}
                className="h-7 px-2 text-xs text-blue-600 font-semibold"
              >
                <Plus size={14} className="mr-0.5" />
                <span>添加跟进</span>
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-4 flex-1">
            <div className="overflow-y-auto max-h-[360px] pr-1 space-y-3 relative pl-4 border-l border-slate-200">
              {followUps.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  暂无推进和跟进活动
                </div>
              ) : (
                followUps
                  .sort((a, b) => b.time.localeCompare(a.time))
                  .map((record) => (
                    <div key={record.id} className="relative">
                      <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-blue-600 bg-white" />
                      <div className="bg-slate-50/75 border border-slate-200 rounded-md p-3 space-y-1">
                        <div className="flex justify-between items-center text-xs text-slate-400">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">{record.operator}</span>
                            <Badge variant="secondary" className="text-[10px] h-4 px-1">{record.type}</Badge>
                          </div>
                          <span className="font-mono text-[10px]">{record.time.substring(5, 16)}</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed break-all">{record.content}</p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 固定底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 py-3.5 px-6 shadow-sm flex justify-end gap-2 lg:pl-[220px]" data-anno="opportunity-detail-action-bar">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/opportunities')}
        >
          返回列表
        </Button>

        {['INITIAL_CONTACT', 'NEEDS_CONFIRM'].includes(opp.status) && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAbandonModalOpen(true)}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              判定输单
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/opportunities/${opp.id}/edit`)}
            >
              编辑信息
            </Button>
            <Button
              size="sm"
              onClick={handleAdvance}
            >
              推进至下一步
            </Button>
          </>
        )}

        {opp.status === 'PROPOSAL' && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAbandonModalOpen(true)}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              报价未通过(输单)
            </Button>
            <Button
              size="sm"
              onClick={handleAdvance}
            >
              发送报价(商务谈判)
            </Button>
          </>
        )}

        {opp.status === 'NEGOTIATION' && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAbandonModalOpen(true)}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              谈判破裂(输单)
            </Button>
            <Button
              size="sm"
              onClick={handleAdvance}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              推进(启动在线合同)
            </Button>
          </>
        )}

        {opp.status === 'CONTRACT' && (
          <Button
            size="sm"
            onClick={() => opp.contractNo && navigate(`/contracts/${opp.contractNo}`)}
            disabled={!opp.contractNo}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            查看合同（签署事件驱动赢单）
          </Button>
        )}
      </div>

      {/* 添加跟进记录 Dialog */}
      <Dialog open={isFollowModalOpen} onOpenChange={(open) => setIsFollowModalOpen(open)}>
        <DialogContent className="max-w-md" data-anno="opportunity-detail-follow-modal">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-1">
              <Clock size={16} className="text-blue-600" />
              <span>添加跟进沟通</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddFollowUp} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="followType" className="block mb-2">跟进方式 <span className="text-red-500">*</span></Label>
              <select
                id="followType"
                value={followType}
                onChange={(e) => setFollowType(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="电话">电话</option>
                <option value="拜访">拜访</option>
                <option value="邮件">邮件</option>
              </select>
            </div>

            <div>
              <Label htmlFor="followContent" className="block mb-2">沟通纪要 <span className="text-red-500">*</span></Label>
              <Textarea
                id="followContent"
                required
                rows={4}
                placeholder="记录详细的报价谈判情况、技术集成细节..."
                value={followContent}
                onChange={(e) => setFollowContent(e.target.value)}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setIsFollowModalOpen(false); setFollowContent(''); }}
              >
                取消
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!followContent.trim()}
              >
                保存纪要
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 输单原因 Dialog */}
      <Dialog open={isAbandonModalOpen} onOpenChange={(open) => setIsAbandonModalOpen(open)}>
        <DialogContent className="max-w-md" data-anno="opportunity-detail-lost-modal">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-1.5 text-red-600">
              <AlertTriangle size={16} />
              <span>确认商机输单</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLostConfirm} className="space-y-4 pt-2">
            <p className="text-xs text-slate-500">商机置为输单状态后将无法撤销，请输入丢单/输单的复盘原因（必填）：</p>
            <Textarea
              required
              rows={3}
              placeholder="请描述原因（例如：价格被友商击穿30%，无法配给等）..."
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
            />
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setIsAbandonModalOpen(false); setLostReason(''); }}
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
      <Dialog open={isContractModalOpen} onOpenChange={(open) => setIsContractModalOpen(open)}>
        <DialogContent className="max-w-md" data-anno="opportunity-detail-contract-modal">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-1.5 text-purple-600">
              <FileText size={16} />
              <span>启动在线合同流程</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleContractConfirm} className="space-y-4 pt-2">
            <p className="text-xs text-slate-500">系统将原子创建真实合同草稿并绑定当前商机；创建成功后商机才进入“合同签订”。合同编号由系统生成，不能手工录入。</p>
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsContractModalOpen(false)}
              >
                取消
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                创建合同并进入合同阶段
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

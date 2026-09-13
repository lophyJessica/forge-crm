import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Customer, type FollowUpRecord } from '../db';
import { addCustomerToErp, type ErpCustomer } from '../api/erpSync';
import { 
  ChevronLeft, 
  User, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CURRENT_USER,
  calculateLeadScore,
  getLeadRouting,
  getPublicPoolEligibility,
  shanghaiNow,
} from '@/domain/businessRules';

const CURRENT_USER_NAME = CURRENT_USER.name;

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

// 跟进记录卡片展开折叠子组件
function FollowUpItem({ record }: { record: FollowUpRecord }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongText = record.content.length > 100;

  return (
    <Card className="p-3.5 space-y-2 bg-slate-50/50">
      <div className="flex justify-between items-center text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">{record.operator}</span>
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
            {record.type}
          </Badge>
        </div>
        <span className="text-slate-400 font-mono text-[10px]">{record.time}</span>
      </div>
      <p className={`text-xs text-slate-600 leading-relaxed break-all ${!isExpanded && isLongText ? 'line-clamp-3' : ''}`}>
        {record.content}
      </p>
      {isLongText && (
        <Button 
          variant="link"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-auto p-0 text-[11px] text-blue-600 font-medium"
        >
          {isExpanded ? '收起跟进记录' : '展开全部跟进'}
        </Button>
      )}
      {record.nextPlan && (
        <div className="text-[11px] bg-blue-50/60 border border-blue-100 p-2 rounded text-blue-700 font-medium">
          下次跟进计划：{record.nextPlan}
        </div>
      )}
    </Card>
  );
}

export default function LeadDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();

  // 1. 获取本地数据库状态
  const lead = useLiveQuery(() => db.leads.get(id || '')) || null;
  const followUps = useLiveQuery(() => 
    db.follow_up_records.where('leadId').equals(id || '').toArray()
  ) || [];

  // UI 折叠与 Modal 状态
  const [isScoreDetailOpen, setIsScoreDetailOpen] = useState(false);
  const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
  const [isAbandonModalOpen, setIsAbandonModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // 表单状态
  const [followType, setFollowType] = useState('电话');
  const [followContent, setFollowContent] = useState('');
  const [followNextPlan, setFollowNextPlan] = useState('');
  const [abandonReason, setAbandonReason] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 监听从路由跳转带来的外部触发
  useEffect(() => {
    if (location.state) {
      const state = location.state as any;
      if (state.openFollowModal) {
        setIsFollowModalOpen(true);
      }
      if (state.triggerConvert) {
        setIsConvertModalOpen(true);
      }
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate, location.pathname]);

  if (!lead) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        线索加载中或该线索不存在...
      </div>
    );
  }

  // 认领线索
  const handleClaim = async () => {
    if (!window.confirm('确认认领该公海线索并开始 48 小时首次跟进计时？')) return;
    try {
      const nowStr = shanghaiNow();
      await db.transaction('rw', db.leads, db.follow_up_records, async () => {
        const current = await db.leads.get(lead.id);
        if (!current) throw new Error('线索不存在或已被其他人处理');
        const eligibility = getPublicPoolEligibility(current, CURRENT_USER_NAME);
        if (!eligibility.claimable) throw new Error(eligibility.reason || '该线索当前不可认领');
        await db.leads.update(lead.id, {
          status: 'ASSIGNED',
          owner: CURRENT_USER_NAME,
          assignedAt: nowStr,
          poolType: undefined,
          claimRequestId: `CLAIM-${lead.id}-${Date.now()}`,
          version: (current.version || 0) + 1,
        });
        await db.follow_up_records.add({
          leadId: lead.id,
          time: nowStr,
          operator: CURRENT_USER_NAME,
          type: '系统记录',
          content: `销售 [${CURRENT_USER_NAME}] 从公海认领了该线索。`,
        });
      });
      showToast('线索认领成功，请在 48 小时内完成首次跟进');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '线索认领失败', 'error');
    }
  };

  // 添加跟进记录
  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followContent.trim()) return;

    const nowStr = shanghaiNow();
    const nextStatus = lead.status === 'ASSIGNED' ? 'FOLLOWING' : lead.status;

    await db.transaction('rw', db.leads, db.follow_up_records, async () => {
      await db.follow_up_records.add({
        leadId: lead.id,
        time: nowStr,
        operator: CURRENT_USER_NAME,
        type: followType,
        content: followContent.trim(),
        nextPlan: followNextPlan.trim() || undefined
      });
      await db.leads.update(lead.id, {
        status: nextStatus,
        followedAt: nowStr,
        version: (lead.version || 0) + 1,
      });
    });

    setIsFollowModalOpen(false);
    setFollowContent('');
    setFollowNextPlan('');
    showToast('跟进记录已成功添加');
  };

  // 放弃线索
  const handleAbandon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (abandonReason.trim().length < 15) return;

    const nowStr = shanghaiNow();
    await db.transaction('rw', db.leads, db.follow_up_records, async () => {
      await db.leads.update(lead.id, {
        status: 'ABANDONED',
        voidType: 'VOLUNTARY_ABANDON',
        abandonedReason: abandonReason.trim(),
        abandonedAt: nowStr,
        assignedAt: undefined,
        version: (lead.version || 0) + 1,
      });
      await db.follow_up_records.add({
        leadId: lead.id,
        time: nowStr,
        operator: CURRENT_USER_NAME,
        type: '系统记录',
        content: `销售主动放弃线索；原负责人 7 天内不可重新认领。原因：${abandonReason.trim()}`,
      });
    });

    setIsAbandonModalOpen(false);
    setAbandonReason('');
    showToast('线索已退回公海');
  };

  // 转为客户（CRM→ERP 同步）
  const handleConvertToCustomer = async () => {
    if (lead.status !== 'FOLLOWING') {
      showToast('只有跟进中的线索可以转为客户', 'error');
      return;
    }
    const nowStr = shanghaiNow();
    const customerCode = `CUST-${Date.now()}`;
    const erpCustomer: ErpCustomer = {
      id: customerCode,
      code: customerCode,
      name: lead.company,
      contact: lead.contact || '',
      phone: lead.phone || '',
      priceLevel: '一级',
      creditLimit: 0,
      paymentPeriod: 30,
      status: 'active',
      remark: `由 CRM 线索 ${lead.id} 转化`
    };

    try {
      await addCustomerToErp(erpCustomer);

      const customerSnapshot: Customer = {
        id: customerCode,
        erpCustomerId: customerCode,
        name: erpCustomer.name,
        contact: erpCustomer.contact,
        phone: erpCustomer.phone,
        email: lead.email || '',
        industry: lead.industry || 'OTHER',
        region: lead.region || '',
        level: 'C',
        creditLimit: erpCustomer.creditLimit,
        riskLevel: 'LOW',
        owner: CURRENT_USER_NAME,
        createdAt: nowStr,
        lifecycleStatus: 'ACTIVE',
        syncStatus: 'AVAILABLE',
        sourceVersion: '1',
        sourceEventId: `ERP-CUSTOMER-CREATED-${customerCode}`,
        syncedAt: nowStr,
        creditStatus: 'NORMAL',
      };

      await db.transaction('rw', db.customers, db.leads, db.follow_up_records, async () => {
        await db.customers.put(customerSnapshot);
        await db.leads.update(lead.id, {
          status: 'CONVERTED',
          convertedAt: nowStr,
          convertedById: CURRENT_USER.id,
          convertedToCustomerId: customerCode,
          version: (lead.version || 0) + 1,
        });

        await db.follow_up_records.add({
          leadId: lead.id,
          time: nowStr,
          operator: CURRENT_USER_NAME,
          type: '系统记录',
          content: `ERP 已完成客户建档，CRM 已生成可追溯快照 ${customerCode}。`,
        });
      });

      setIsConvertModalOpen(false);
      showToast('ERP 建档成功，CRM 客户快照已生成');
    } catch (err: any) {
      console.error(err);
      setIsConvertModalOpen(false);
      showToast(`转客户失败：${err?.message || err}`, 'error');
    }
  };

  // 作废草稿（保留原记录）
  const handleDeleteDraft = async () => {
    if (lead.status !== 'DRAFT') return;
    const nowStr = shanghaiNow();
    await db.transaction('rw', db.leads, db.follow_up_records, async () => {
      await db.leads.update(lead.id, {
        status: 'ABANDONED',
        voidType: 'DRAFT_VOID',
        abandonedAt: nowStr,
        abandonedReason: '创建人作废草稿',
        version: (lead.version || 0) + 1,
      });
      await db.follow_up_records.add({
        leadId: lead.id,
        time: nowStr,
        operator: CURRENT_USER_NAME,
        type: '系统记录',
        content: '创建人作废了草稿线索，原始记录已保留。',
      });
    });
    setIsDeleteModalOpen(false);
    showToast('草稿已作废，历史记录已保留');
    setTimeout(() => navigate('/leads'), 1500);
  };

  // 提交草稿
  const handleSubmitDraft = async () => {
    const nowStr = shanghaiNow();
    if (!lead.phone && !lead.email) {
      showToast('无法提交：手机号和邮箱必须至少填写一个，请先编辑补充信息', 'error');
      return;
    }

    const score = calculateLeadScore(
      { source: lead.source, industry: lead.industry, createdAt: lead.createdAt, followedAt: lead.followedAt },
      { responseHours: 0.5, historicalConversionRate: 0.5, lastActivityAt: nowStr },
    );
    const routing = getLeadRouting(score);

    await db.leads.update(lead.id, {
      status: routing.status,
      score,
      owner: routing.owner,
      assignedAt: routing.status === 'ASSIGNED' ? nowStr : undefined,
      poolType: routing.poolType,
      version: (lead.version || 0) + 1,
    });

    if (routing.status === 'ASSIGNED') {
      await db.follow_up_records.add({
        leadId: lead.id,
        time: nowStr,
        operator: 'AI 自动引擎',
        type: '邮件',
        content: `AI 评分完成：${score}分（≥80分触发自动派单）。已自动分配给最优销售 ${CURRENT_USER_NAME}。`
      });
    }

    showToast(`线索提交成功，AI 评分: ${score}分`);
  };

  const publicPoolEligibility = getPublicPoolEligibility(lead, CURRENT_USER_NAME);
  const isHighseas = publicPoolEligibility.visible;

  return (
    <div className="space-y-4 pb-24">
      {/* 顶部 Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800">
          {toastMessage.type === 'success' ? <CheckCircle size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-500" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 头部导航 */}
      <div className="flex items-center gap-3" data-anno="lead-detail-page-header">
        <Button 
          variant="outline"
          size="icon"
          onClick={() => navigate('/leads')}
          className="h-8 w-8"
        >
          <ChevronLeft size={16} />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-slate-900">{lead.company}</h1>
          <p className="text-xs text-slate-500">线索编号: {lead.id} · 创建于 {lead.createdAt}</p>
        </div>
      </div>

      {/* 状态 Banner 卡片 */}
      <Card data-anno="lead-detail-status-owner">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {getStatusBadge(lead.status)}
            {lead.owner ? (
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <User size={14} className="text-blue-600" />
                <span>负责人：<strong className="text-slate-800">{lead.owner}</strong></span>
                {lead.assignedAt && <span className="text-[11px] text-slate-400">({lead.assignedAt} 分配)</span>}
              </div>
            ) : (
              <span className="text-xs text-slate-400 font-medium">暂无负责人</span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* AI 评分折叠卡片 */}
          <Card data-anno="lead-detail-ai-score">
            <CardContent className="p-4 space-y-3">
              <button
                type="button"
                onClick={() => setIsScoreDetailOpen(!isScoreDetailOpen)}
                className="flex w-full items-center justify-between text-xs font-semibold text-slate-800 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span>AI 评分依据</span>
                  <Badge variant={lead.score >= 80 ? 'success' : lead.score >= 50 ? 'warning' : 'destructive'} className="font-mono">
                    {lead.score}分
                  </Badge>
                </div>
                {isScoreDetailOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {isScoreDetailOpen && (
                <div className="pt-3 border-t border-slate-100 grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                  {[
                    { label: '渠道来源（最高15）', val: lead.source },
                    { label: '行业匹配（最高20）', val: lead.industry || 'OTHER' },
                    { label: '响应速度（最高25）', val: lead.followedAt ? '已首响' : '提交时评估' },
                    { label: '历史转化（最高25）', val: '组织历史基线' },
                    { label: '近期活跃（最高15）', val: lead.followedAt || lead.createdAt }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-100 p-2 rounded-md">
                      <span className="text-[10px] text-slate-400 block font-medium">{item.label}</span>
                      <strong className="text-sm font-semibold text-slate-800 block mt-1 font-mono">{item.val}</strong>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 基本信息卡片 */}
          <Card data-anno="lead-detail-basic-info">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-sm font-semibold">基本信息</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                {[
                  { label: '线索来源', val: lead.source === 'ONLINE' ? '官网' : lead.source === 'ACTIVITY' ? '线下活动' : lead.source === 'EXHIBITION' ? '展会' : lead.source === 'REFERRAL' ? '转介绍' : lead.source === 'IMPORT' ? '批量导入' : '其他' },
                  { label: '公司名称', val: lead.company },
                  { label: '主要联系人', val: lead.contact || '—' },
                  { label: '联系电话', val: lead.phone || '—', mono: true },
                  { label: '邮箱地址', val: lead.email || '—', mono: true },
                  { label: '联系人职位', val: lead.position || '—' },
                  { label: '所属行业', val: lead.industry === 'IT' ? '信息技术' : lead.industry === 'MANUFACTURING' ? '制造业' : lead.industry === 'RETAIL' ? '零售' : lead.industry === 'FINANCE' ? '金融' : lead.industry === 'HEALTHCARE' ? '医疗' : '其他' },
                  { label: '所在地区', val: lead.region || '—' }
                ].map((field, idx) => (
                  <div key={idx} className="space-y-1">
                    <span className="text-[10px] text-slate-400 block font-medium">{field.label}</span>
                    <span className={`text-slate-700 font-semibold block ${field.mono ? 'font-mono' : ''}`}>{field.val}</span>
                  </div>
                ))}
                <div className="col-span-2 md:col-span-4 space-y-1">
                  <span className="text-[10px] text-slate-400 block font-medium">线索备注</span>
                  <p className="text-slate-650 bg-slate-50 border border-slate-100 p-2.5 rounded-md text-xs leading-relaxed">{lead.remark || '暂无备注信息。'}</p>
                </div>
                {lead.status === 'ABANDONED' && lead.abandonedReason && (
                  <div className="col-span-2 md:col-span-4 space-y-1">
                    <span className="text-[10px] text-red-500 block font-semibold">放弃/作废原因</span>
                    <p className="text-red-700 bg-red-50 border border-red-100 p-2.5 rounded-md text-xs leading-relaxed font-semibold">{lead.abandonedReason}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧跟进记录 */}
        <Card className="flex flex-col" data-anno="lead-detail-follow-up">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
            <CardTitle className="text-sm font-semibold">跟进记录</CardTitle>
            {['ASSIGNED', 'FOLLOWING'].includes(lead.status) && (
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
                  暂无跟进记录
                </div>
              ) : (
                followUps
                  .sort((a, b) => b.time.localeCompare(a.time))
                  .map((record) => (
                    <div key={record.id} className="relative">
                      <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-blue-600 bg-white" />
                      <FollowUpItem record={record} />
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 固定底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 py-3.5 px-6 shadow-sm flex justify-end gap-2 lg:pl-[220px]" data-anno="lead-detail-action-bar">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/leads')}
        >
          返回列表
        </Button>

        {lead.status === 'DRAFT' && (
          <>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
            >
              作废
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/leads/${lead.id}/edit`)}
            >
              编辑信息
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitDraft}
            >
              提交线索
            </Button>
          </>
        )}

        {isHighseas && (
          <Button
            size="sm"
            onClick={handleClaim}
            disabled={!publicPoolEligibility.claimable}
            title={publicPoolEligibility.reason}
          >
            {publicPoolEligibility.claimable ? '认领线索' : '原负责人保护期中'}
          </Button>
        )}

        {lead.status === 'ASSIGNED' && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAbandonModalOpen(true)}
              className="text-amber-600 border-amber-200 hover:bg-amber-50"
            >
              放弃线索
            </Button>
            <Button
              size="sm"
              onClick={() => setIsFollowModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              添加首次跟进
            </Button>
          </>
        )}

        {lead.status === 'FOLLOWING' && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAbandonModalOpen(true)}
              className="text-amber-600 border-amber-200 hover:bg-amber-50"
            >
              放弃线索
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFollowModalOpen(true)}
            >
              再次跟进
            </Button>
            <Button
              size="sm"
              onClick={() => setIsConvertModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              转为正式客户
            </Button>
          </>
        )}

        {lead.status === 'CONVERTED' && (
          <Button
            size="sm"
            onClick={() => navigate(lead.convertedToCustomerId ? `/customers/${lead.convertedToCustomerId}` : '/customers')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            查看 CRM 客户快照
          </Button>
        )}
      </div>

      {/* 添加跟进记录 Dialog */}
      <Dialog open={isFollowModalOpen} onOpenChange={(open) => setIsFollowModalOpen(open)}>
        <DialogContent className="max-w-md" data-anno="lead-detail-follow-up-modal">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Clock size={16} className="text-emerald-600" />
              <span>添加跟进记录</span>
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
              <Label htmlFor="followContent" className="block mb-2">跟进内容 <span className="text-red-500">*</span></Label>
              <Textarea
                id="followContent"
                required
                rows={4}
                placeholder="请输入详细的沟通内容，客户的最新痛点或诉求..."
                value={followContent}
                onChange={(e) => setFollowContent(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="followNextPlan" className="block mb-2">下次跟进计划 <span className="text-slate-400 font-normal">(选填)</span></Label>
              <Input
                id="followNextPlan"
                placeholder="如：下周一下发报价单草案"
                value={followNextPlan}
                onChange={(e) => setFollowNextPlan(e.target.value)}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsFollowModalOpen(false);
                  setFollowContent('');
                  setFollowNextPlan('');
                }}
              >
                取消
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!followContent.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                提交记录
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 放弃原因 Dialog */}
      <Dialog open={isAbandonModalOpen} onOpenChange={(open) => setIsAbandonModalOpen(open)}>
        <DialogContent className="max-w-md" data-anno="lead-detail-abandon-modal">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-1.5 text-amber-600">
              <AlertTriangle size={16} />
              <span>确认放弃线索</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAbandon} className="space-y-4 pt-2">
            <p className="text-xs text-slate-500">放弃后进入公海：原负责人 7 天内不可重新认领，其他销售可立即认领。请填写至少15个字的原因：</p>
            <Textarea
              required
              rows={3}
              placeholder="请详细描述放弃原因（如：竞品低价介入、组织架构调整预算冻结等）..."
              value={abandonReason}
              onChange={(e) => setAbandonReason(e.target.value)}
            />
            <p className="text-[11px] text-slate-400">已输入 {abandonReason.trim().length}/15 字</p>
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAbandonModalOpen(false);
                  setAbandonReason('');
                }}
              >
                取消
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={abandonReason.trim().length < 15}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                确认放弃
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 转客户确认 Dialog */}
      <Dialog open={isConvertModalOpen} onOpenChange={(open) => setIsConvertModalOpen(open)}>
        <DialogContent className="max-w-sm" data-anno="lead-detail-convert-modal">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-1.5 text-purple-600">
              <CheckCircle size={16} />
              <span>确认转为正式客户</span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500 leading-relaxed">
            确认将公司 <strong className="text-slate-800">「{lead.company}」</strong> 转为正式客户？转客户后将在 CRM 生成快照并同步通知 ERP 建档，操作不可逆。
          </p>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsConvertModalOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConvertToCustomer}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              确认转客户
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 作废草稿 Dialog */}
      <Dialog open={isDeleteModalOpen} onOpenChange={(open) => setIsDeleteModalOpen(open)}>
        <DialogContent className="max-w-sm" data-anno="lead-detail-draft-void-modal">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-1.5 text-red-600">
              <AlertTriangle size={16} />
              <span>确认作废草稿</span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500 leading-relaxed">
            作废后原记录与跟进历史仍会保留，并进入“已作废”状态。确认继续？
          </p>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteDraft}
            >
              确认作废
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

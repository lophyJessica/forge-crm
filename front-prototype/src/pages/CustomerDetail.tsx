import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { 
  ChevronLeft, 
  AlertTriangle, 
  TrendingUp, 
  ShoppingCart,
  Plus,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const INDUSTRY_MAP: Record<string, string> = {
  MANUFACTURING: '制造业',
  RETAIL: '零售与电商',
  HEALTHCARE: '医疗健康',
  FINANCE: '金融与信托',
  IT: '信息技术',
  OTHER: '其他行业'
};

const getStageBadge = (stage: string) => {
  switch (stage) {
    case 'INITIAL_CONTACT': return <Badge variant="secondary">初步接触</Badge>;
    case 'NEEDS_CONFIRM': return <Badge variant="info">需求确认</Badge>;
    case 'PROPOSAL': return <Badge variant="warning">方案报价</Badge>;
    case 'NEGOTIATION': return <Badge variant="purple">商务谈判</Badge>;
    case 'CONTRACT': return <Badge variant="info">合同签订</Badge>;
    case 'WON': return <Badge variant="success">赢单</Badge>;
    case 'LOST': return <Badge variant="destructive">输单</Badge>;
    default: return <Badge variant="outline">{stage}</Badge>;
  }
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

export default function CustomerDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. 实时读取该客户、商机、订单、跟进与线索
  const customer = useLiveQuery(() => db.customers.get(id || '')) || null;
  const opportunities = useLiveQuery(async () => {
    const snapshot = await db.customers.get(id || '');
    if (!snapshot) return [];
    return db.opportunities.filter(item =>
      item.customerId === snapshot.id || Boolean(snapshot.erpCustomerId && item.erpCustomerId === snapshot.erpCustomerId)
    ).toArray();
  }, [id]) || [];
  const leads = useLiveQuery(() => db.leads.toArray()) || [];
  const leadFollows = useLiveQuery(() => db.follow_up_records.toArray()) || [];
  const oppFollows = useLiveQuery(() => db.opportunity_follow_ups.toArray()) || [];

  if (!customer) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        客户快照资料加载中，或该客户不存在...
      </div>
    );
  }

  // 2. 聚合历史跟进记录
  const matchingLeads = leads.filter(l => l.convertedToCustomerId === customer.id);
  
  const currentLeadFollowRecords = leadFollows
    .filter(f => matchingLeads.some(l => l.id === f.leadId))
    .map(f => {
      const parentLead = matchingLeads.find(l => l.id === f.leadId);
      return {
        id: `LEAD-${f.id || `${f.leadId}-${f.time}`}`,
        time: f.time,
        operator: f.operator,
        type: '线索跟进',
        sourceName: parentLead ? `线索 ID: ${parentLead.id}` : '线索转化',
        content: f.content
      };
    });

  const currentOppFollowRecords = oppFollows
    .filter(f => opportunities.some(o => o.id === f.oppId))
    .map(f => {
      const parentOpp = opportunities.find(o => o.id === f.oppId);
      return {
        id: `OPP-${f.id || `${f.oppId}-${f.time}`}`,
        time: f.time,
        operator: f.operator,
        type: '商机跟进',
        sourceName: parentOpp ? `商机: ${parentOpp.title}` : '商机谈判',
        content: f.content
      };
    });

  const aggregatedFollows = [...currentLeadFollowRecords, ...currentOppFollowRecords]
    .sort((a, b) => b.time.localeCompare(a.time));
  const isCustomerAvailable = customer.lifecycleStatus === 'ACTIVE' && customer.syncStatus === 'AVAILABLE';
  const hasOngoingOpportunity = opportunities.some(item => !['WON', 'LOST'].includes(item.status));
  const latestFollowAt = aggregatedFollows[0]?.time;
  const daysSinceLastFollow = latestFollowAt
    ? (Date.now() - new Date(latestFollowAt.replace(' ', 'T')).getTime()) / 86_400_000
    : Number.POSITIVE_INFINITY;
  const shouldWarnChurn = customer.riskLevel === 'HIGH' && hasOngoingOpportunity && daysSinceLastFollow > 30;

  return (
    <div className="space-y-4 pb-24">
      {/* 顶部 Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800">
          {toastMessage.type === 'success' ? <CheckCircle size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-500" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* AI 流失预警 Banner */}
      {!isCustomerAvailable && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="font-medium text-xs">
            客户快照当前为“{customer.lifecycleStatus === 'DISABLED' ? '已停用' : customer.syncStatus}”，禁止新建商机、拜访或跟进；历史信息仍可只读查看。
          </AlertDescription>
        </Alert>
      )}

      {shouldWarnChurn && (
        <Alert variant="destructive" data-anno="customer-detail-risk-banner">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="font-medium text-xs">
            流失预警：该客户超过 30 天未跟进且仍有进行中商机。请安排跟进；是否冻结 ERP 信用须由独立通知及回执决定，风险等级本身不等于已冻结。
          </AlertDescription>
        </Alert>
      )}

      {/* 顶部面包屑与导航 */}
      <div className="flex items-center gap-3" data-anno="customer-detail-page-header">
        <Button 
          variant="outline"
          size="icon"
          onClick={() => navigate('/customers')}
          className="h-8 w-8"
        >
          <ChevronLeft size={16} />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-slate-900">{customer.name}</h1>
          <p className="text-xs text-slate-500">CRM 客户编号: {customer.id} · ERP 客户编号: {customer.erpCustomerId || '待同步'} · 快照版本: {customer.sourceVersion || '—'}</p>
        </div>
      </div>

      {/* 快照卡片 */}
      <Card data-anno="customer-detail-erp-snapshot">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="text-sm font-semibold">CRM 客户快照（来源：ERP）</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {[
              { label: '公司名称', val: customer.name },
              { label: '首要联系人', val: customer.contact || '—' },
              { label: '联系电话', val: customer.phone || '—', mono: true },
              { label: '电子邮箱', val: customer.email || '—', mono: true },
              { label: '所属行业', val: INDUSTRY_MAP[customer.industry] || customer.industry || '—' },
              { label: '所在地区', val: customer.region || '—' },
              { label: '客户等级', val: `${customer.level || 'A'} 等级` },
              { label: '信用额度 (元)', val: formatCurrency(customer.creditLimit), mono: true },
            ].map((field, idx) => (
              <div key={idx} className="space-y-1">
                <span className="text-[10px] text-slate-400 block font-medium">{field.label}</span>
                <span className={`text-slate-700 font-semibold block ${field.mono ? 'font-mono' : ''}`}>{field.val}</span>
              </div>
            ))}
            <div className="space-y-1" data-anno="customer-detail-erp-sync-status">
              <span className="text-[10px] text-slate-400 block font-medium">ERP信用状态（独立回执）</span>
              <div>
                <Badge variant={customer.creditStatus === 'FROZEN' ? 'destructive' : customer.creditStatus === 'NORMAL' ? 'success' : 'outline'}>
                  {customer.creditStatus === 'FROZEN' ? '冻结' : customer.creditStatus === 'NORMAL' ? '正常' : '未知'}
                </Badge>
              </div>
            </div>
            <div className="col-span-2 md:col-span-4 bg-slate-50 border border-slate-100 p-2.5 rounded-md text-xs text-slate-500">
              💡 本卡片由 ERP 权威管控同步。CRM 不提供任何客户主属性的直接修改和编辑入口。
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* 左侧关联卡片组 (商机 + 订单) */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* 关联商机卡片 */}
          <Card data-anno="customer-detail-opportunities">
            <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-900">
                <TrendingUp size={15} className="text-blue-600" />
                <CardTitle className="text-sm font-semibold">关联商机 ({opportunities.length})</CardTitle>
              </div>
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (!isCustomerAvailable) {
                    showToast('客户已停用或快照不可用，禁止新建商机', 'error');
                    return;
                  }
                  navigate('/opportunities/new', { state: { defaultCustomerId: customer.id } });
                }}
                disabled={!isCustomerAvailable}
                title={!isCustomerAvailable ? '客户已停用或快照不可用' : undefined}
                className="h-7 px-2 text-xs text-blue-600 font-semibold"
              >
                <Plus size={14} className="mr-0.5" />
                <span>新建商机</span>
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商机编号</TableHead>
                    <TableHead>商机名称</TableHead>
                    <TableHead>当前阶段</TableHead>
                    <TableHead>预计金额</TableHead>
                    <TableHead>AI 概率</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opportunities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-slate-400 italic">
                        暂无关联商机，点击右上角新建商机启动业务推进。
                      </TableCell>
                    </TableRow>
                  ) : (
                    opportunities.map(opp => (
                      <TableRow 
                        key={opp.id} 
                        className="cursor-pointer"
                        onClick={() => navigate(`/opportunities/${opp.id}`)}
                      >
                        <TableCell className="font-mono font-medium text-blue-600">{opp.id}</TableCell>
                        <TableCell className="font-medium text-slate-900">{opp.title}</TableCell>
                        <TableCell>{getStageBadge(opp.status)}</TableCell>
                        <TableCell className="font-mono text-slate-700">{formatCurrency(opp.amount)}</TableCell>
                        <TableCell>{getProbabilityBadge(opp.score)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 关联订单卡片 */}
          <Card data-anno="customer-detail-erp-orders">
            <CardHeader className="border-b border-slate-100 pb-3">
              <div className="flex items-center gap-1.5 text-slate-900">
                <ShoppingCart size={15} className="text-blue-600" />
                <CardTitle className="text-sm font-semibold">ERP 销售订单快照</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="py-8 text-center text-xs text-slate-500">
              ERP 销售订单同步契约尚未接入，当前不展示 CRM 本地 Mock 订单，也不提供伪造的外部跳转。
            </CardContent>
          </Card>
        </div>

        {/* 右侧聚合跟进记录时间线 */}
        <Card className="flex flex-col" data-anno="customer-detail-follow-up">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-sm font-semibold">CRM 聚合跟进时间线</CardTitle>
          </CardHeader>

          <CardContent className="pt-4 flex-1">
            <div className="overflow-y-auto max-h-[480px] pr-1 space-y-3 relative pl-4 border-l border-slate-200">
              {aggregatedFollows.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs italic">
                  该客户暂无历史跟进沟通记录。
                </div>
              ) : (
                aggregatedFollows.map((record) => (
                  <div key={record.id} className="relative">
                    <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-blue-600 bg-white" />
                    <div className="bg-slate-50/75 border border-slate-200 rounded-md p-3 space-y-1">
                      <div className="flex justify-between items-center text-xs text-slate-400">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-700">{record.operator}</span>
                          <Badge variant={record.type === '商机跟进' ? 'warning' : 'info'} className="text-[10px] h-4 px-1">
                            {record.type}
                          </Badge>
                        </div>
                        <span className="font-mono text-[10px]">{record.time.substring(2, 16)}</span>
                      </div>
                      <div className="text-[11px] text-blue-600 font-semibold truncate">
                        {record.sourceName}
                      </div>
                      <p className="text-xs text-slate-650 leading-relaxed break-all pt-0.5">{record.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 底部固定返回 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 py-3.5 px-6 shadow-sm flex justify-end gap-2 lg:pl-[220px]" data-anno="customer-detail-action-bar">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/customers')}
        >
          返回列表
        </Button>
      </div>
    </div>
  );
}

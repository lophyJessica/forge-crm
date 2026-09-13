import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ChevronLeft, AlertTriangle, CheckCircle, XCircle, FileText, TrendingUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CURRENT_USER } from '@/domain/businessRules';
import { archiveContract, receiveMockSignedEvent, submitContractForSigning, voidContract } from '@/domain/contractActions';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'DRAFT':
      return <Badge variant="secondary">草稿</Badge>;
    case 'PENDING_SIGN':
      return <Badge variant="info">待签署</Badge>;
    case 'SIGNED':
      return <Badge variant="success">已签署</Badge>;
    case 'ARCHIVED':
      return <Badge variant="purple">已归档</Badge>;
    case 'VOIDED':
      return <Badge variant="destructive">已作废</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const formatCurrency = (val?: number) => {
  if (val === undefined || val === null) return '—';
  return '¥' + val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function ContractDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [voidReasonModal, setVoidReasonModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [archiveReasonModal, setArchiveReasonModal] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. 实时读取合同详情、对应的商机和客户信息
  const contract = useLiveQuery(() => db.contracts.get(id || '')) || null;
  const opp = useLiveQuery(async () => {
    if (contract?.oppId) return await db.opportunities.get(contract.oppId);
    return null;
  }, [contract?.oppId]) || null;

  if (!contract) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        合同信息加载中，或该合同不存在...
      </div>
    );
  }

  // 2. 交互操作函数
  const handleSubmitSign = async () => {
    if (!window.confirm('确认合同信息完整，并提交外部签署流程？')) return;
    const result = await submitContractForSigning(contract.id);
    showToast(result.message, result.ok ? 'success' : 'error');
  };

  const handleSign = async () => {
    if (!window.confirm('仅用于 Demo：确认模拟接收一条“已验签”的外部签署完成事件？')) return;
    const result = await receiveMockSignedEvent(contract.id);
    showToast(result.message, result.ok ? 'success' : 'error');
  };

  const handleArchive = async () => {
    const result = await archiveContract(contract.id, CURRENT_USER.name, archiveReason);
    showToast(result.message, result.ok ? 'success' : 'error');
    if (result.ok) {
      setArchiveReasonModal(false);
      setArchiveReason('');
    }
  };

  const handleVoid = async () => {
    const result = await voidContract(contract.id, voidReason);
    showToast(result.message, result.ok ? 'success' : 'error');
    if (result.ok) {
      setVoidReasonModal(false);
      setVoidReason('');
    }
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

      {/* 作废状态警示 Banner */}
      {contract.status === 'VOIDED' && (
        <Alert variant="destructive" data-anno="contract-detail-void-banner">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs font-medium">
            本合同已被作废归档。作废原因：{contract.voidReason || '未指定'}。关联商机已退回至商务谈判阶段并重新开放签署绑定。
          </AlertDescription>
        </Alert>
      )}

      {/* 顶部面包屑与导航 */}
      <div className="flex items-center gap-3" data-anno="contract-detail-page-header">
        <Button 
          variant="outline"
          size="icon"
          onClick={() => navigate('/contracts')}
          className="h-8 w-8"
        >
          <ChevronLeft size={16} />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-slate-900">{contract.title}</h1>
          <p className="text-xs text-slate-500">合同单号: {contract.id} · 创建于 {contract.createdAt}</p>
        </div>
      </div>

      {/* 状态与核心卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        
        {/* 左侧合同基本信息卡片 */}
        <div className="md:col-span-2 space-y-4">
          
          <Card data-anno="contract-detail-basic-info">
            <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-900">
                <FileText size={15} className="text-blue-600" />
                <CardTitle className="text-sm font-semibold">合同基础档案</CardTitle>
              </div>
              {getStatusBadge(contract.status)}
            </CardHeader>

            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">合同名称</span>
                  <span className="text-slate-800 font-semibold block">{contract.title}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">合同编号</span>
                  <span className="text-slate-800 font-mono font-semibold block">{contract.id}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">合同签约金额</span>
                  <span className="text-blue-600 font-mono font-bold block text-sm">{formatCurrency(contract.amount)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">签署生效日期</span>
                  <span className="text-slate-800 font-mono font-semibold block">{contract.signedDate || '未完成签署'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">创建人</span>
                  <span className="text-slate-700 font-semibold block">{contract.createdBy || '张三'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">创建时间</span>
                  <span className="text-slate-600 font-mono block">{contract.createdAt}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">商机联动</span>
                  <span className="text-slate-700 font-mono block">{contract.opportunitySyncStatus || 'NOT_TRIGGERED'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">ERP 订单联动</span>
                  <span className="text-slate-700 font-mono block">{contract.erpOrderSyncStatus || 'NOT_TRIGGERED'}</span>
                </div>
                {contract.syncError && (
                  <div className="col-span-2 rounded border border-amber-200 bg-amber-50 p-2 text-amber-700">
                    联动说明：{contract.syncError}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 联动对象信息卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* 关联商机卡片 */}
            <Card data-anno="contract-detail-opportunity">
              <CardHeader className="border-b border-slate-100 pb-2.5 flex flex-row items-center gap-1.5 text-slate-900">
                <TrendingUp size={14} className="text-blue-600" />
                <CardTitle className="text-xs font-semibold">关联 CRM 商机</CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                {opp ? (
                  <div className="text-xs space-y-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">商机名称</span>
                      <span 
                        className="font-semibold text-blue-600 cursor-pointer hover:underline"
                        onClick={() => navigate(`/opportunities/${opp.id}`)}
                      >
                        {opp.title}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block">商机金额</span>
                        <span className="font-mono font-semibold text-slate-700">{formatCurrency(opp.amount)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">当前状态</span>
                        <span className="font-semibold text-slate-700">{opp.status}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">加载商机明细中...</p>
                )}
              </CardContent>
            </Card>

            {/* 关联客户卡片 */}
            <Card data-anno="contract-detail-customer">
              <CardHeader className="border-b border-slate-100 pb-2.5 flex flex-row items-center gap-1.5 text-slate-900">
                <Users size={14} className="text-blue-600" />
                <CardTitle className="text-xs font-semibold">关联正式客户</CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="text-xs space-y-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">客户公司</span>
                    <span 
                      className="font-semibold text-blue-600 cursor-pointer hover:underline"
                      onClick={() => navigate(`/customers/${contract.customerId}`)}
                    >
                      {contract.customerName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">客户编码</span>
                    <span className="font-mono text-slate-700 font-semibold">{contract.customerId}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

        </div>

        {/* 右侧电子合同演示区 */}
        <Card data-anno="contract-detail-signing-simulation">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-sm font-semibold">外部签署事件（Mock）</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="border border-slate-200 rounded-md p-4 h-64 bg-slate-50 flex flex-col justify-between items-center text-center relative overflow-hidden">
              <div className="absolute top-2.5 right-2.5 select-none font-bold text-2xl text-red-500/15 border-2 border-red-500/20 rounded-full px-3 py-1 rotate-12">
                {contract.status === 'SIGNED' || contract.status === 'ARCHIVED' ? '合同专用章' : ''}
                {contract.status === 'VOIDED' ? '作废注销章' : ''}
              </div>

              <div className="space-y-1">
                <FileText size={42} className="mx-auto text-slate-400" />
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Electronic Contract</p>
              </div>
              
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-slate-700">签署各方主体</p>
                <p className="text-[11px] text-slate-500">甲方：{contract.customerName}</p>
                <p className="text-[11px] text-slate-500">乙方：Forge (系统演示方)</p>
              </div>

              <div className="text-[11px] text-slate-500">
                {contract.status === 'DRAFT' && '📝 合同草稿，请提交以通知各方在线签署'}
                {contract.status === 'PENDING_SIGN' && '⏳ 已提交签署，等待外部已验签事件'}
                {(contract.status === 'SIGNED' || contract.status === 'ARCHIVED') && `✅ 双方已于 ${contract.signedDate} 在线签署生效`}
                {contract.status === 'VOIDED' && '❌ 该合同已作废归档，法律效力已解除'}
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* 底部固定操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 py-3.5 px-6 shadow-sm flex justify-end gap-2 lg:pl-[220px]" data-anno="contract-detail-action-bar">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/contracts')}
        >
          返回列表
        </Button>

        {contract.status === 'DRAFT' && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/contracts/${contract.id}/edit`)}
            >
              编辑合同
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitSign}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              提交签署
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setVoidReasonModal(true)}
            >
              作废合同
            </Button>
          </>
        )}

        {contract.status === 'PENDING_SIGN' && (
          <>
            <Button
              size="sm"
              onClick={handleSign}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              模拟接收签署完成事件
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setVoidReasonModal(true)}
            >
              作废合同
            </Button>
          </>
        )}

        {contract.status === 'SIGNED' && (
          <Button
            size="sm"
            onClick={() => setArchiveReasonModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            申请归档
          </Button>
        )}
      </div>

      {/* 作废原因确认 Dialog */}
      <Dialog open={voidReasonModal} onOpenChange={(open) => !open && setVoidReasonModal(false)}>
        <DialogContent className="max-w-sm" data-anno="contract-detail-void-dialog">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-red-600">
              <AlertTriangle size={18} />
              <span>作废合同确认</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            <p className="text-xs text-slate-500">
              请填写作废原因，此操作将解除商机强绑定并回退商机到商务谈判阶段：
            </p>
            <Textarea
              rows={3}
              placeholder="请输入详细的合同作废原因..."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
            />
            <p className="text-[11px] text-slate-400">至少10个字，已输入 {voidReason.trim().length}/10 字</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                setVoidReasonModal(false);
                setVoidReason('');
              }}
            >
              取消
            </Button>
            <Button 
              variant="destructive"
              size="sm"
              disabled={voidReason.trim().length < 10}
              onClick={handleVoid}
            >
              确认作废
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 归档前置条件确认 Dialog */}
      <Dialog open={archiveReasonModal} onOpenChange={(open) => {
        if (!open) {
          setArchiveReasonModal(false);
          setArchiveReason('');
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">申请合同归档</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500">只有商机联动和 ERP 订单联动均成功后才能归档。当前 ERP 串联未接入时会明确阻断。</p>
          <Textarea
            rows={3}
            placeholder="请输入归档原因"
            value={archiveReason}
            onChange={(event) => setArchiveReason(event.target.value)}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setArchiveReasonModal(false)}>取消</Button>
            <Button size="sm" disabled={!archiveReason.trim()} onClick={handleArchive}>校验并归档</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

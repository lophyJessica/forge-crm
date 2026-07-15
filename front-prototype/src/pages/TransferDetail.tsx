import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { damageApi } from '../api/damage';
import { inventoryOperationsApi } from '../api/inventoryOperations';
import { DamageStatus } from '../types/damage';
import { TRANSFER_STATUS_LABELS, TransferOrder, TransferStatus } from '../types/inventoryOperations';
import { Button } from '../components/ui/Button';
import PageHeader from '../components/shared/PageHeader';
import { ArrowRightLeft, Calendar, CheckCircle2, Edit, Send, XCircle } from 'lucide-react';

const currentUser: { role: 'supervisor' | 'operator' } = {
  role: 'supervisor',
};

const statusClasses: Record<TransferStatus, string> = {
  DRAFT: 'bg-zinc-100 text-zinc-800 border-zinc-200',
  PENDING_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
  CONFIRMED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  OUTBOUND: 'bg-orange-50 text-orange-700 border-orange-200',
  INBOUND: 'bg-blue-50 text-blue-700 border-blue-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  VOIDED: 'bg-rose-50 text-rose-700 border-rose-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function TransferDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [order, setOrder] = useState<TransferOrder | null>(null);
  const [blStatus, setBlStatus] = useState<DamageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const isSupervisor = currentUser.role === 'supervisor';

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const detail = await inventoryOperationsApi.getTransferById(id);
      setOrder(detail || null);
      const linkedDamage = detail?.blNo ? await damageApi.getDamageById(detail.blNo) : null;
      setBlStatus(linkedDamage?.status || null);
    } catch (err) {
      console.error(err);
      alert('加载调拨单详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleOutbound = async () => {
    if (!order) return;
    try {
      await inventoryOperationsApi.confirmTransferOutbound(order.id, 'WmsOperator01');
      await loadData();
      alert('调拨单已确认出库，调拨数量已转入在途');
    } catch (err: any) {
      alert(err.message || '确认出库失败');
    }
  };

  const handleInbound = async () => {
    if (!order) return;
    try {
      await inventoryOperationsApi.confirmTransferInbound(order.id, 'WmsOperator01');
      await loadData();
      alert('调拨单已确认入库，调入仓库存已更新');
    } catch (err: any) {
      alert(err.message || '确认入库失败');
    }
  };

  const handleSubmitForReview = async () => {
    if (!order || !window.confirm(`确定要提交调拨单 ${order.id} 进行审核吗？`)) return;
    try {
      await inventoryOperationsApi.submitTransferForReview(order.id, 'WmsOperator01');
      await loadData();
      alert('调拨单已成功提交审核');
    } catch (err: any) {
      alert(err.message || '提交审核失败');
    }
  };

  const handleApprove = async () => {
    if (!order || !window.confirm(`确定要审核通过调拨单 ${order.id} 吗？通过后才可确认出库。`)) return;
    try {
      await inventoryOperationsApi.approveTransfer(order.id, 'WmsOperator01');
      await loadData();
      alert('调拨单已审核通过');
    } catch (err: any) {
      alert(err.message || '审核失败');
    }
  };

  const handleReject = async () => {
    if (!order) return;
    const rejectedReason = window.prompt(`请输入驳回调拨单 ${order.id} 的原因`);
    if (rejectedReason === null) return;
    try {
      await inventoryOperationsApi.rejectTransfer(order.id, rejectedReason, 'WmsOperator01');
      await loadData();
      alert('调拨单已驳回，已回退为草稿态');
    } catch (err: any) {
      alert(err.message || '驳回失败');
    }
  };

  const handleApproveDamage = async () => {
    if (!order?.blNo || blStatus !== 'PENDING_REVIEW') return;
    if (!window.confirm(`确定要审核通过报损单 ${order.blNo} 吗？审核后将核销调拨差异待核销量并生成 FL，不重复扣减现存。`)) return;
    try {
      await damageApi.confirmDamage(order.blNo, 'WmsOperator01');
      await loadData();
      alert('报损单已审核通过，调拨差异已核销并生成库存流水 FL');
    } catch (err: any) {
      alert(err.message || '审核失败');
    }
  };

  const handleVoid = async () => {
    if (!order || !window.confirm(`确定要作废调拨单 ${order.id} 吗？`)) return;
    try {
      await inventoryOperationsApi.voidTransfer(order.id, 'WmsOperator01');
      await loadData();
      alert('调拨单已作废');
    } catch (err: any) {
      alert(err.message || '作废失败');
    }
  };

  if (loading) {
    return <div className="forge-state-panel">正在解析调拨单详情...</div>;
  }

  if (!order) {
    return <div className="forge-state-panel forge-state-panel--error">该调拨单不存在</div>;
  }

  const totalQty = order.items.reduce((sum, item) => sum + item.transferQty, 0);

  return (
    <div className="space-y-4 text-xs pb-8">
      <PageHeader
        onBack={() => navigate('/inventory/transfers')}
        title={<><span className="font-mono">{order.id}</span><span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusClasses[order.status] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>{TRANSFER_STATUS_LABELS[order.status] ?? order.status ?? '未知状态'}</span></>}
        description={<span className="font-mono">创建时间：{order.createdAt}</span>}
        actions={(
          <>
          {isSupervisor && order.blNo && blStatus === 'PENDING_REVIEW' && (
            <Button size="sm" onClick={handleApproveDamage} className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 font-bold">
              <CheckCircle2 size={14} />
              <span>审核差异BL</span>
            </Button>
          )}
          {order.status === 'DRAFT' && (
            <>
              <Button size="sm" onClick={() => navigate(`/inventory/transfers/${order.id}/edit`)} className="bg-primary hover:bg-primary/95 text-white flex items-center gap-1.5 font-bold">
                <Edit size={14} />
                <span>编辑</span>
              </Button>
              <Button size="sm" onClick={handleSubmitForReview} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 font-bold">
                <Send size={14} />
                <span>提交审核</span>
              </Button>
            </>
          )}
          {isSupervisor && order.status === 'PENDING_REVIEW' && (
            <>
              <Button variant="outline" size="sm" onClick={handleReject} className="text-amber-600 border-amber-200 hover:bg-amber-50 flex items-center gap-1.5 font-bold">
                <XCircle size={14} />
                <span>驳回</span>
              </Button>
              <Button size="sm" onClick={handleApprove} className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 font-bold">
                <CheckCircle2 size={14} />
                <span>通过</span>
              </Button>
            </>
          )}
          {(order.status === 'CONFIRMED' || order.status === 'OUTBOUND') && (
            <Button size="sm" onClick={() => navigate(`/inventory/transfers/${order.id}/edit`)} className="bg-primary hover:bg-primary/95 text-white flex items-center gap-1.5 font-bold">
              <Edit size={14} />
              <span>进入执行页</span>
            </Button>
          )}
          {order.status === 'DRAFT' && (
            <Button variant="outline" size="sm" onClick={handleVoid} className="text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1.5">
              <XCircle size={14} />
              <span>作废</span>
            </Button>
          )}
          </>
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <ArrowRightLeft size={16} className="text-primary" />
              <span>调拨商品明细</span>
            </h3>
            <div className="px-2 py-1 rounded border bg-slate-50 text-slate-700 border-slate-200 font-mono font-bold">
              调拨总数 {totalQty}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3">商品编码</th>
                  <th className="p-3">名称 / 规格</th>
                  <th className="p-3">单位</th>
                  <th className="p-3 text-right">建单时现存</th>
                  <th className="p-3 text-right">调拨数量</th>
                  <th className="p-3 text-right">入库数量</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {order.items.map((item, index) => (
                  <tr key={`${item.productCode}-${index}`} className="hover:bg-slate-50/50">
                    <td className="p-3 text-center text-slate-400 font-mono">{index + 1}</td>
                    <td className="p-3 font-mono font-semibold">{item.productCode}</td>
                    <td className="p-3">
                      <div>{item.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.productSpec}</div>
                    </td>
                    <td className="p-3">{item.unit}</td>
                    <td className="p-3 text-right font-mono text-slate-500">{item.availableQty}</td>
                    <td className="p-3 text-right font-mono font-bold text-orange-600 bg-orange-50/10">{item.transferQty}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-600">
                      {item.inboundQty ?? (order.status === 'COMPLETED' ? item.transferQty : 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">基础信息</h3>
            <div className="space-y-3">
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold">调出仓库</span>
                <span className="font-semibold text-slate-700">{order.outWarehouseName}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold">调入仓库</span>
                <span className="font-semibold text-slate-700">{order.inWarehouseName}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold">商品种数</span>
                <span className="font-mono font-bold text-slate-700">{order.itemCount}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold">关联报损单</span>
                {order.blNo ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/inventory/damages/${order.blNo}`)}
                    className="font-mono font-bold text-primary hover:underline cursor-pointer"
                  >
                    {order.blNo}
                  </button>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold">建单人</span>
                <span className="font-semibold text-slate-700">{order.createdBy}</span>
              </div>
	              <div className="flex justify-between gap-3">
	                <span className="text-slate-400 font-semibold flex items-center gap-1"><Calendar size={12} />更新时间</span>
	                <span className="font-mono text-slate-500">{order.updatedAt || '-'}</span>
	              </div>
	              {order.rejectedReason && (
	                <div className="flex justify-between gap-3">
	                  <span className="text-slate-400 font-semibold">驳回原因</span>
	                  <span className="font-semibold text-amber-700 text-right">{order.rejectedReason}</span>
	                </div>
	              )}
	            </div>
	          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-2">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">备注</h3>
            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{order.remark || '无备注'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

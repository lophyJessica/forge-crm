import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { damageApi } from '../api/damage';
import { DAMAGE_REASON_LABELS, DAMAGE_STATUS_LABELS, DamageOrder, DamageStatus } from '../types/damage';
import { Button } from '../components/ui/Button';
import PageHeader from '../components/shared/PageHeader';
import { AlertTriangle, Calendar, CheckCircle2, ClipboardX, Edit, XCircle, Send } from 'lucide-react';

const currentUser: { role: 'supervisor' | 'operator' } = {
  role: 'supervisor',
};

const statusClasses: Record<DamageStatus, string> = {
  DRAFT: 'bg-zinc-100 text-zinc-800 border-zinc-200',
  PENDING_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
  CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  VOIDED: 'bg-rose-50 text-rose-700 border-rose-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function DamageDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [order, setOrder] = useState<DamageOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const isSupervisor = currentUser.role === 'supervisor';

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const detail = await damageApi.getDamageById(id);
      setOrder(detail || null);
    } catch (err) {
      console.error(err);
      alert('加载报损单详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleConfirm = async () => {
    if (!order || !window.confirm(`确定要审核通过报损单 ${order.id} 吗？审核后将立即扣减现存并生成 FL 流水。`)) return;
    try {
      await damageApi.confirmDamage(order.id, 'WmsOperator01');
      await loadData();
      alert('报损单已审核通过，现存已扣减并生成库存流水 FL');
    } catch (err: any) {
      alert(err.message || '审核失败');
    }
  };

  const handleSubmitForReview = async () => {
    if (!order || !window.confirm(`确定要提交报损单 ${order.id} 进行审核吗？`)) return;
    try {
      await damageApi.submitDamageForReview(order.id, 'WmsOperator01');
      await loadData();
      alert('报损单已成功提交审核');
    } catch (err: any) {
      alert(err.message || '提交审核失败');
    }
  };

  const handleVoid = async () => {
    if (!order || !window.confirm(`确定要作废报损单 ${order.id} 吗？`)) return;
    try {
      await damageApi.voidDamage(order.id, 'WmsOperator01');
      await loadData();
      alert('报损单已作废');
    } catch (err: any) {
      alert(err.message || '作废失败');
    }
  };

  const handleReject = async () => {
    if (!order) return;
    const rejectedReason = window.prompt(`请输入驳回报损单 ${order.id} 的原因`);
    if (rejectedReason === null) return;
    try {
      await damageApi.rejectDamage(order.id, rejectedReason, 'WmsOperator01');
      await loadData();
      alert('报损单已驳回，已回退为草稿态');
    } catch (err: any) {
      alert(err.message || '驳回失败');
    }
  };

  if (loading) {
    return <div className="forge-state-panel">正在解析报损单详情...</div>;
  }

  if (!order) {
    return <div className="forge-state-panel forge-state-panel--error">该报损单不存在</div>;
  }

  return (
    <div className="space-y-4 text-xs pb-8">
      <PageHeader
        onBack={() => navigate('/inventory/damages')}
        title={<><span className="font-mono">{order.id}</span><span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusClasses[order.status] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>{DAMAGE_STATUS_LABELS[order.status] ?? order.status ?? '未知状态'}</span></>}
        description={<span className="font-mono">创建时间：{order.createdAt}</span>}
        actions={order.status === 'DRAFT' ? (
          <>
            <Button size="sm" onClick={() => navigate(`/inventory/damages/${order.id}/edit`)} className="bg-primary hover:bg-primary/95 text-white flex items-center gap-1.5 font-bold"><Edit size={14} /><span>编辑</span></Button>
            <Button variant="outline" size="sm" onClick={handleVoid} className="text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1.5"><XCircle size={14} /><span>作废</span></Button>
            <Button size="sm" onClick={handleSubmitForReview} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 font-bold"><Send size={14} /><span>提交审核</span></Button>
          </>
        ) : order.status === 'PENDING_REVIEW' ? (
          <>
            <Button variant="outline" size="sm" onClick={handleVoid} className="text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1.5"><XCircle size={14} /><span>作废</span></Button>
            {isSupervisor && <><Button variant="outline" size="sm" onClick={handleReject} className="text-amber-600 border-amber-200 hover:bg-amber-50 flex items-center gap-1.5 font-bold"><XCircle size={14} /><span>驳回</span></Button><Button size="sm" onClick={handleConfirm} className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 font-bold"><CheckCircle2 size={14} /><span>审核通过</span></Button></>}
          </>
        ) : undefined}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <ClipboardX size={16} className="text-red-500" />
              <span>报损商品明细</span>
            </h3>
            <div className="px-2 py-1 rounded border bg-red-50 text-red-700 border-red-100 font-mono font-bold">
              报损总数 {order.totalQty}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3">商品编码</th>
                  <th className="p-3">名称</th>
                  <th className="p-3">规格</th>
                  <th className="p-3">单位</th>
                  <th className="p-3 text-right">建单时现存</th>
                  <th className="p-3 text-right">报损数量</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {order.items.map((item, index) => (
                  <tr key={`${item.productCode}-${index}`} className="hover:bg-slate-50/50">
                    <td className="p-3 text-center text-slate-400 font-mono">{index + 1}</td>
                    <td className="p-3 font-mono font-semibold">{item.productCode}</td>
                    <td className="p-3">{item.productName}</td>
                    <td className="p-3 font-mono text-slate-400">{item.productSpec}</td>
                    <td className="p-3">{item.unit}</td>
                    <td className="p-3 text-right font-mono text-slate-500">{item.currentQty}</td>
                    <td className="p-3 text-right font-mono font-bold text-red-600 bg-red-50/10">{item.damageQty}</td>
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
                <span className="text-slate-400 font-semibold">仓库</span>
                <span className="font-semibold text-slate-700">{order.warehouseName}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold">报损原因</span>
                <span className="font-semibold text-amber-700 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  {DAMAGE_REASON_LABELS[order.reason] ?? order.reason ?? '未知原因'}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold">商品种数</span>
                <span className="font-mono font-bold text-slate-700">{order.itemCount}</span>
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

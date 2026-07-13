import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { inventoryOperationsApi } from '../api/inventoryOperations';
import { TRANSFER_STATUS_LABELS, TransferOrder, TransferStatus } from '../types/inventoryOperations';
import { Button } from '../components/ui/Button';
import { ArrowDownToLine, ArrowLeft, ArrowRightLeft, ArrowUpFromLine, Calendar, Edit, XCircle } from 'lucide-react';

const statusClasses: Record<TransferStatus, string> = {
  DRAFT: 'bg-zinc-100 text-zinc-800 border-zinc-200',
  OUTBOUND: 'bg-orange-50 text-orange-700 border-orange-200',
  INBOUND: 'bg-blue-50 text-blue-700 border-blue-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  VOIDED: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function TransferDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [order, setOrder] = useState<TransferOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const detail = await inventoryOperationsApi.getTransferById(id);
      setOrder(detail || null);
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
    return <div className="p-8 text-center text-xs text-slate-500 font-medium">正在解析调拨单详情...</div>;
  }

  if (!order) {
    return <div className="bg-red-50 text-red-700 text-xs p-5 rounded border border-red-200 text-center font-medium">该调拨单不存在</div>;
  }

  const totalQty = order.items.reduce((sum, item) => sum + item.transferQty, 0);

  return (
    <div className="space-y-4 text-xs pb-8">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/inventory/transfers')} className="p-1.5 rounded-md hover:bg-slate-100 border border-slate-200 bg-white text-slate-600 cursor-pointer">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 font-mono">{order.id}</h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusClasses[order.status]}`}>
                {TRANSFER_STATUS_LABELS[order.status]}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">创建时间：{order.createdAt}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {(order.status === 'DRAFT' || order.status === 'OUTBOUND') && (
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
        </div>
      </div>

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
                      {item.inboundQty || (order.status === 'COMPLETED' ? item.transferQty : 0)}
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
                <span className="text-slate-400 font-semibold">建单人</span>
                <span className="font-semibold text-slate-700">{order.createdBy}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold flex items-center gap-1"><Calendar size={12} />更新时间</span>
                <span className="font-mono text-slate-500">{order.updatedAt || '-'}</span>
              </div>
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

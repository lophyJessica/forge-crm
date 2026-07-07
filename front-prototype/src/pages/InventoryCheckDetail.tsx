import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { inventoryOperationsApi } from '../api/inventoryOperations';
import {
  INVENTORY_CHECK_STATUS_LABELS,
  INVENTORY_CHECK_TYPE_LABELS,
  InventoryCheckOrder,
  InventoryCheckStatus,
} from '../types/inventoryOperations';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Calendar, ClipboardCheck, PlayCircle, Send, UserCheck, XCircle } from 'lucide-react';

const statusClasses: Record<InventoryCheckStatus, string> = {
  DRAFT: 'bg-zinc-100 text-zinc-800 border-zinc-200',
  COUNTING: 'bg-blue-50 text-blue-700 border-blue-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  VOIDED: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function InventoryCheckDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [order, setOrder] = useState<InventoryCheckOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const detail = await inventoryOperationsApi.getInventoryCheckById(id);
      setOrder(detail || null);
    } catch (err) {
      console.error(err);
      alert('加载盘点单详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleStart = async () => {
    if (!order) return;
    try {
      await inventoryOperationsApi.startInventoryCheck(order.id, 'WmsOperator01');
      await loadData();
      alert('盘点单已进入盘点中状态');
    } catch (err: any) {
      alert(err.message || '开始盘点失败');
    }
  };

  const handleVoid = async () => {
    if (!order || !window.confirm(`确定要作废盘点单 ${order.id} 吗？`)) return;
    try {
      await inventoryOperationsApi.voidInventoryCheck(order.id, 'WmsOperator01');
      await loadData();
      alert('盘点单已作废');
    } catch (err: any) {
      alert(err.message || '作废失败');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500 font-medium">正在解析盘点单详情...</div>;
  }

  if (!order) {
    return <div className="bg-red-50 text-red-700 text-xs p-5 rounded border border-red-200 text-center font-medium">该盘点单不存在</div>;
  }

  const totalDiff = order.items.reduce((sum, item) => sum + (item.countedQty - item.systemQty), 0);

  return (
    <div className="space-y-4 text-xs pb-8">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/inventory/checks')} className="p-1.5 rounded-md hover:bg-slate-100 border border-slate-200 bg-white text-slate-600 cursor-pointer">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 font-mono">{order.id}</h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusClasses[order.status]}`}>
                {INVENTORY_CHECK_STATUS_LABELS[order.status]}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">创建时间：{order.createdAt}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {order.status === 'DRAFT' && (
            <>
              <Button variant="outline" size="sm" onClick={handleVoid} className="text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1.5">
                <XCircle size={14} />
                <span>作废</span>
              </Button>
              <Button size="sm" onClick={handleStart} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 font-bold">
                <PlayCircle size={14} />
                <span>开始盘点</span>
              </Button>
            </>
          )}
          {order.status === 'COUNTING' && (
            <Button size="sm" onClick={() => navigate(`/inventory/checks/${order.id}/edit`)} className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 font-bold">
              <Send size={14} />
              <span>提交差异</span>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <ClipboardCheck size={16} className="text-primary" />
              <span>盘点商品明细</span>
            </h3>
            <div className={`px-2 py-1 rounded border font-mono font-bold ${
              totalDiff > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : totalDiff < 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}>
              差异合计 {totalDiff > 0 ? '+' : ''}{totalDiff}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3">编码</th>
                  <th className="p-3">名称 / 规格</th>
                  <th className="p-3">单位</th>
                  <th className="p-3 text-right">系统库存</th>
                  <th className="p-3 text-right">实盘数量</th>
                  <th className="p-3 text-right">差异</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {order.items.map((item, index) => {
                  const diff = item.countedQty - item.systemQty;
                  return (
                    <tr key={`${item.productCode}-${index}`} className="hover:bg-slate-50/50">
                      <td className="p-3 text-center text-slate-400 font-mono">{index + 1}</td>
                      <td className="p-3 font-mono font-semibold">{item.productCode}</td>
                      <td className="p-3">
                        <div>{item.productName}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.productSpec}</div>
                      </td>
                      <td className="p-3">{item.unit}</td>
                      <td className="p-3 text-right font-mono font-bold bg-slate-50/30">{item.systemQty}</td>
                      <td className="p-3 text-right font-mono font-bold">{item.countedQty}</td>
                      <td className={`p-3 text-right font-mono font-bold ${
                        diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-600' : 'text-slate-400'
                      }`}>
                        {diff > 0 ? '+' : ''}{diff}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">基础信息</h3>
            <div className="space-y-3">
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold">盘点仓库</span>
                <span className="font-semibold text-slate-700">{order.warehouseName}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold">盘点类型</span>
                <span className="font-semibold text-slate-700">{INVENTORY_CHECK_TYPE_LABELS[order.checkType]}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold">商品种数</span>
                <span className="font-mono font-bold text-slate-700">{order.itemCount}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold flex items-center gap-1"><UserCheck size={12} />盘点人</span>
                <span className="font-semibold text-slate-700">{order.checker}</span>
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

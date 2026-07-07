import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { inventoryOperationsApi } from '../api/inventoryOperations';
import {
  INVENTORY_CHECK_TYPE_LABELS,
  InventoryCheckItem,
  InventoryCheckOrder,
  InventoryCheckType,
} from '../types/inventoryOperations';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { ArrowLeft, Calculator, CheckCircle, Info, Save } from 'lucide-react';

export default function InventoryCheckForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const warehouses = useLiveQuery(() => db.warehouses.where('status').equals('ENABLED').toArray()) || [];

  const [order, setOrder] = useState<InventoryCheckOrder | null>(null);
  const [warehouseCode, setWarehouseCode] = useState('');
  const [checkType, setCheckType] = useState<InventoryCheckType>('VISIBLE');
  const [checker, setChecker] = useState('WmsOperator01');
  const [remark, setRemark] = useState('');
  const [items, setItems] = useState<InventoryCheckItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (id) {
          const detail = await inventoryOperationsApi.getInventoryCheckById(id);
          if (!detail) {
            alert('盘点单不存在');
            navigate('/inventory/checks');
            return;
          }
          if (detail.status !== 'DRAFT' && detail.status !== 'COUNTING') {
            navigate(`/inventory/checks/${detail.id}`);
            return;
          }
          setOrder(detail);
          setWarehouseCode(detail.warehouseCode);
          setCheckType(detail.checkType);
          setChecker(detail.checker);
          setRemark(detail.remark || '');
          setItems(detail.items);
        } else {
          setOrder(null);
          const firstWarehouse = warehouses[0]?.code || '';
          if (firstWarehouse && !warehouseCode) {
            setWarehouseCode(firstWarehouse);
          }
        }
      } catch (err: any) {
        alert(err.message || '加载盘点表单失败');
        navigate('/inventory/checks');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, warehouses.length]);

  useEffect(() => {
    if (id || !warehouseCode) return;
    inventoryOperationsApi.getCheckSeedItems(warehouseCode).then(setItems);
  }, [id, warehouseCode]);

  const handleWarehouseChange = async (nextWarehouseCode: string) => {
    setWarehouseCode(nextWarehouseCode);
    if (!id && nextWarehouseCode) {
      const nextItems = await inventoryOperationsApi.getCheckSeedItems(nextWarehouseCode);
      setItems(nextItems);
    }
  };

  const handleCountedQtyChange = (index: number, value: string) => {
    const nextItems = [...items];
    nextItems[index] = {
      ...nextItems[index],
      countedQty: value === '' ? 0 : Number(value),
    };
    setItems(nextItems);
  };

  const buildPayload = () => ({
    warehouseCode,
    checkType,
    checker,
    remark,
    items,
  });

  const saveDraft = async () => {
    try {
      if (order) {
        await inventoryOperationsApi.saveInventoryCheckDraft(order.id, buildPayload(), 'WmsOperator01');
        alert('盘点草稿保存成功');
        navigate(`/inventory/checks/${order.id}`);
      } else {
        const newId = await inventoryOperationsApi.createInventoryCheckDraft(buildPayload(), 'WmsOperator01');
        alert(`盘点单 ${newId} 已保存为草稿`);
        navigate(`/inventory/checks/${newId}`);
      }
    } catch (err: any) {
      alert(err.message || '保存失败');
    }
  };

  const submitDifference = async () => {
    try {
      let targetId = order?.id;
      if (!targetId) {
        targetId = await inventoryOperationsApi.createInventoryCheckDraft(buildPayload(), 'WmsOperator01');
      } else {
        await inventoryOperationsApi.saveInventoryCheckDraft(targetId, buildPayload(), 'WmsOperator01');
      }

      await inventoryOperationsApi.submitInventoryDifference(targetId, items, remark, 'WmsOperator01');
      alert('差异报告已提交，系统已按差异生成盘盈/盘亏流水');
      navigate(`/inventory/checks/${targetId}`);
    } catch (err: any) {
      alert(err.message || '提交差异报告失败');
    }
  };

  const totalDiff = items.reduce((sum, item) => sum + (Number(item.countedQty || 0) - item.systemQty), 0);

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500 font-medium">正在解析盘点单数据...</div>;
  }

  return (
    <div className="space-y-4 text-xs pb-12">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-md hover:bg-slate-100 border border-slate-200 bg-white text-slate-600 cursor-pointer">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{order ? `录入盘点差异 ${order.id}` : '新建盘点单'}</h1>
          <p className="text-xs text-slate-500 mt-1">上游库存字段只读，盘点差异由实盘数量与系统库存自动计算</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">基本信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">盘点仓库</label>
            <select
              value={warehouseCode}
              onChange={e => handleWarehouseChange(e.target.value)}
              disabled={!!order}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 focus-visible:outline-none focus-visible:ring-2 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">请选择仓库</option>
              {warehouses.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">盘点类型</label>
            <div className="flex gap-2">
              {(['VISIBLE', 'BLIND'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setCheckType(type)}
                  className={`flex-1 h-9 border rounded-md font-bold cursor-pointer transition-colors ${
                    checkType === type ? 'border-primary text-primary bg-blue-50/50' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {INVENTORY_CHECK_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">盘点人</label>
            <Input value={checker} onChange={e => setChecker(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">差异合计</label>
            <div className={`h-9 rounded-md border px-3 flex items-center justify-end font-mono font-bold ${
              totalDiff > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : totalDiff < 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}>
              {totalDiff > 0 ? '+' : ''}{totalDiff}
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <label className="font-semibold text-slate-500">备注</label>
          <Textarea placeholder="录入盘点范围、现场异常或交接说明..." value={remark} onChange={e => setRemark(e.target.value)} className="min-h-[68px] text-xs" />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">商品盘点明细</h3>
          <div className="flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
            <Info size={12} />
            <span>商品编码、名称、规格、单位、系统库存均为只读字段。</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                <th className="p-3 w-10 text-center">#</th>
                <th className="p-3">编码</th>
                <th className="p-3">名称</th>
                <th className="p-3">规格</th>
                <th className="p-3">单位</th>
                <th className="p-3 text-right">系统库存</th>
                <th className="p-3 w-40 text-right">实盘数量</th>
                <th className="p-3 text-right">差异</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">该仓库暂无库存商品可盘点</td>
                </tr>
              ) : items.map((item, index) => {
                const diff = Number(item.countedQty || 0) - item.systemQty;
                return (
                  <tr key={`${item.productCode}-${index}`} className="hover:bg-slate-50/50">
                    <td className="p-3 text-center text-slate-400 font-mono">{index + 1}</td>
                    <td className="p-3 font-mono font-semibold">{item.productCode}</td>
                    <td className="p-3">{item.productName}</td>
                    <td className="p-3 text-slate-500">{item.productSpec}</td>
                    <td className="p-3">{item.unit}</td>
                    <td className="p-3 text-right font-mono font-bold bg-slate-50/30">{item.systemQty}</td>
                    <td className="p-3">
                      <Input
                        type="number"
                        min={0}
                        value={item.countedQty}
                        onChange={e => handleCountedQtyChange(index, e.target.value)}
                        className="w-32 h-8 text-right font-bold font-mono text-xs ml-auto"
                      />
                    </td>
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

      <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <Button variant="outline" size="sm" onClick={() => navigate('/inventory/checks')} className="cursor-pointer">
          返回
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={saveDraft} className="flex items-center gap-1.5 cursor-pointer">
            <Save size={14} />
            <span>保存草稿</span>
          </Button>
          <Button size="sm" onClick={submitDifference} className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer font-bold">
            <Calculator size={14} />
            <span>提交差异报告</span>
            <CheckCircle size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

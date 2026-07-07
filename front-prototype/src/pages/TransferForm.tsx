import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { inventoryOperationsApi } from '../api/inventoryOperations';
import { TransferItem, TransferOrder } from '../types/inventoryOperations';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { AlertTriangle, ArrowLeft, ArrowUpFromLine, Plus, Save, Trash2 } from 'lucide-react';

export default function TransferForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const warehouses = useLiveQuery(() => db.warehouses.where('status').equals('ENABLED').toArray()) || [];

  const [order, setOrder] = useState<TransferOrder | null>(null);
  const [outWarehouseCode, setOutWarehouseCode] = useState('');
  const [inWarehouseCode, setInWarehouseCode] = useState('');
  const [remark, setRemark] = useState('');
  const [items, setItems] = useState<TransferItem[]>([]);
  const [productOptions, setProductOptions] = useState<TransferItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOptions = async (warehouseCode: string) => {
    if (!warehouseCode) {
      setProductOptions([]);
      return;
    }
    const options = await inventoryOperationsApi.getTransferSeedItems(warehouseCode);
    setProductOptions(options);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (id) {
          const detail = await inventoryOperationsApi.getTransferById(id);
          if (!detail) {
            alert('调拨单不存在');
            navigate('/inventory/transfers');
            return;
          }
          if (detail.status !== 'DRAFT') {
            navigate(`/inventory/transfers/${detail.id}`);
            return;
          }
          setOrder(detail);
          setOutWarehouseCode(detail.outWarehouseCode);
          setInWarehouseCode(detail.inWarehouseCode);
          setRemark(detail.remark || '');
          setItems(detail.items);
          await loadOptions(detail.outWarehouseCode);
        } else {
          const first = warehouses[0]?.code || '';
          const second = warehouses.find(w => w.code !== first)?.code || '';
          if (first && !outWarehouseCode) {
            setOutWarehouseCode(first);
            await loadOptions(first);
          }
          if (second && !inWarehouseCode) {
            setInWarehouseCode(second);
          }
        }
      } catch (err: any) {
        alert(err.message || '加载调拨表单失败');
        navigate('/inventory/transfers');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, warehouses.length]);

  const handleOutWarehouseChange = async (nextCode: string) => {
    setOutWarehouseCode(nextCode);
    setItems([]);
    await loadOptions(nextCode);
  };

  const addRow = () => {
    const usedCodes = new Set(items.map(item => item.productCode));
    const candidate = productOptions.find(option => !usedCodes.has(option.productCode));
    if (!candidate) {
      alert('调出仓已无可添加的库存商品');
      return;
    }
    setItems(prev => [
      ...prev,
      {
        ...candidate,
        id: String(prev.length + 1),
        transferQty: Math.min(1, candidate.availableQty),
        inboundQty: 0,
      },
    ]);
  };

  const removeRow = (index: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleProductChange = (index: number, productCode: string) => {
    const option = productOptions.find(item => item.productCode === productCode);
    if (!option) return;
    setItems(prev => prev.map((row, idx) => {
      if (idx !== index) return row;
      return {
        ...option,
        id: row.id,
        transferQty: Math.min(row.transferQty || 1, option.availableQty),
        inboundQty: row.inboundQty || 0,
      };
    }));
  };

  const handleQtyChange = (index: number, value: string) => {
    const qty = value === '' ? 0 : Number(value);
    setItems(prev => prev.map((row, idx) => idx === index ? { ...row, transferQty: qty } : row));
  };

  const hasRowError = (item: TransferItem) => item.transferQty <= 0 || item.transferQty > item.availableQty;
  const hasDuplicate = (productCode: string, index: number) => items.some((item, idx) => idx !== index && item.productCode === productCode);
  const hasErrors = items.length === 0 || outWarehouseCode === inWarehouseCode || items.some((item, index) => hasRowError(item) || hasDuplicate(item.productCode, index));

  const buildPayload = () => ({
    outWarehouseCode,
    inWarehouseCode,
    remark,
    items,
  });

  const saveDraft = async () => {
    try {
      if (order) {
        await inventoryOperationsApi.saveTransferDraft(order.id, buildPayload(), 'WmsOperator01');
        alert('调拨草稿保存成功');
        navigate(`/inventory/transfers/${order.id}`);
      } else {
        const newId = await inventoryOperationsApi.createTransferDraft(buildPayload(), 'WmsOperator01');
        alert(`调拨单 ${newId} 已保存为草稿`);
        navigate(`/inventory/transfers/${newId}`);
      }
    } catch (err: any) {
      alert(err.message || '保存失败');
    }
  };

  const confirmOutbound = async () => {
    try {
      let targetId = order?.id;
      if (!targetId) {
        targetId = await inventoryOperationsApi.createTransferDraft(buildPayload(), 'WmsOperator01');
      } else {
        await inventoryOperationsApi.saveTransferDraft(targetId, buildPayload(), 'WmsOperator01');
      }
      await inventoryOperationsApi.confirmTransferOutbound(targetId, 'WmsOperator01');
      alert('调拨单已确认出库，调拨数量已从调出仓现存转入在途');
      navigate(`/inventory/transfers/${targetId}`);
    } catch (err: any) {
      alert(err.message || '确认出库失败');
    }
  };

  const totalQty = items.reduce((sum, item) => sum + Number(item.transferQty || 0), 0);

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500 font-medium">正在解析调拨单数据...</div>;
  }

  return (
    <div className="space-y-4 text-xs pb-12">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-md hover:bg-slate-100 border border-slate-200 bg-white text-slate-600 cursor-pointer">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{order ? `编辑调拨单 ${order.id}` : '新建调拨单'}</h1>
          <p className="text-xs text-slate-500 mt-1">调拨商品来自调出仓当前现存库存，调拨数量不能大于现存量</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">基本信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">调出仓库</label>
            <select
              value={outWarehouseCode}
              onChange={e => handleOutWarehouseChange(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 focus-visible:outline-none focus-visible:ring-2"
            >
              <option value="">请选择调出仓</option>
              {warehouses.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">调入仓库</label>
            <select
              value={inWarehouseCode}
              onChange={e => setInWarehouseCode(e.target.value)}
              className={`w-full h-9 rounded-md border bg-background px-3 py-1 focus-visible:outline-none focus-visible:ring-2 ${
                outWarehouseCode && outWarehouseCode === inWarehouseCode ? 'border-red-400 text-red-700 bg-red-50' : 'border-input'
              }`}
            >
              <option value="">请选择调入仓</option>
              {warehouses.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">商品种数</label>
            <div className="h-9 rounded-md border border-slate-200 bg-slate-50 px-3 flex items-center justify-end font-mono font-bold text-slate-700">
              {items.length}
            </div>
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">调拨总数</label>
            <div className="h-9 rounded-md border border-slate-200 bg-slate-50 px-3 flex items-center justify-end font-mono font-bold text-slate-700">
              {totalQty}
            </div>
          </div>
        </div>
        {outWarehouseCode && outWarehouseCode === inWarehouseCode && (
          <div className="flex items-center gap-1 text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2 font-semibold">
            <AlertTriangle size={14} />
            <span>调出仓库与调入仓库不能相同</span>
          </div>
        )}
        <div className="space-y-1">
          <label className="font-semibold text-slate-500">备注</label>
          <Textarea placeholder="录入调拨用途、交接说明或异常备注..." value={remark} onChange={e => setRemark(e.target.value)} className="min-h-[68px] text-xs" />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">商品明细</h3>
          <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={!outWarehouseCode || productOptions.length === 0} className="flex items-center gap-1.5 disabled:opacity-50">
            <Plus size={14} />
            <span>新增行</span>
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                <th className="p-3 w-10 text-center">#</th>
                <th className="p-3 min-w-[160px]">商品编码</th>
                <th className="p-3">名称 / 规格</th>
                <th className="p-3">单位</th>
                <th className="p-3 text-right">当前现存</th>
                <th className="p-3 w-44 text-right">调拨数量</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">请先选择调出仓库并新增调拨商品行</td>
                </tr>
              ) : items.map((item, index) => {
                const rowError = hasRowError(item);
                const duplicate = hasDuplicate(item.productCode, index);
                return (
                  <tr key={`${item.id}-${index}`} className="hover:bg-slate-50/50">
                    <td className="p-3 text-center text-slate-400 font-mono">{index + 1}</td>
                    <td className="p-3">
                      <select
                        value={item.productCode}
                        onChange={e => handleProductChange(index, e.target.value)}
                        className={`w-full h-8 rounded-md border bg-background px-2 py-1 font-mono focus-visible:outline-none focus-visible:ring-2 ${
                          duplicate ? 'border-red-400 bg-red-50 text-red-700' : 'border-input'
                        }`}
                      >
                        {productOptions.map(option => (
                          <option key={option.productCode} value={option.productCode}>{option.productCode}</option>
                        ))}
                      </select>
                      {duplicate && <div className="text-[10px] text-red-500 font-semibold mt-1">该商品已在明细中存在</div>}
                    </td>
                    <td className="p-3">
                      <div>{item.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.productSpec}</div>
                    </td>
                    <td className="p-3">{item.unit}</td>
                    <td className="p-3 text-right font-mono font-bold bg-slate-50/30">{item.availableQty}</td>
                    <td className="p-3">
                      <div className="flex flex-col items-end gap-1">
                        <Input
                          type="number"
                          min={1}
                          max={item.availableQty}
                          value={item.transferQty}
                          onChange={e => handleQtyChange(index, e.target.value)}
                          className={`w-32 h-8 text-right font-bold font-mono text-xs ${
                            rowError ? 'border-red-500 focus-visible:ring-red-500 bg-red-50 text-red-700' : ''
                          }`}
                        />
                        {rowError && (
                          <span className="text-[10px] text-red-500 font-semibold leading-tight text-right w-52">
                            调拨数量必须大于 0 且不超过现存量 {item.availableQty}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(index)} className="h-7 text-red-600 hover:bg-red-50">
                        <Trash2 size={12} className="mr-1" />
                        <span>删除行</span>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <Button variant="outline" size="sm" onClick={() => navigate('/inventory/transfers')} className="cursor-pointer">
          返回
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={saveDraft} disabled={hasErrors} className="flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
            <Save size={14} />
            <span>保存草稿</span>
          </Button>
          <Button size="sm" onClick={confirmOutbound} disabled={hasErrors} className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-1.5 cursor-pointer font-bold disabled:opacity-50">
            <ArrowUpFromLine size={14} />
            <span>确认出库</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

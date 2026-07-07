import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { damageApi } from '../api/damage';
import { DAMAGE_REASON_LABELS, DamageItem, DamageReason } from '../types/damage';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { AlertTriangle, ArrowLeft, CheckCircle2, Plus, Save, Trash2 } from 'lucide-react';

const reasonOptions: DamageReason[] = ['TRANSFER_LOSS', 'DAMAGED', 'EXPIRED', 'SHORTAGE'];

export default function DamageForm() {
  const navigate = useNavigate();
  const warehouses = useLiveQuery(() => db.warehouses.where('status').equals('ENABLED').toArray()) || [];

  const [warehouseCode, setWarehouseCode] = useState('');
  const [reason, setReason] = useState<DamageReason>('DAMAGED');
  const [remark, setRemark] = useState('');
  const [items, setItems] = useState<DamageItem[]>([]);
  const [productOptions, setProductOptions] = useState<DamageItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOptions = async (nextWarehouseCode: string) => {
    if (!nextWarehouseCode) {
      setProductOptions([]);
      return;
    }
    const options = await damageApi.getDamageSeedItems(nextWarehouseCode);
    setProductOptions(options);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const first = warehouses[0]?.code || '';
        if (first && !warehouseCode) {
          setWarehouseCode(first);
          await loadOptions(first);
        }
      } catch (err: any) {
        alert(err.message || '加载报损表单失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [warehouses.length]);

  const handleWarehouseChange = async (nextCode: string) => {
    setWarehouseCode(nextCode);
    setItems([]);
    await loadOptions(nextCode);
  };

  const addRow = () => {
    const usedCodes = new Set(items.map(item => item.productCode));
    const candidate = productOptions.find(option => !usedCodes.has(option.productCode));
    if (!candidate) {
      alert('该仓库已无可添加的现存商品');
      return;
    }
    setItems(prev => [
      ...prev,
      {
        ...candidate,
        id: String(prev.length + 1),
        damageQty: Math.min(1, candidate.currentQty),
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
        damageQty: Math.min(row.damageQty || 1, option.currentQty),
      };
    }));
  };

  const handleQtyChange = (index: number, value: string) => {
    const qty = value === '' ? 0 : Number(value);
    setItems(prev => prev.map((row, idx) => idx === index ? { ...row, damageQty: qty } : row));
  };

  const hasRowError = (item: DamageItem) => item.damageQty <= 0 || item.damageQty > item.currentQty;
  const hasDuplicate = (productCode: string, index: number) => items.some((item, idx) => idx !== index && item.productCode === productCode);
  const hasErrors = items.length === 0 || !warehouseCode || items.some((item, index) => hasRowError(item) || hasDuplicate(item.productCode, index));

  const buildPayload = () => ({
    warehouseCode,
    reason,
    remark,
    items,
  });

  const saveDraft = async () => {
    try {
      const newId = await damageApi.createDamageDraft(buildPayload(), 'WmsOperator01');
      alert(`报损单 ${newId} 已保存为草稿`);
      navigate(`/inventory/damages/${newId}`);
    } catch (err: any) {
      alert(err.message || '保存失败');
    }
  };

  const confirmDamage = async () => {
    if (!window.confirm('确认报损后将立即扣减现存并生成库存流水 FL，是否继续？')) return;
    try {
      const newId = await damageApi.createAndConfirmDamage(buildPayload(), 'WmsOperator01');
      alert(`报损单 ${newId} 已确认，现存已扣减并生成 FL 流水`);
      navigate(`/inventory/damages/${newId}`);
    } catch (err: any) {
      alert(err.message || '确认报损失败');
    }
  };

  const totalQty = items.reduce((sum, item) => sum + Number(item.damageQty || 0), 0);

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500 font-medium">正在解析报损表单数据...</div>;
  }

  return (
    <div className="space-y-4 text-xs pb-12">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-md hover:bg-slate-100 border border-slate-200 bg-white text-slate-600 cursor-pointer">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">新建报损单</h1>
          <p className="text-xs text-slate-500 mt-1">报损数量不能大于当前现存量；确认报损后立即扣减现存并生成 FL 流水</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">基本信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">仓库</label>
            <select
              value={warehouseCode}
              onChange={e => handleWarehouseChange(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 focus-visible:outline-none focus-visible:ring-2"
            >
              <option value="">请选择仓库</option>
              {warehouses.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">报损原因</label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value as DamageReason)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 focus-visible:outline-none focus-visible:ring-2"
            >
              {reasonOptions.map(option => <option key={option} value={option}>{DAMAGE_REASON_LABELS[option]}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">商品种数</label>
            <div className="h-9 rounded-md border border-slate-200 bg-slate-50 px-3 flex items-center justify-end font-mono font-bold text-slate-700">
              {items.length}
            </div>
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">报损总数</label>
            <div className="h-9 rounded-md border border-slate-200 bg-slate-50 px-3 flex items-center justify-end font-mono font-bold text-red-600">
              {totalQty}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-2 font-semibold">
          <AlertTriangle size={14} />
          <span>确认报损不是审批预占动作，会直接扣减该仓现存并写入库存流水 FL。</span>
        </div>
        <div className="space-y-1">
          <label className="font-semibold text-slate-500">备注</label>
          <Textarea placeholder="录入损耗来源、交接说明或异常照片编号..." value={remark} onChange={e => setRemark(e.target.value)} className="min-h-[68px] text-xs" />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">商品明细</h3>
          <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={!warehouseCode || productOptions.length === 0} className="flex items-center gap-1.5 disabled:opacity-50">
            <Plus size={14} />
            <span>新增行</span>
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                <th className="p-3 w-10 text-center">#</th>
                <th className="p-3 min-w-[160px]">编码</th>
                <th className="p-3">名称</th>
                <th className="p-3">规格</th>
                <th className="p-3">单位</th>
                <th className="p-3 text-right">现存</th>
                <th className="p-3 w-44 text-right">报损数量</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">请先选择仓库并新增报损商品行</td>
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
                    <td className="p-3">{item.productName}</td>
                    <td className="p-3 font-mono text-slate-400">{item.productSpec}</td>
                    <td className="p-3">{item.unit}</td>
                    <td className="p-3 text-right font-mono font-bold bg-slate-50/30">{item.currentQty}</td>
                    <td className="p-3">
                      <div className="flex flex-col items-end gap-1">
                        <Input
                          type="number"
                          min={1}
                          max={item.currentQty}
                          value={item.damageQty}
                          onChange={e => handleQtyChange(index, e.target.value)}
                          className={`w-32 h-8 text-right font-bold font-mono text-xs ${
                            rowError ? 'border-red-500 focus-visible:ring-red-500 bg-red-50 text-red-700' : ''
                          }`}
                        />
                        {rowError && (
                          <span className="text-[10px] text-red-500 font-semibold leading-tight text-right w-52">
                            报损数量必须大于 0 且不超过现存量 {item.currentQty}
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
        <Button variant="outline" size="sm" onClick={() => navigate('/inventory/damages')} className="cursor-pointer">
          返回
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={saveDraft} disabled={hasErrors} className="flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
            <Save size={14} />
            <span>保存草稿</span>
          </Button>
          <Button size="sm" onClick={confirmDamage} disabled={hasErrors} className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer font-bold disabled:opacity-50">
            <CheckCircle2 size={14} />
            <span>确认报损</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

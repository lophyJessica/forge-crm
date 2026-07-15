import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { baseDataApi } from '../api/baseData';
import { db } from '../db';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { InventoryStock } from '../types/inventory';
import { ArrowLeft, Check, Minus, Plus } from 'lucide-react';
import { PdaHeader, PdaLookupForm, PdaOfflineBar, PdaShell } from './PdaHome';

type CheckRow = {
  productCode: string;
  productName: string;
  unit: string;
  systemQty: number;
};

export default function PdaCheck() {
  const [locationCode, setLocationCode] = useState('');
  const [locationName, setLocationName] = useState('');
  const [rows, setRows] = useState<CheckRow[]>([]);
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  const loadLocationStock = async () => {
    setMessage('');
    const code = locationCode.trim().toUpperCase();
    if (!code) {
      setMessage('请输入货位编码');
      return;
    }

    const location = await baseDataApi.getLocationByCode(code);
    if (!location || location.status !== 'ENABLED') {
      setRows([]);
      setMessage('货位不存在或已停用');
      return;
    }

    const inboundOrders = await db.inbound_orders.toArray();
    const productCodes = Array.from(new Set(
      inboundOrders.flatMap(order =>
        order.items
          .filter(item => item.locationCode === code)
          .map(item => item.productCode)
      )
    ));

    let stocks = await db.inventory_stocks
      .where('warehouseCode')
      .equals(location.warehouseCode)
      .toArray();

    if (productCodes.length > 0) {
      stocks = stocks.filter(item => productCodes.includes(item.productCode));
    } else {
      stocks = stocks.filter(item => item.qtyTotal > 0).slice(0, 3);
    }

    const nextRows = stocks.map((item: InventoryStock) => ({
      productCode: item.productCode,
      productName: item.productName,
      unit: item.unit,
      systemQty: item.qtyTotal,
    }));

    const nextQty: Record<string, number> = {};
    nextRows.forEach(item => {
      nextQty[item.productCode] = item.systemQty;
    });

    setRows(nextRows);
    setQtyMap(nextQty);
    setConfirmed([]);
    setLocationName(`${location.warehouseName} / ${location.zoneName}`);
    if (nextRows.length === 0) {
      setMessage('该货位暂无可盘商品');
    }
  };

  const updateQty = (productCode: string, value: number) => {
    setQtyMap(prev => ({ ...prev, [productCode]: Math.max(0, value) }));
    setConfirmed(prev => prev.filter(item => item !== productCode));
  };

  const confirmRow = (productCode: string) => {
    setConfirmed(prev => Array.from(new Set([...prev, productCode])));
  };

  const allConfirmed = rows.length > 0 && rows.every(item => confirmed.includes(item.productCode));

  const submitCheck = () => {
    if (!allConfirmed) return;
    setMessage('盘点提交完成');
  };

  return (
    <PdaShell>
      <PdaHeader title="盘点" subtitle="输入货位后逐行确认实盘数量" />
      <main className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <Link to="/pda" className="inline-flex items-center gap-1 text-sm font-black text-slate-600">
          <ArrowLeft size={18} />
          返回主界面
        </Link>

        <PdaLookupForm
          label="货位编码"
          value={locationCode}
          placeholder="LOC-A01"
          onChange={setLocationCode}
          onSubmit={loadLocationStock}
        />

        {message && (
          <div role="status" aria-live="polite" className={`rounded-lg px-4 py-3 text-sm font-black ${message.includes('完成') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
            {message}
          </div>
        )}

        {rows.length > 0 && (
          <section className="space-y-3">
            <div className="bg-slate-900 text-white rounded-lg p-4">
              <div className="text-xs text-slate-400 font-bold">当前货位</div>
              <div className="text-base font-black font-mono mt-1">{locationCode.trim().toUpperCase()}</div>
              <div className="text-sm text-slate-300 mt-1">{locationName}</div>
            </div>

            {rows.map(item => {
              const qty = qtyMap[item.productCode] ?? item.systemQty;
              const diff = qty - item.systemQty;
              const done = confirmed.includes(item.productCode);

              return (
                <div key={item.productCode} className={`rounded-lg border p-4 shadow-sm ${done ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-black font-mono text-blue-700">{item.productCode}</div>
                      <div className="text-lg font-black text-slate-900 leading-tight mt-1">{item.productName}</div>
                      <div className="text-sm font-bold text-slate-500 mt-2">
                        系统库存：<span className="font-mono text-slate-900">{item.systemQty}</span> {item.unit}
                      </div>
                    </div>
                    {done && <Check size={28} className="text-emerald-600 shrink-0" />}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      aria-label={`减少 ${item.productCode} 的实盘数量`}
                      title="减少数量"
                      onClick={() => updateQty(item.productCode, qty - 1)}
                      className="w-14 h-14 rounded-md bg-slate-200 text-slate-800 flex items-center justify-center"
                    >
                      <Minus size={28} />
                    </button>
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      aria-label={`实盘数量 ${item.productCode}`}
                      value={qty}
                      onChange={e => updateQty(item.productCode, Number(e.target.value || 0))}
                      className="h-14 text-center text-2xl font-black font-mono"
                    />
                    <button
                      type="button"
                      aria-label={`增加 ${item.productCode} 的实盘数量`}
                      title="增加数量"
                      onClick={() => updateQty(item.productCode, qty + 1)}
                      className="w-14 h-14 rounded-md bg-slate-900 text-white flex items-center justify-center"
                    >
                      <Plus size={28} />
                    </button>
                  </div>

                  <div className={`mt-3 rounded-md px-3 py-2 text-sm font-black ${diff === 0 ? 'bg-slate-100 text-slate-600' : diff > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
                    差异：{diff > 0 ? '+' : ''}{diff}
                  </div>

                  <Button
                    type="button"
                    onClick={() => confirmRow(item.productCode)}
                    className={`w-full h-14 mt-4 text-base font-black ${done ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                  >
                    {done ? '已确认' : '逐行确认'}
                  </Button>
                </div>
              );
            })}
          </section>
        )}
      </main>

      {rows.length > 0 ? (
        <div className="p-4 bg-white border-t border-slate-200">
          <Button
            type="button"
            disabled={!allConfirmed}
            onClick={submitCheck}
            className="w-full h-14 text-lg font-black bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500"
          >
            提交盘点
          </Button>
        </div>
      ) : (
        <PdaOfflineBar />
      )}
    </PdaShell>
  );
}

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { outboundApi } from '../api/outbound';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { WaveOrder } from '../types/outbound';
import { AlertTriangle, ArrowLeft, Check, Minus, Plus } from 'lucide-react';
import { PdaHeader, PdaLookupForm, PdaOfflineBar, PdaShell } from './PdaHome';

export default function PdaPicking() {
  const [waveNo, setWaveNo] = useState('');
  const [wave, setWave] = useState<WaveOrder | null>(null);
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  const loadWave = async () => {
    setMessage('');
    const keyword = waveNo.trim();
    if (!keyword) {
      setMessage('请输入波次号 WAVE');
      return;
    }

    const data = await outboundApi.getWaveById(keyword);
    if (!data) {
      setWave(null);
      setMessage('未找到该波次');
      return;
    }
    if (data.status !== 'PICKING' && data.status !== 'PICKED') {
      setWave(null);
      setMessage('仅拣货中或已拣货波次可在 PDA 查看');
      return;
    }

    const nextQty: Record<string, number> = {};
    const nextConfirmed: string[] = [];
    data.items.forEach(item => {
      nextQty[item.productCode] = item.qtyPicked || item.qtyRequired;
      if (item.status === 'PICKED' || item.qtyPicked >= item.qtyRequired) {
        nextConfirmed.push(item.productCode);
      }
    });
    setWave(data);
    setQtyMap(nextQty);
    setConfirmed(nextConfirmed);
    setErrors({});
  };

  const updateQty = (productCode: string, value: number, required: number) => {
    const qty = Math.max(0, value);
    setQtyMap(prev => ({ ...prev, [productCode]: qty }));
    setConfirmed(prev => prev.filter(item => item !== productCode));

    setErrors(prev => {
      const next = { ...prev };
      if (qty > required) {
        next[productCode] = `实拣数 ${qty} 超出应拣数 ${required}`;
      } else {
        delete next[productCode];
      }
      return next;
    });
  };

  const confirmRow = (productCode: string) => {
    if (errors[productCode]) return;
    setConfirmed(prev => Array.from(new Set([...prev, productCode])));
  };

  const allConfirmed = !!wave && wave.items.every(item => confirmed.includes(item.productCode));

  const completePicking = async () => {
    if (!wave || !allConfirmed) return;

    const nextErrors: Record<string, string> = {};
    wave.items.forEach(item => {
      const qty = qtyMap[item.productCode] || 0;
      if (qty > item.qtyRequired) {
        nextErrors[item.productCode] = `实拣数 ${qty} 超出应拣数 ${item.qtyRequired}`;
      }
    });

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setMessage('存在超量拣货，请先修正');
      return;
    }

    try {
      await outboundApi.confirmPicking(
        wave.id,
        wave.items.map(item => ({ productCode: item.productCode, qty: qtyMap[item.productCode] || 0 }))
      );
      const latest = await outboundApi.getWaveById(wave.id);
      if (latest) setWave(latest);
      setMessage('完成拣货');
    } catch (err: any) {
      setMessage(err.message || '完成拣货失败');
    }
  };

  return (
    <PdaShell>
      <PdaHeader title="拣货出库" subtitle="输入 WAVE 单号加载待拣商品" />
      <main className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <Link to="/pda" className="inline-flex items-center gap-1 text-sm font-black text-slate-600">
          <ArrowLeft size={18} />
          返回主界面
        </Link>

        <PdaLookupForm
          label="波次号 WAVE"
          value={waveNo}
          placeholder="WAVE20260704-0001"
          onChange={setWaveNo}
          onSubmit={loadWave}
        />

        {message && (
          <div role="status" aria-live="polite" className={`rounded-lg px-4 py-3 text-sm font-black ${message.includes('失败') || message.includes('未') || message.includes('超') || message.includes('仅') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
            {message}
          </div>
        )}

        {wave && (
          <section className="space-y-3">
            <div className="bg-slate-900 text-white rounded-lg p-4">
              <div className="text-xs text-slate-400 font-bold">当前波次</div>
              <div className="text-base font-black font-mono mt-1">{wave.id}</div>
              <div className="text-sm text-slate-300 mt-1">{wave.route}</div>
            </div>

            {wave.items.map(item => {
              const qty = qtyMap[item.productCode] ?? item.qtyRequired;
              const done = confirmed.includes(item.productCode);
              const err = errors[item.productCode];

              return (
                <div key={item.productCode} className={`rounded-lg border p-4 shadow-sm ${done ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-blue-700">货位 {item.recommendLocation}</div>
                      <div className="text-sm font-black font-mono text-slate-500 mt-1">{item.productCode}</div>
                      <div className="text-lg font-black text-slate-900 leading-tight mt-1">{item.productName}</div>
                      <div className="text-sm font-bold text-slate-500 mt-2">
                        应拣数：<span className="font-mono text-slate-900">{item.qtyRequired}</span> {item.unit}
                      </div>
                    </div>
                    {done && <Check size={28} className="text-emerald-600 shrink-0" />}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      aria-label={`减少 ${item.productCode} 的实拣数量`}
                      title="减少数量"
                      disabled={wave.status !== 'PICKING'}
                      onClick={() => updateQty(item.productCode, qty - 1, item.qtyRequired)}
                      className="w-14 h-14 rounded-md bg-slate-200 text-slate-800 flex items-center justify-center disabled:opacity-50"
                    >
                      <Minus size={28} />
                    </button>
                    <Input
                      type="number"
                      min={0}
                      max={item.qtyRequired}
                      inputMode="numeric"
                      aria-label={`实拣数量 ${item.productCode}`}
                      value={qty}
                      disabled={wave.status !== 'PICKING'}
                      onChange={e => updateQty(item.productCode, Number(e.target.value || 0), item.qtyRequired)}
                      className={`h-14 text-center text-2xl font-black font-mono ${err ? 'border-red-500 bg-red-50 text-red-700' : ''}`}
                    />
                    <button
                      type="button"
                      aria-label={`增加 ${item.productCode} 的实拣数量`}
                      title="增加数量"
                      disabled={wave.status !== 'PICKING'}
                      onClick={() => updateQty(item.productCode, qty + 1, item.qtyRequired)}
                      className="w-14 h-14 rounded-md bg-slate-900 text-white flex items-center justify-center disabled:opacity-50"
                    >
                      <Plus size={28} />
                    </button>
                  </div>

                  {err && (
                    <div className="mt-3 flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-md px-3 py-2 text-sm font-black">
                      <AlertTriangle size={18} />
                      {err}
                    </div>
                  )}

                  <Button
                    type="button"
                    disabled={wave.status !== 'PICKING' || !!err}
                    onClick={() => confirmRow(item.productCode)}
                    className={`w-full h-14 mt-4 text-base font-black ${done ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                  >
                    {done ? '已确认拣货' : '确认拣货'}
                  </Button>
                </div>
              );
            })}
          </section>
        )}
      </main>

      {wave ? (
        <div className="p-4 bg-white border-t border-slate-200">
          <Button
            type="button"
            disabled={!allConfirmed || wave.status !== 'PICKING'}
            onClick={completePicking}
            className="w-full h-14 text-lg font-black bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500"
          >
            完成拣货
          </Button>
        </div>
      ) : (
        <PdaOfflineBar />
      )}
    </PdaShell>
  );
}

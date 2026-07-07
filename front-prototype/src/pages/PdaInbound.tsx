import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { baseDataApi } from '../api/baseData';
import { inboundApi } from '../api/inbound';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { InboundOrder } from '../types/inbound';
import { ArrowLeft, Check, MapPin, Search, X } from 'lucide-react';
import { PdaHeader, PdaOfflineBar, PdaShell } from './PdaHome';

export default function PdaInbound() {
  const [rcvNo, setRcvNo] = useState('');
  const [order, setOrder] = useState<InboundOrder | null>(null);
  const [locationMap, setLocationMap] = useState<Record<string, string>>({});
  const [scanProduct, setScanProduct] = useState<string | null>(null);
  const [locationCode, setLocationCode] = useState('');
  const [message, setMessage] = useState('');

  const loadOrder = async () => {
    setMessage('');
    const keyword = rcvNo.trim();
    if (!keyword) {
      setMessage('请输入收货单号 RCV');
      return;
    }

    const data = await inboundApi.getInboundById(keyword);
    if (!data) {
      setOrder(null);
      setMessage('未找到该收货单');
      return;
    }

    if (data.status !== 'RECEIVED' && data.status !== 'PUTAWAY') {
      setOrder(null);
      setMessage('仅已收货或已上架单据可在 PDA 查看');
      return;
    }

    const initialMap: Record<string, string> = {};
    data.items.forEach(item => {
      if (item.locationCode) initialMap[item.productCode] = item.locationCode;
    });
    setOrder(data);
    setLocationMap(initialMap);
  };

  const pendingQty = (item: InboundOrder['items'][number]) => Math.max(0, item.receivedQuantity - item.putawayQuantity);

  const handleOpenScan = (productCode: string) => {
    setScanProduct(productCode);
    setLocationCode(locationMap[productCode] || '');
    setMessage('');
  };

  const confirmLocation = async () => {
    if (!order || !scanProduct) return;
    const code = locationCode.trim().toUpperCase();
    if (!code) {
      setMessage('请输入货位编码');
      return;
    }

    const location = await baseDataApi.getLocationByCode(code);
    if (!location || location.status !== 'ENABLED') {
      setMessage('货位不存在或已停用');
      return;
    }
    if (location.warehouseCode !== order.warehouseCode) {
      setMessage('货位不属于当前收货仓库');
      return;
    }

    setLocationMap(prev => ({ ...prev, [scanProduct]: code }));
    setScanProduct(null);
    setLocationCode('');
    setMessage('');
  };

  const allReady = !!order && order.items.every(item => pendingQty(item) === 0 || !!locationMap[item.productCode]);

  const confirmPutaway = async () => {
    if (!order || !allReady) return;

    const putawayItems = order.items
      .filter(item => pendingQty(item) > 0)
      .map(item => ({
        productCode: item.productCode,
        locationCode: locationMap[item.productCode],
        qty: pendingQty(item),
      }));

    if (putawayItems.length === 0) {
      setMessage('该收货单已全部上架');
      return;
    }

    try {
      await inboundApi.putawayConfirm(order.id, putawayItems, 'WmsOperator01');
      const latest = await inboundApi.getInboundById(order.id);
      if (latest) setOrder(latest);
      setMessage('确认上架完成');
    } catch (err: any) {
      setMessage(err.message || '确认上架失败');
    }
  };

  return (
    <PdaShell>
      <PdaHeader title="收货上架" subtitle="输入 RCV 单号加载待上架商品" />
      <main className="flex-1 p-4 space-y-4 overflow-y-auto">
        <Link to="/pda" className="inline-flex items-center gap-1 text-sm font-black text-slate-600">
          <ArrowLeft size={18} />
          返回主界面
        </Link>

        <section className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
          <label className="text-sm font-black text-slate-600">收货单号 RCV</label>
          <div className="flex gap-2 mt-2">
            <Input
              value={rcvNo}
              onChange={e => setRcvNo(e.target.value)}
              placeholder="RCV20260706-0001"
              className="h-12 text-base font-mono font-bold"
            />
            <Button type="button" onClick={loadOrder} className="h-12 w-14 p-0">
              <Search size={22} />
            </Button>
          </div>
        </section>

        {message && (
          <div className={`rounded-lg px-4 py-3 text-sm font-black ${message.includes('失败') || message.includes('不') || message.includes('未') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
            {message}
          </div>
        )}

        {order && (
          <section className="space-y-3">
            <div className="bg-slate-900 text-white rounded-lg p-4">
              <div className="text-xs text-slate-400 font-bold">当前单据</div>
              <div className="text-base font-black font-mono mt-1">{order.id}</div>
              <div className="text-sm text-slate-300 mt-1">{order.warehouseName}</div>
            </div>

            {order.items.map(item => {
              const qty = pendingQty(item);
              const loc = locationMap[item.productCode];
              const done = qty === 0 || !!loc;
              return (
                <div key={item.productCode} className={`rounded-lg border p-4 shadow-sm ${done ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-black font-mono text-blue-700">{item.productCode}</div>
                      <div className="text-lg font-black text-slate-900 leading-tight mt-1">{item.productName}</div>
                      <div className="text-sm font-bold text-slate-500 mt-2">
                        应上架数量：<span className="font-mono text-slate-900">{qty}</span> {item.unit}
                      </div>
                      {loc && (
                        <div className="inline-flex items-center gap-1 mt-2 text-sm font-black text-emerald-700">
                          <MapPin size={16} />
                          {loc}
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      disabled={qty === 0 || order.status === 'PUTAWAY'}
                      onClick={() => handleOpenScan(item.productCode)}
                      className={`h-14 px-5 text-base font-black ${done ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                    >
                      {done ? '已上架' : '上架'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </main>

      {order && (
        <div className="p-4 bg-white border-t border-slate-200">
          <Button
            type="button"
            onClick={confirmPutaway}
            disabled={!allReady || order.status === 'PUTAWAY'}
            className="w-full h-14 text-lg font-black bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500"
          >
            <Check size={22} className="mr-2" />
            确认上架
          </Button>
        </div>
      )}
      {!order && <PdaOfflineBar />}

      {scanProduct && (
        <div className="fixed inset-0 bg-slate-950/70 flex items-end justify-center z-50">
          <div className="w-full max-w-[375px] bg-white rounded-t-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900">输入货位编码</h2>
              <button type="button" onClick={() => setScanProduct(null)} className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center">
                <X size={22} />
              </button>
            </div>
            <Input
              autoFocus
              value={locationCode}
              onChange={e => setLocationCode(e.target.value)}
              placeholder="LOC-A01"
              className="h-14 text-xl font-mono font-black uppercase"
            />
            <Button type="button" onClick={confirmLocation} className="w-full h-14 text-lg font-black">
              确认货位
            </Button>
          </div>
        </div>
      )}
    </PdaShell>
  );
}

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { db } from '../db';
import { WaveOrder } from '../types/outbound';
import { Button } from '../components/ui/Button';
import { ArrowLeft, ArrowUpCircle, Calendar, Layers, Clipboard, ShieldCheck, Box } from 'lucide-react';

interface ShipVirtualDetail {
  id: string;
  waveOrderId: string;
  carrier: string;
  route: string;
  remark?: string;
  status: 'PENDING' | 'COMPLETED';
  createdAt: string;
  items: Array<{
    productCode: string;
    productName: string;
    productSpec: string;
    unit: string;
    qtyRequired: number;
    qtyPicked: number;
    qtyChecked: number;
  }>;
  packages: Array<{
    id: string;
    weight: number;
    trackingNumber: string;
    status: string;
    createdAt: string;
  }>;
}

export default function ShipDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [detail, setDetail] = useState<ShipVirtualDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const allWaves = await db.wave_orders.toArray();
        let targetWave: WaveOrder | null = null;
        for (const w of allWaves) {
          const sId = `DSH${w.id.substring(4)}`;
          if (sId === id || w.id === id) {
            targetWave = w;
            break;
          }
        }

        if (!targetWave) {
          alert('交运单不存在');
          navigate('/outbound/ships');
          return;
        }

        const shipStatus = targetWave.status === 'CHECKED' ? 'PENDING' : 'COMPLETED';
        const sId = `DSH${targetWave.id.substring(4)}`;

        // 获取包裹数据
        const pkgs = await db.pkg_records.where('waveId').equals(targetWave.id).toArray();

        setDetail({
          id: sId,
          waveOrderId: targetWave.id,
          carrier: targetWave.carrier,
          route: targetWave.route,
          remark: targetWave.remark,
          status: shipStatus,
          createdAt: targetWave.createdAt,
          items: targetWave.items,
          packages: pkgs.map(p => ({
            id: p.id,
            weight: p.weight,
            trackingNumber: p.trackingNumber,
            status: p.status,
            createdAt: p.createdAt,
          })),
        });
      } catch (err) {
        console.error(err);
        alert('加载交运单明细失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500 font-medium">正在解析交运账单...</div>;
  }

  if (!detail) {
    return <div className="bg-red-50 text-red-700 text-xs p-5 rounded border border-red-200 text-center font-medium">该交运单不存在</div>;
  }

  const getStatusClasses = (status: string) => {
    return status === 'PENDING'
      ? 'bg-zinc-100 text-zinc-800 border-zinc-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  return (
    <div className="space-y-4 text-xs pb-8">
      {/* 页头 */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/outbound/ships')} className="p-1.5 rounded-md hover:bg-slate-100 border border-slate-200 bg-white text-slate-600 cursor-pointer">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 font-mono">{detail.id}</h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusClasses(detail.status)}`}>
                {detail.status === 'PENDING' ? '待交运确认' : '已完成交运'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">关联出库波次：{detail.waveOrderId}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {detail.status === 'PENDING' && (
            <Button 
              size="sm" 
              onClick={() => navigate(`/outbound/waves/${detail.waveOrderId}/ship`)} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 font-bold cursor-pointer"
            >
              <ArrowUpCircle size={14} />
              <span>去确认交运</span>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* 商品明细列表 */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Layers size={16} className="text-primary" />
              <span>商品出库清单</span>
            </h3>
            <div className="px-2 py-1 rounded border bg-slate-50 text-slate-700 border-slate-200 font-mono font-bold">
              商品种数共 {detail.items.length} 种
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
                  <th className="p-3 text-right">应出数量</th>
                  <th className="p-3 text-right">复核数量</th>
                  <th className="p-3 text-right">交运出库数量</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {detail.items.map((item, index) => (
                  <tr key={`${item.productCode}-${index}`} className="hover:bg-slate-50/50">
                    <td className="p-3 text-center text-slate-400 font-mono">{index + 1}</td>
                    <td className="p-3 font-mono font-semibold">{item.productCode}</td>
                    <td className="p-3">
                      <div>{item.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.productSpec}</div>
                    </td>
                    <td className="p-3">{item.unit}</td>
                    <td className="p-3 text-right font-mono text-slate-500">{item.qtyRequired}</td>
                    <td className="p-3 text-right font-mono text-slate-500">{item.qtyChecked || item.qtyRequired}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-600">{detail.status === 'COMPLETED' ? item.qtyChecked || item.qtyRequired : 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 侧边栏 */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Clipboard size={14} className="text-slate-500" />
              <span>基础交运信息</span>
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold">交运承运商</span>
                <span className="font-semibold text-slate-700">{detail.carrier}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold">交货线路</span>
                <span className="font-semibold text-slate-700">{detail.route}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold">应出总件数</span>
                <span className="font-mono font-bold text-slate-700">
                  {detail.items.reduce((sum, item) => sum + item.qtyRequired, 0)} 件
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold">创建时间</span>
                <span className="font-mono text-slate-500">{detail.createdAt}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Box size={14} className="text-slate-500" />
              <span>已打包包裹 (共 {detail.packages.length} 箱)</span>
            </h3>
            {detail.packages.length > 0 ? (
              <div className="space-y-3 font-mono">
                {detail.packages.map((pkg, idx) => (
                  <div key={pkg.id} className="p-2 border border-slate-100 rounded bg-slate-50 space-y-1">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>箱 {idx + 1}: {pkg.id}</span>
                      <span className="text-primary">{pkg.weight.toFixed(2)} kg</span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex justify-between">
                      <span>单号: {pkg.trackingNumber}</span>
                      <span>{pkg.status === 'SHIPPED' ? '已交运' : '已打包'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-slate-400 italic text-center py-2">暂无包装复称记录</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

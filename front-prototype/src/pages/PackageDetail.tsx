import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { db } from '../db';
import { Button } from '../components/ui/Button';
import PageHeader from '../components/shared/PageHeader';
import { Calendar, Layers, Clipboard, ShieldCheck, Truck } from 'lucide-react';

interface PackageDetailData {
  id: string;
  waveId: string;
  weight: number;
  trackingNumber: string;
  status: 'PACKED' | 'SHIPPED';
  createdAt: string;
  carrier: string;
  route: string;
  items: Array<{
    productCode: string;
    productName: string;
    productSpec: string;
    unit: string;
    qtyRequired: number;
  }>;
}

export default function PackageDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [detail, setDetail] = useState<PackageDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const pkg = await db.pkg_records.get(id);
        if (!pkg) {
          alert('该包裹记录不存在');
          navigate('/outbound/packages');
          return;
        }

        const wave = await db.wave_orders.get(pkg.waveId);
        const carrier = wave?.carrier || '顺丰速运';
        const route = wave?.route || '未匹配线路';
        const items = wave?.items || [];

        setDetail({
          id: pkg.id,
          waveId: pkg.waveId,
          weight: pkg.weight,
          trackingNumber: pkg.trackingNumber,
          status: pkg.status,
          createdAt: pkg.createdAt,
          carrier,
          route,
          items: items.map(i => ({
            productCode: i.productCode,
            productName: i.productName,
            productSpec: i.productSpec,
            unit: i.unit,
            qtyRequired: i.qtyRequired,
          })),
        });
      } catch (err) {
        console.error(err);
        alert('加载包裹明细失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return <div className="forge-state-panel">正在解析包装条码...</div>;
  }

  if (!detail) {
    return <div className="forge-state-panel forge-state-panel--error">该包裹不存在</div>;
  }

  const getStatusClasses = (status: string) => {
    return status === 'PACKED'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  return (
    <div className="space-y-4 text-xs pb-8">
      <PageHeader
        onBack={() => navigate('/outbound/packages')}
        title={<><span className="font-mono">{detail.id}</span><span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusClasses(detail.status)}`}>{detail.status === 'PACKED' ? '已打包' : '已交运'}</span></>}
        description={<span className="font-mono">关联出库波次：{detail.waveId}</span>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* 商品明细列表 */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Layers size={16} className="text-primary" />
              <span>包裹装箱商品清单</span>
            </h3>
            <div className="px-2 py-1 rounded border bg-slate-50 text-slate-700 border-slate-200 font-mono font-bold">
              装箱商品 {detail.items.length} 种
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
                  <th className="p-3 text-right">装箱数量</th>
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
                    <td className="p-3 text-right font-mono font-bold text-slate-800">{item.qtyRequired}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 侧边信息卡片 */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Clipboard size={14} className="text-slate-500" />
              <span>包裹属性</span>
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold">质量称重 (kg)</span>
                <span className="font-mono font-bold text-slate-700">{detail.weight.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold">关联出库波次</span>
                <span className="font-mono text-primary hover:underline">
                  <Link to={`/outbound/${detail.waveId}`}>{detail.waveId}</Link>
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold flex items-center gap-1">打包生成时间</span>
                <span className="font-mono text-slate-500">{detail.createdAt}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Truck size={14} className="text-slate-500" />
              <span>物流交运信息</span>
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold">快递运单号</span>
                <span className="font-semibold text-slate-800 font-mono select-all">{detail.trackingNumber}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold">承运商</span>
                <span className="font-semibold text-slate-700">{detail.carrier}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold">交货出库路线</span>
                <span className="font-semibold text-slate-700">{detail.route}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

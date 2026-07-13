import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { db } from '../db';
import { WaveOrder } from '../types/outbound';
import { Button } from '../components/ui/Button';
import { ArrowLeft, ArrowUpCircle, Calendar, Layers, Clipboard, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface PickingVirtualDetail {
  id: string;
  waveOrderId: string;
  carrier: string;
  route: string;
  remark?: string;
  status: 'PICKING' | 'COMPLETED';
  pickerId?: string;
  createdAt: string;
  items: Array<{
    productCode: string;
    productName: string;
    productSpec: string;
    unit: string;
    recommendLocation: string;
    qtyRequired: number;
    qtyPicked: number;
  }>;
}

export default function PickingDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [detail, setDetail] = useState<PickingVirtualDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const allWaves = await db.wave_orders.toArray();
        let targetWave: WaveOrder | null = null;
        for (const w of allWaves) {
          const pId = `PICK${w.id.substring(4)}`;
          if (pId === id || w.id === id) {
            targetWave = w;
            break;
          }
        }

        if (!targetWave) {
          alert('拣货单不存在');
          navigate('/outbound/pickings');
          return;
        }

        const pickingStatus = targetWave.status === 'PICKING' ? 'PICKING' : 'COMPLETED';
        const pId = `PICK${targetWave.id.substring(4)}`;

        setDetail({
          id: pId,
          waveOrderId: targetWave.id,
          carrier: targetWave.carrier,
          route: targetWave.route,
          remark: targetWave.remark,
          status: pickingStatus,
          pickerId: targetWave.pickerId,
          createdAt: targetWave.createdAt,
          items: targetWave.items,
        });
      } catch (err) {
        console.error(err);
        alert('加载拣货单明细失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500 font-medium">正在解析拣货明细...</div>;
  }

  if (!detail) {
    return <div className="bg-red-50 text-red-700 text-xs p-5 rounded border border-red-200 text-center font-medium">该拣货单不存在</div>;
  }

  const getStatusClasses = (status: string) => {
    return status === 'PICKING'
      ? 'bg-orange-50 text-orange-700 border-orange-200 animate-pulse'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  return (
    <div className="space-y-4 text-xs pb-8">
      {/* 页头 */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/outbound/pickings')} className="p-1.5 rounded-md hover:bg-slate-100 border border-slate-200 bg-white text-slate-600 cursor-pointer">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 font-mono">{detail.id}</h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusClasses(detail.status)}`}>
                {detail.status === 'PICKING' ? '拣货中' : '已完成'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">关联出库波次：{detail.waveOrderId}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {detail.status === 'PICKING' && (
            <Button 
              size="sm" 
              onClick={() => navigate(`/outbound/waves/${detail.waveOrderId}/pick`)} 
              className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-1.5 font-bold cursor-pointer"
            >
              <ArrowUpCircle size={14} />
              <span>去执行拣货</span>
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
              <span>下架商品拣选明细</span>
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
                  <th className="p-3 font-bold text-slate-600">下架推荐货位</th>
                  <th className="p-3 text-right">应拣数量</th>
                  <th className="p-3 text-right">实拣数量</th>
                  <th className="p-3 text-center">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {detail.items.map((item, index) => {
                  const isFinished = item.qtyPicked >= item.qtyRequired;
                  return (
                    <tr key={`${item.productCode}-${index}`} className="hover:bg-slate-50/50">
                      <td className="p-3 text-center text-slate-400 font-mono">{index + 1}</td>
                      <td className="p-3 font-mono font-semibold">{item.productCode}</td>
                      <td className="p-3">
                        <div>{item.productName}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.productSpec}</div>
                      </td>
                      <td className="p-3">{item.unit}</td>
                      <td className="p-3 font-mono font-bold text-orange-600 bg-orange-50/10">{item.recommendLocation}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-500">{item.qtyRequired}</td>
                      <td className="p-3 text-right font-mono font-bold text-primary">{item.qtyPicked}</td>
                      <td className="p-3 text-center">
                        {isFinished ? (
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 text-[10px] font-bold">已拣足</span>
                        ) : (
                          <span className="text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 text-[10px] font-bold">拣货中</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 侧边信息卡片 */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Clipboard size={14} className="text-slate-500" />
              <span>基础信息</span>
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold">拣货仓库</span>
                <span className="font-semibold text-slate-700">北京主仓</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold">关联出库波次</span>
                <span className="font-mono text-primary hover:underline">
                  <Link to={`/outbound/waves`}>{detail.waveOrderId}</Link>
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold">承运商 / 线路</span>
                <span className="font-semibold text-slate-700">{detail.carrier} / {detail.route}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold">应拣商品总数</span>
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
              <ShieldCheck size={14} className="text-slate-500" />
              <span>执行状态记录</span>
            </h3>
            {detail.pickerId ? (
              <div className="space-y-3">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400 font-semibold">拣货作业员</span>
                  <span className="font-semibold text-slate-700">{detail.pickerId}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400 font-semibold flex items-center gap-1">实拣总数</span>
                  <span className="font-mono text-emerald-600 font-bold">
                    {detail.items.reduce((sum, item) => sum + item.qtyPicked, 0)} 件
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 italic text-center py-2">暂无拣货指派人记录</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

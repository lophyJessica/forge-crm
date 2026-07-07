import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { outboundApi } from '../api/outbound';
import { WaveOrder, PackageRecord } from '../types/outbound';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ArrowLeft, Truck, Check, Landmark, ShieldCheck } from 'lucide-react';

export default function ShipForm() {
  const navigate = useNavigate();
  const { wid } = useParams();

  const [wave, setWave] = useState<WaveOrder | null>(null);
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [shipTime, setShipTime] = useState('');

  const loadData = async () => {
    if (!wid) return;
    setLoading(true);
    try {
      const data = await outboundApi.getWaveById(wid);
      if (data) {
        if (data.status !== 'CHECKED') {
          alert('波次单不符合交运确认条件（须处于已复核且已完成包装状态）！');
          navigate('/outbound');
          return;
        }
        setWave(data);
        
        // 载入包裹
        const pkgs = await outboundApi.getPackagesByWaveId(wid);
        if (pkgs.length === 0) {
          alert('该波次未找到任何包裹包装记录，请先去称重包装！');
          navigate('/outbound');
          return;
        }
        setPackages(pkgs);
      }
      
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
      setShipTime(nowStr);
    } catch (err) {
      console.error(err);
      alert('加载交运单出错');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [wid]);

  // 确认交运
  const handleConfirmShip = async () => {
    if (!wid) return;
    try {
      await outboundApi.confirmShipping(wid, 'WmsScheduler');
      alert('交运交接确认成功！已真实完成 IndexedDB 物理库存扣减，生成销售出库流水，并回传进销存销售订单！');
      navigate('/outbound');
    } catch (err: any) {
      alert(err.message || '交运确认失败');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500 font-medium">正在解析单据数据...</div>;
  }

  if (!wave) {
    return <div className="bg-red-50 text-red-700 p-5 rounded border border-red-200 text-center font-medium">该波次不存在</div>;
  }

  const totalQty = wave.items.reduce((sum, i) => sum + i.qtyChecked, 0);
  const totalWeight = packages.reduce((sum, p) => sum + p.weight, 0);

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12 text-xs">
      {/* 页头 */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <button 
          onClick={() => navigate('/outbound')} 
          className="p-1.5 rounded-md hover:bg-slate-100 border border-slate-200 bg-white text-slate-600 cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
            <Truck size={18} className="text-primary animate-bounce" />
            <span>发货出库交运交接确认</span>
          </h1>
          <p className="text-[10px] text-slate-400 mt-0.5">
            波次单号：{wave.id} | 承运商：{wave.carrier}
          </p>
        </div>
      </div>

      {/* 2栏布局 (左侧明细，右侧交运资料) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 左侧包裹聚合 */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">发货包裹聚合列表</h3>
            <div className="space-y-2">
              {packages.map((pkg, idx) => (
                <div key={pkg.id} className="p-3 bg-slate-50 border border-slate-150 rounded flex justify-between items-center">
                  <div>
                    <span className="font-mono text-slate-500 font-bold block">PKG {idx + 1}</span>
                    <strong className="font-mono text-slate-700 font-bold">{pkg.id}</strong>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-400 font-mono text-[10px]">重量: <strong className="text-slate-700">{pkg.weight} kg</strong></div>
                    <div className="text-slate-400 font-mono text-[10px] mt-0.5">单号: <strong className="text-slate-700">{pkg.trackingNumber}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider block font-mono">聚合商品拣货实出数量</h3>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                  <th className="p-3">商品</th>
                  <th className="p-3 text-right">应出数量</th>
                  <th className="p-3 text-right">实出复核数</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {wave.items.map(item => (
                  <tr key={item.productCode}>
                    <td className="p-3">
                      <div className="font-semibold text-slate-800">{item.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.productCode}</div>
                    </td>
                    <td className="p-3 text-right font-mono">{item.qtyRequired}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-800 bg-slate-50/10">
                      {item.qtyChecked}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 右侧交运汇总 */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">出库交接汇总</h3>
            
            <div className="space-y-3 font-medium">
              <div className="flex justify-between">
                <span className="text-slate-400">承运商公司</span>
                <span className="font-semibold text-slate-800">{wave.carrier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">线路覆盖</span>
                <span className="font-semibold text-slate-800 max-w-[120px] truncate" title={wave.route}>{wave.route}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">包裹总件数</span>
                <span className="font-semibold text-slate-800 font-mono font-bold">{packages.length} 箱</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">出库物料总数</span>
                <span className="font-semibold text-slate-800 font-mono font-bold">{totalQty} 件</span>
              </div>
              <div className="flex justify-between font-bold border-t border-slate-100 pt-3 text-slate-800">
                <span>总装箱毛重</span>
                <span className="font-mono text-emerald-600">{totalWeight.toFixed(2)} kg</span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2">
              <label className="font-semibold text-slate-500 block">实际装车交接时间</label>
              <Input
                type="datetime-local"
                value={shipTime}
                onChange={e => setShipTime(e.target.value)}
                className="h-9 font-mono"
              />
            </div>

            <div className="bg-yellow-50 text-yellow-700 p-3.5 rounded border border-yellow-150 space-y-1.5 leading-relaxed">
              <div className="font-bold flex items-center gap-1">
                <ShieldCheck size={14} className="text-yellow-600" />
                <span>交运终审防错规则</span>
              </div>
              <p className="text-[10px] text-yellow-600/90 font-medium">
                确认交运是 WMS 出库的终审判定：
              </p>
              <ul className="list-disc list-inside text-[9px] space-y-0.5 font-medium">
                <li>系统将正式物理扣减这批货在 WMS 对应库房中的“占用”库存量；</li>
                <li>自动回传给进销存 ERP 改变销售订单为已出库；</li>
                <li>不可逆，无法退回物理删除。</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 底部返回与交运 */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/outbound')}
          className="cursor-pointer"
        >
          返回列表
        </Button>
        
        <Button
          size="sm"
          className="bg-primary hover:bg-primary-hover text-white font-bold flex items-center gap-1.5 cursor-pointer"
          onClick={handleConfirmShip}
        >
          <Check size={14} />
          <span>确认交运装车 (扣减库存)</span>
        </Button>
      </div>
    </div>
  );
}

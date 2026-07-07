import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { outboundApi } from '../api/outbound';
import { WaveOrder, WaveItem } from '../types/outbound';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ArrowLeft, Smartphone, Check, AlertTriangle, Layers, User } from 'lucide-react';

export default function PickingForm() {
  const navigate = useNavigate();
  const { wid } = useParams();

  const [wave, setWave] = useState<WaveOrder | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 存放每个商品的实拣数量，初始为应拣数量
  const [pickQtyMap, setPickQtyMap] = useState<Record<string, number>>({});
  // 存放已确认拣货完成的商品编码列表
  const [confirmedProducts, setConfirmedProducts] = useState<string[]>([]);
  // 存放每行超拣的报错信息
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadData = async () => {
    if (!wid) return;
    setLoading(true);
    try {
      const data = await outboundApi.getWaveById(wid);
      if (data) {
        setWave(data);
        
        // 初始填充实拣数量为应拣数
        const qtyMap: Record<string, number> = {};
        const confList: string[] = [];
        data.items.forEach(item => {
          qtyMap[item.productCode] = item.qtyPicked || item.qtyRequired;
          if (item.status === 'PICKED' || item.qtyPicked > 0) {
            confList.push(item.productCode);
          }
        });
        setPickQtyMap(qtyMap);
        setConfirmedProducts(confList);
      }
    } catch (err) {
      console.error(err);
      alert('加载波次单出错');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [wid]);

  const handleQtyChange = (productCode: string, val: string, maxRequired: number) => {
    const qty = val === '' ? 0 : Number(val);
    setPickQtyMap(prev => ({ ...prev, [productCode]: qty }));

    // 强控阻断：实拣 > 应拣
    const newErrors = { ...errors };
    if (qty > maxRequired) {
      newErrors[productCode] = `实拣数 (${qty}) 超出应拣需求数 (${maxRequired})！`;
    } else {
      delete newErrors[productCode];
    }
    setErrors(newErrors);

    // 如果修改了数量，且之前确认过，先取消确认状态，要求重新点击确认拣货
    setConfirmedProducts(prev => prev.filter(c => c !== productCode));
  };

  // 单行确认拣货
  const handleConfirmRow = (productCode: string) => {
    if (errors[productCode]) {
      alert('请先修正错误的拣货数量！');
      return;
    }
    setConfirmedProducts(prev => Array.from(new Set([...prev, productCode])));
  };

  // 提交完成拣货
  const handleCompletePicking = async () => {
    if (!wave || !wid) return;

    // 再次全校验
    const newErrors: Record<string, string> = {};
    wave.items.forEach(item => {
      const qty = pickQtyMap[item.productCode] || 0;
      if (qty > item.qtyRequired) {
        newErrors[item.productCode] = `实拣数 (${qty}) 超出应拣需求数 (${item.qtyRequired})！`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alert('存在错误的拣货数量，提交已被超量拦截！');
      return;
    }

    // 构建提报数据
    const pickingData = wave.items.map(item => ({
      productCode: item.productCode,
      qty: pickQtyMap[item.productCode] || 0
    }));

    try {
      await outboundApi.confirmPicking(wid, pickingData);
      alert('PDA 拣货记录提交成功！波次单已转入“已拣货”状态，等待播种与复核');
      navigate('/outbound');
    } catch (err: any) {
      alert(err.message || '拣货提交失败');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500 font-medium">正在解析单据数据...</div>;
  }

  if (!wave) {
    return (
      <div className="bg-red-50 text-red-700 text-xs p-5 rounded border border-red-200 text-center font-medium">
        该波次单不存在
      </div>
    );
  }

  // 检查是否所有行均已确认拣货
  const allConfirmed = wave.items.every(item => confirmedProducts.includes(item.productCode));

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
            <Smartphone size={18} className="text-primary animate-pulse" />
            <span>PDA 手持终端拣货作业模拟</span>
          </h1>
          <p className="text-[10px] text-slate-400 mt-0.5">
            波次单号：{wave.id} | 承运商：{wave.carrier} | 配送线路：{wave.route}
          </p>
        </div>
      </div>

      {/* 顶部操作说明 */}
      <div className="bg-slate-900 text-slate-300 p-4 rounded-lg space-y-2 border border-slate-800 shadow-inner">
        <div className="flex justify-between items-center text-white font-bold text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></div>
            <span>拣货车载指令面板</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <User size={12} />
              <span>操作员：{wave.pickerId || '未指派'}</span>
            </span>
            <span className="flex items-center gap-1">
              <Layers size={12} />
              <span>SKU: {wave.items.length} 种</span>
            </span>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          仓管员操作流程：1. 推起拣货车 → 2. 按屏幕指定的【推荐货位】前往相应过道 → 3. 扫描货架标签及商品条码 → 4. 核实并填入实拣件数 → 5. 点击“确认拣货”绑定。
        </p>
      </div>

      {/* 拣货商品清单 */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-150">
          <h3 className="font-bold text-slate-800">当前待拣货架商品明细</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {wave.items.map((item, index) => {
            const qty = pickQtyMap[item.productCode] ?? item.qtyRequired;
            const isConfirmed = confirmedProducts.includes(item.productCode);
            const err = errors[item.productCode];

            return (
              <div 
                key={item.productCode} 
                className={`p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isConfirmed ? 'bg-emerald-50/50' : 'hover:bg-slate-50/30'
                }`}
              >
                {/* 商品详情与货位 */}
                <div className="flex items-start gap-3 flex-1">
                  <div className="font-mono text-slate-400 font-bold mt-1 text-sm">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 font-mono font-bold text-[10px] flex items-center gap-1">
                        <Smartphone size={10} />
                        推荐货位: {item.recommendLocation}
                      </span>
                      <span className="font-semibold text-slate-800">{item.productName}</span>
                    </div>
                    <div className="text-slate-400 font-mono text-[10px] mt-0.5">
                      编码：{item.productCode} | 规格：{item.productSpec} | 单位：{item.unit}
                    </div>
                    <div className="text-slate-600 font-medium">
                      应拣数量要求：<strong className="text-slate-800 font-mono font-bold">{item.qtyRequired}</strong> {item.unit}
                    </div>
                  </div>
                </div>

                {/* 实拣输入与操作 */}
                <div className="flex items-center gap-4 self-end md:self-center">
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-semibold">实拣数量:</span>
                      <Input
                        type="number"
                        value={qty}
                        disabled={wave.status !== 'PICKING'}
                        onChange={e => handleQtyChange(item.productCode, e.target.value, item.qtyRequired)}
                        className={`w-28 h-8 text-right font-bold font-mono text-xs ${
                          err ? 'border-red-500 focus-visible:ring-red-500 bg-red-50 text-red-700' : ''
                        }`}
                      />
                    </div>
                    {err && (
                      <span className="text-[10px] text-red-500 font-semibold text-right leading-tight w-48 block">
                        {err}
                      </span>
                    )}
                  </div>

                  {wave.status === 'PICKING' && (
                    <Button
                      variant={isConfirmed ? "outline" : "default"}
                      size="sm"
                      className="h-8 cursor-pointer font-bold w-24 flex items-center justify-center"
                      onClick={() => handleConfirmRow(item.productCode)}
                      disabled={!!err}
                    >
                      {isConfirmed ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-bold">
                          <Check size={12} />
                          已锁定
                        </span>
                      ) : (
                        <span>确认拣货</span>
                      )}
                    </Button>
                  )}
                  
                  {wave.status !== 'PICKING' && (
                    <div className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 rounded font-bold flex items-center gap-1">
                      <Check size={12} />
                      <span>实拣: {item.qtyPicked}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 底部返回与确认 */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/outbound')}
          className="cursor-pointer"
        >
          返回列表
        </Button>
        
        {wave.status === 'PICKING' && (
          <div className="flex items-center gap-2">
            {!allConfirmed && (
              <span className="text-slate-400 font-medium">请确认上方所有商品拣货动作完成</span>
            )}
            <Button
              size="sm"
              className={`font-bold flex items-center gap-1.5 cursor-pointer ${
                allConfirmed 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse' 
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
              onClick={handleCompletePicking}
              disabled={!allConfirmed}
            >
              <Check size={14} />
              <span>完成拣货上报</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

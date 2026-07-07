import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { outboundApi, generatePKGNumber } from '../api/outbound';
import { WaveOrder, WaveItem } from '../types/outbound';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ArrowLeft, Check, QrCode, ClipboardCheck, Info } from 'lucide-react';

export default function CheckForm() {
  const navigate = useNavigate();
  const { wid } = useParams();

  const [wave, setWave] = useState<WaveOrder | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 自动生成的包裹号，用于复核提示
  const [tempPkgId, setTempPkgId] = useState('');
  
  // 存放复核确认数量，默认填充为实拣数
  const [checkQtyMap, setCheckQtyMap] = useState<Record<string, number>>({});
  // 存放已确认复核的商品编码列表
  const [confirmedProducts, setConfirmedProducts] = useState<string[]>([]);
  // 存放行错误（实出数不等于应出数）
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadData = async () => {
    if (!wid) return;
    setLoading(true);
    try {
      const data = await outboundApi.getWaveById(wid);
      if (data) {
        if (data.status !== 'PICKED') {
          alert('波次单不在已拣货状态，无法进行复核！');
          navigate(`/outbound`);
          return;
        }
        setWave(data);
        
        // 初始填充复核数为实拣数
        const qtyMap: Record<string, number> = {};
        data.items.forEach(item => {
          qtyMap[item.productCode] = item.qtyPicked;
        });
        setCheckQtyMap(qtyMap);
      }
      
      // 生成一个演示用的包裹单号
      const pId = await generatePKGNumber();
      setTempPkgId(pId);
    } catch (err) {
      console.error(err);
      alert('加载复核数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [wid]);

  const handleQtyChange = (productCode: string, val: string, requiredQty: number) => {
    const qty = val === '' ? 0 : Number(val);
    setCheckQtyMap(prev => ({ ...prev, [productCode]: qty }));

    // 强控：必须完全等于要求数量
    const newErrors = { ...errors };
    if (qty !== requiredQty) {
      newErrors[productCode] = `复核数 (${qty}) 与实拣数 (${requiredQty}) 不匹配！`;
    } else {
      delete newErrors[productCode];
    }
    setErrors(newErrors);
    
    // 取消确认状态
    setConfirmedProducts(prev => prev.filter(c => c !== productCode));
  };

  // 确认单行复核
  const handleConfirmRow = (productCode: string) => {
    if (errors[productCode]) {
      alert('复核数量不匹配，请修正后再点击确认！');
      return;
    }
    setConfirmedProducts(prev => Array.from(new Set([...prev, productCode])));
  };

  // 完成复核
  const handleCompleteCheck = async () => {
    if (!wave || !wid) return;

    // 校验是否有漏复核或数量不匹配的
    const newErrors: Record<string, string> = {};
    wave.items.forEach(item => {
      const qty = checkQtyMap[item.productCode] ?? 0;
      if (qty !== item.qtyPicked) {
        newErrors[item.productCode] = `复核数 (${qty}) 与实拣数 (${item.qtyPicked}) 不匹配！`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alert('商品复核数量存在差异，无法完成复核！');
      return;
    }

    const checkData = wave.items.map(item => ({
      productCode: item.productCode,
      qty: checkQtyMap[item.productCode] ?? 0
    }));

    try {
      await outboundApi.confirmChecking(wid, checkData);
      alert('波次复核成功！波次单状态变更为已复核，现可进行包装贴单作业。');
      navigate('/outbound');
    } catch (err: any) {
      alert(err.message || '复核失败');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500 font-medium">正在解析单据数据...</div>;
  }

  if (!wave) {
    return <div className="bg-red-50 text-red-700 p-5 rounded border border-red-200 text-center">该波次不存在</div>;
  }

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
            <ClipboardCheck size={18} className="text-primary" />
            <span>出库复核校验中心</span>
          </h1>
          <p className="text-[10px] text-slate-400 mt-0.5">
            波次单号：{wave.id} | 物流承运商：{wave.carrier}
          </p>
        </div>
      </div>

      {/* 复核包裹提示 */}
      <div className="bg-slate-900 text-slate-300 p-4 rounded-lg space-y-2 border border-slate-800 shadow-inner">
        <div className="flex justify-between items-center text-white font-bold text-xs">
          <div className="flex items-center gap-2">
            <QrCode size={14} className="text-blue-400" />
            <span>复核扫描枪工作指示</span>
          </div>
          <div>
            预生成包裹号：<span className="font-mono text-yellow-400 select-all font-bold">{tempPkgId}</span>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          复核流程要求：1. 实出复核数量必须与实拣数量<strong>完全一致</strong>。若有错拣，系统将阻断放行并报警；2. 实核完成确认后自动允许打印快递面单及包装称重。
        </p>
      </div>

      {/* 商品清单 */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-150">
          <h3 className="font-bold text-slate-800">商品逐件扫码复核校验</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {wave.items.map((item, index) => {
            const qty = checkQtyMap[item.productCode] ?? item.qtyPicked;
            const isConfirmed = confirmedProducts.includes(item.productCode);
            const err = errors[item.productCode];

            return (
              <div 
                key={item.productCode} 
                className={`p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isConfirmed ? 'bg-emerald-50/50' : 'hover:bg-slate-50/30'
                }`}
              >
                {/* 左侧商品 */}
                <div className="flex items-start gap-3 flex-1">
                  <span className="font-mono text-slate-400 font-bold mt-1 text-sm">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{item.productName}</span>
                      <span className="font-mono font-bold text-[9px] bg-slate-100 text-slate-500 px-1 rounded">
                        {item.productCode}
                      </span>
                    </div>
                    <div className="text-slate-400 font-mono text-[10px] mt-0.5">
                      规格：{item.productSpec} | 推荐货架：{item.recommendLocation}
                    </div>
                    <div className="text-slate-600 font-semibold">
                      实拣总数要求：<strong className="text-slate-800 font-mono font-bold">{item.qtyPicked}</strong> {item.unit}
                    </div>
                  </div>
                </div>

                {/* 右侧复核校验 */}
                <div className="flex items-center gap-4 self-end md:self-center">
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-semibold">复核实出数:</span>
                      <Input
                        type="number"
                        value={qty}
                        onChange={e => handleQtyChange(item.productCode, e.target.value, item.qtyPicked)}
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
                        已核验
                      </span>
                    ) : (
                      <span>复核确认</span>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/outbound')}
          className="cursor-pointer"
        >
          返回列表
        </Button>
        
        <div className="flex items-center gap-2">
          {!allConfirmed && (
            <span className="text-slate-400 font-medium">请核对每一行商品并锁定确认</span>
          )}
          <Button
            size="sm"
            className={`font-bold flex items-center gap-1.5 cursor-pointer ${
              allConfirmed 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse' 
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
            onClick={handleCompleteCheck}
            disabled={!allConfirmed}
          >
            <Check size={14} />
            <span>复核完成并生成复核单</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

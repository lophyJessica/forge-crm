import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { outboundApi, generatePKGNumber } from '../api/outbound';
import { WaveOrder } from '../types/outbound';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import PageHeader from '../components/shared/PageHeader';
import { Inbox, Plus, Trash2, CheckCircle, Info } from 'lucide-react';

interface PackItem {
  id: string; // 临时展示单号或生成单号
  weight: string;
  trackingNumber: string;
}

export default function PackageForm() {
  const navigate = useNavigate();
  const { wid } = useParams();

  const [wave, setWave] = useState<WaveOrder | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 包裹列表状态
  const [packages, setPackages] = useState<PackItem[]>([]);

  const loadData = async () => {
    if (!wid) return;
    setLoading(true);
    try {
      const data = await outboundApi.getWaveById(wid);
      if (data) {
        if (data.status !== 'CHECKED') {
          alert('波次单未处于已复核状态，无法包装！');
          navigate('/outbound');
          return;
        }
        setWave(data);
      }
      
      // 默认生成第一个包裹行
      const firstId = await generatePKGNumber();
      setPackages([{ id: firstId, weight: '', trackingNumber: '' }]);
    } catch (err) {
      console.error(err);
      alert('加载包装数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [wid]);

  // 添加包裹
  const handleAddPackage = async () => {
    // 根据已有包裹数自动生成下一个单号
    const baseId = await generatePKGNumber();
    // 增加尾数序号以在前端模拟不同包裹号
    const numPart = Number(baseId.substring(11));
    const nextNum = String(numPart + packages.length).padStart(6, '0');
    const nextId = baseId.substring(0, 11) + nextNum;

    setPackages(prev => [...prev, { id: nextId, weight: '', trackingNumber: '' }]);
  };

  // 删除包裹
  const handleRemovePackage = (index: number) => {
    if (packages.length <= 1) {
      alert('必须至少保留一个出库包裹！');
      return;
    }
    setPackages(prev => prev.filter((_, i) => i !== index));
  };

  // 值变更
  const handleFieldChange = (index: number, field: keyof PackItem, val: string) => {
    const nextList = [...packages];
    nextList[index] = {
      ...nextList[index],
      [field]: val
    };
    setPackages(nextList);
  };

  // 完成包装并提交
  const handleSubmitPacking = async () => {
    if (!wid || !wave) return;

    // 校验
    for (const p of packages) {
      if (!p.weight || Number(p.weight) <= 0) {
        alert(`包裹 [${p.id}] 重量录入错误，必须大于 0！`);
        return;
      }
      if (!p.trackingNumber.trim()) {
        alert(`包裹 [${p.id}] 快递单号不可为空！`);
        return;
      }
    }

    try {
      await outboundApi.completePacking(wid, packages.map(p => ({
        weight: Number(p.weight),
        trackingNumber: p.trackingNumber
      })), 'WmsOperator01');
      
      alert('包裹包装已保存，库存已扣减并生成流水！请前往交运确认页办理完结与回传。');
      navigate('/outbound');
    } catch (err: any) {
      alert(err.message || '包装保存失败');
    }
  };

  if (loading) {
    return <div className="forge-state-panel">正在解析单据数据...</div>;
  }

  if (!wave) {
    return <div className="forge-state-panel forge-state-panel--error">该波次单不存在</div>;
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12 text-xs">
      <PageHeader
        onBack={() => navigate('/outbound')}
        title={<><Inbox size={18} className="text-primary" /><span>称重打单与发货包装</span></>}
        description={<span className="font-mono">波次单号：{wave.id} | 物流承运商：{wave.carrier}</span>}
      />

      {/* 包装提示 */}
      <div className="bg-blue-50 text-blue-700 p-3 rounded border border-blue-200 flex items-start gap-2.5">
        <Info size={16} className="mt-0.5 shrink-0" />
        <div className="leading-relaxed">
          <strong className="block text-blue-800">发货包装说明：</strong>
          支持一票多件分箱称重。对于同一个波次合并的商品，可自由分配到多个包裹。输入包裹毛重（kg）及随箱的快递面单号，完成后点击“完成包装”保存包裹记录。
        </div>
      </div>

      {/* 包裹列表 */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
          <h3 className="font-bold text-slate-800 text-sm">出货包裹清单</h3>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={handleAddPackage}
            className="h-8 border-dashed text-primary font-bold flex items-center gap-1 cursor-pointer hover:bg-blue-50"
          >
            <Plus size={14} />
            <span>添加分箱包裹</span>
          </Button>
        </div>

        <div className="space-y-3">
          {packages.map((pkg, index) => (
            <div 
              key={pkg.id} 
              className="border border-slate-200 rounded-lg p-4 bg-slate-50/20 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* 包裹单号显示 */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-semibold block">包裹单号 PKG</span>
                <strong className="font-mono text-slate-800 text-xs tracking-wider font-bold">
                  {pkg.id}
                </strong>
              </div>

              {/* 重量输入 */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-semibold block">包裹毛重 (kg)</span>
                <Input
                  type="number"
                  placeholder="录入重量..."
                  value={pkg.weight}
                  onChange={e => handleFieldChange(index, 'weight', e.target.value)}
                  className="h-8 w-36 font-mono text-right text-xs"
                />
              </div>

              {/* 快递单号输入 */}
              <div className="space-y-1 flex-1 max-w-sm">
                <span className="text-[10px] text-slate-400 font-semibold block">快递运单号 (条码扫码)</span>
                <Input
                  placeholder="手工输入或扫码录入快递运单号..."
                  value={pkg.trackingNumber}
                  onChange={e => handleFieldChange(index, 'trackingNumber', e.target.value)}
                  className="h-8 font-mono text-xs"
                />
              </div>

              {/* 删除 */}
              <div className="flex items-end self-end md:self-center md:pt-4">
                <button
                  type="button"
                  onClick={() => handleRemovePackage(index)}
                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded border border-transparent hover:border-red-200 cursor-pointer"
                  title="删除此包裹"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 底部操作 */}
      <div className="forge-action-bar">
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
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
          onClick={handleSubmitPacking}
        >
          <CheckCircle size={14} />
          <span>确认包装完成</span>
        </Button>
      </div>
    </div>
  );
}

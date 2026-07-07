import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { inboundApi } from '../api/inbound';
import { baseDataApi } from '../api/baseData';
import { InboundOrder, InboundItem } from '../types/inbound';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Check, Smartphone, MapPin } from 'lucide-react';

export default function PutawayForm() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [order, setOrder] = useState<InboundOrder | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 上架临时状态：记录商品编码 -> 选中的货位
  const [putawayMap, setPutawayMap] = useState<Record<string, string>>({});
  // 当前正在弹窗选择货位的商品行编码
  const [activeSelectProduct, setActiveSelectProduct] = useState<string | null>(null);

  // 货位列表：只允许选择当前收货仓库下仍启用的货位
  const locations = useLiveQuery(
    () => order
      ? baseDataApi.getLocations({ warehouseCode: order.warehouseCode, activeOnly: true })
      : Promise.resolve([]),
    [order?.warehouseCode]
  ) || [];

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await inboundApi.getInboundById(id);
      if (data) {
        if (data.status !== 'RECEIVED') {
          alert('收货单未在已收货状态，无需执行上架！');
          navigate(`/inbound/${id}`);
          return;
        }
        setOrder(data);
        
        // 初始给已经选过的商品映射（如果有的话）
        const initialMap: Record<string, string> = {};
        data.items.forEach(item => {
          if (item.locationCode) {
            initialMap[item.productCode] = item.locationCode;
          }
        });
        setPutawayMap(initialMap);
      }
    } catch (err) {
      console.error(err);
      alert('加载收货单失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // 选择货位确认
  const handleLocationSelect = (locCode: string) => {
    if (activeSelectProduct) {
      setPutawayMap(prev => ({
        ...prev,
        [activeSelectProduct]: locCode
      }));
      setActiveSelectProduct(null);
    }
  };

  // 提交上架
  const handlePutawaySubmit = async () => {
    if (!order || !id) return;
    
    // 构建上架明细数组
    const putawayItems = order.items.map(item => {
      const loc = putawayMap[item.productCode];
      return {
        productCode: item.productCode,
        locationCode: loc,
        qty: item.receivedQuantity // 原型简化：将当前实收的全部数量上架到该货位
      };
    });

    try {
      await inboundApi.putawayConfirm(id, putawayItems, 'WmsOperator01');
      alert('上架确认成功！已生成 PUT 上架单，库存冻结量已扣减并转入可用量！');
      navigate(`/inbound/${id}`);
    } catch (err: any) {
      alert(err.message || '上架操作失败');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500 font-medium">正在解析单据数据...</div>;
  }

  if (!order) {
    return (
      <div className="bg-red-50 text-red-700 text-xs p-5 rounded border border-red-200 text-center font-medium">
        该收货单不存在
      </div>
    );
  }

  // 检查是否所有收货商品都已绑定货位（扫码上架）
  const allScanned = order.items.every(item => !!putawayMap[item.productCode]);

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12 text-xs">
      {/* 页头 */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <button 
          onClick={() => navigate(`/inbound/${id}`)} 
          className="p-1.5 rounded-md hover:bg-slate-100 border border-slate-200 bg-white text-slate-600 cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
            <Smartphone size={18} className="text-primary animate-bounce" />
            <span>PDA 手持终端扫描上架模拟</span>
          </h1>
          <p className="text-[10px] text-slate-400 mt-0.5">
            收货单：{order.id} | 收货仓库：{order.warehouseName}
          </p>
        </div>
      </div>

      {/* PDA 扫码背景与使用指南 */}
      <div className="bg-slate-900 text-slate-300 p-4 rounded-lg space-y-2 border border-slate-800 shadow-inner">
        <div className="flex items-center gap-2 text-white font-bold text-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
          <span>现场作业扫码模拟面板</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          WMS 现场无物理 PDA 硬件时，通过此面板模拟库位贴签扫描。点击商品行右侧的“扫码上架”以指定货架货位。所有商品归位变绿后，点击“确认上架”完成作业。
        </p>
      </div>

      {/* 上架明细列表 */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-150">
          <h3 className="font-bold text-slate-800">当前待上架商品清单</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {order.items.map((item, index) => {
            const loc = putawayMap[item.productCode];
            const isScanned = !!loc;
            return (
              <div 
                key={item.id} 
                className={`p-4 transition-colors flex items-center justify-between ${
                  isScanned ? 'bg-emerald-50/50' : 'hover:bg-slate-50/30'
                }`}
              >
                {/* 左侧商品信息 */}
                <div className="flex items-start gap-3">
                  <span className="font-mono text-slate-400 font-bold mt-0.5">{String(index + 1).padStart(2, '0')}</span>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{item.productName}</span>
                      <span className="font-mono font-bold text-[9px] bg-slate-100 text-slate-500 px-1 rounded">
                        {item.productCode}
                      </span>
                    </div>
                    <div className="text-slate-400 font-mono text-[10px]">
                      条码：{item.productBarcode} | 规格：{item.productSpec}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      待上架总数：<strong className="text-slate-700 font-mono font-bold">{item.receivedQuantity}</strong> {item.unit} (源自实收数)
                    </div>
                  </div>
                </div>

                {/* 右侧上架货位状态与操作 */}
                <div className="flex items-center gap-3">
                  {isScanned ? (
                    <div className="flex items-center gap-2 bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded font-bold">
                      <MapPin size={12} />
                      <span>已归位: {loc}</span>
                      <Check size={12} />
                    </div>
                  ) : (
                    <span className="text-slate-400 font-medium">未扫码定位</span>
                  )}
                  
                  <Button
                    variant={isScanned ? "outline" : "default"}
                    size="sm"
                    className="h-8 cursor-pointer font-bold"
                    onClick={() => setActiveSelectProduct(item.productCode)}
                  >
                    {isScanned ? '重扫/更改货位' : '模拟扫码上架'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 确认提交 */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate(`/inbound/${id}`)}
          className="cursor-pointer"
        >
          返回详情
        </Button>
        
        <Button
          size="sm"
          className={`font-bold flex items-center gap-1.5 cursor-pointer ${
            allScanned 
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse' 
              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
          }`}
          onClick={handlePutawaySubmit}
          disabled={!allScanned}
        >
          <Check size={14} />
          <span>确认上架完成</span>
        </Button>
      </div>

      {/* 货位选择弹窗 (模拟扫码) */}
      {activeSelectProduct && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-md w-full shadow-lg p-5">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1">
              <MapPin size={16} className="text-primary" />
              <span>选择物理上架存放货位</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-1.5">
              模拟 PDA 枪扫描货位架条码。请从以下推荐 WMS 仓库货位库中选择：
            </p>
            
            <div className="grid grid-cols-2 gap-2 mt-4 max-h-60 overflow-y-auto p-1">
              {locations.map(loc => (
                <button
                  key={loc.code}
                  onClick={() => handleLocationSelect(loc.code)}
                  className="p-2.5 text-left rounded-md border border-slate-200 hover:border-primary hover:bg-blue-50/50 transition-colors font-medium text-xs flex justify-between items-center cursor-pointer"
                >
                  <span className="font-mono font-bold text-slate-700">{loc.code}</span>
                  <span className="text-[10px] text-slate-400">{loc.zoneName}</span>
                </button>
              ))}
            </div>
            
            <div className="flex justify-end mt-5">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setActiveSelectProduct(null)}
                className="cursor-pointer"
              >
                取消
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

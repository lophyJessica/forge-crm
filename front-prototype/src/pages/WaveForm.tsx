import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { outboundApi } from '../api/outbound';
import { SalesOrder } from '../types/outbound';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import PageHeader from '../components/shared/PageHeader';
import { Textarea } from '../components/ui/Textarea';
import { Save, Plus, AlertTriangle, Info } from 'lucide-react';

export default function WaveForm() {
  const navigate = useNavigate();
  const { id } = useParams(); // 原型简化：仅支持新建波次，编辑可用草稿直接查看详情

  // --- 状态定义 ---
  const [waveType, setWaveType] = useState<'SYSTEM' | 'MANUAL'>('SYSTEM');
  const [carrier, setCarrier] = useState('顺丰速运');
  const [route, setRoute] = useState('北京同城华东线');
  const [remark, setRemark] = useState('');
  
  // 待出库订单列表及勾选状态
  const [pendingOrders, setPendingOrders] = useState<SalesOrder[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // 载入待合并的销售订单
  const loadOrders = async () => {
    setLoading(true);
    try {
      // 获取当前符合承运商和线路的订单（系统波次下强制对齐）
      const filterCarrier = waveType === 'SYSTEM' ? carrier : undefined;
      const filterRoute = waveType === 'SYSTEM' ? route : undefined;
      
      const list = await outboundApi.getPendingSalesOrders(filterCarrier, filterRoute);
      setPendingOrders(list);
      setSelectedOrderIds([]); // 重新选择后清空已选
    } catch (err) {
      console.error(err);
      alert('加载待合并销售订单出错');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [waveType, carrier, route]);

  // 勾选处理
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      // 强控上限50单
      if (pendingOrders.length > 50) {
        alert('警告：当前待合并单据数超过50单限制，默认仅勾选前50单！');
        setSelectedOrderIds(pendingOrders.slice(0, 50).map(o => o.id));
      } else {
        setSelectedOrderIds(pendingOrders.map(o => o.id));
      }
    } else {
      setSelectedOrderIds([]);
    }
  };

  const handleSelectRow = (soId: string, checked: boolean) => {
    if (checked) {
      // 检查上限50单
      if (selectedOrderIds.length >= 50) {
        alert('强控阻断：单个波次合并订单上限为 50 单，不可超出！');
        return;
      }
      setSelectedOrderIds(prev => [...prev, soId]);
    } else {
      setSelectedOrderIds(prev => prev.filter(x => x !== soId));
    }
  };

  // 生成波次
  const handleCreate = async () => {
    if (selectedOrderIds.length === 0) {
      alert('请至少勾选一个销售订单进行合并波次！');
      return;
    }
    if (selectedOrderIds.length > 50) {
      alert('强控拦截：合并单数超出上限 50 单，请重新核实！');
      return;
    }

    try {
      const wId = await outboundApi.createWave({
        waveType,
        carrier,
        route,
        remark,
        orderIds: selectedOrderIds
      }, 'Admin');
      alert(`波次单 ${wId} 创建成功！已自动将聚合后的商品绑定推荐货位并生成拣货明细。`);
      navigate('/outbound');
    } catch (err: any) {
      alert(err.message || '生成波次单失败');
    }
  };

  return (
    <div className="space-y-4 text-xs pb-12">
      <PageHeader
        onBack={() => navigate('/outbound')}
        title="新建拣货波次单"
        description="按承运商、线路进行销售订单聚合，提升仓库拣货现场路径效率"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左侧配置栏 */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4 h-fit">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">波次生成策略设定</h3>
          
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-500">波次类型</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setWaveType('SYSTEM')}
                  className={`flex-1 py-2 border rounded-md font-bold cursor-pointer transition-colors ${
                    waveType === 'SYSTEM'
                      ? 'border-primary text-primary bg-blue-50/50'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  系统自动波次
                </button>
                <button
                  type="button"
                  onClick={() => setWaveType('MANUAL')}
                  className={`flex-1 py-2 border rounded-md font-bold cursor-pointer transition-colors ${
                    waveType === 'MANUAL'
                      ? 'border-primary text-primary bg-blue-50/50'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  手动自组波次
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-500">物流承运商</label>
              <select
                value={carrier}
                onChange={e => setCarrier(e.target.value)}
                disabled={waveType === 'SYSTEM' && false} // 系统模式下作为主要筛选键
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="顺丰速运">顺丰速运</option>
                <option value="京东快递">京东快递</option>
                <option value="中通快递">中通快递</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-500">配送线路规划</label>
              <Input
                placeholder="例如：北京同城华东线..."
                value={route}
                onChange={e => setRoute(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-500">波次备注</label>
              <Textarea
                placeholder="关于本拣货批次的相关指示..."
                value={remark}
                onChange={e => setRemark(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>

          <div className="bg-blue-50 text-blue-700 p-3.5 rounded border border-blue-100 space-y-1 leading-relaxed">
            <div className="font-bold flex items-center gap-1">
              <Info size={12} />
              <span>智能合并提示</span>
            </div>
            <p className="text-[10px] text-blue-600/90 font-medium">
              系统波次模式下，将强制根据指定的承运商和线路，自动过滤并展示右侧待交运的销售订单，以防错发漏发。
            </p>
          </div>
        </div>

        {/* 右侧待选订单列表 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800">待合并出库销售订单 (SO)</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">仅显示待出库未锁定的订单</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-500">已勾选合并:</span>
                <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                  selectedOrderIds.length > 50 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {selectedOrderIds.length} / 50 单
                </span>
              </div>
            </div>

            {loading ? (
              <div className="forge-state-panel">正在载入订单...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={pendingOrders.length > 0 && selectedOrderIds.length === pendingOrders.length}
                          onChange={handleSelectAll}
                          className="rounded text-primary border-slate-300"
                        />
                      </th>
                      <th className="p-3">销售订单号</th>
                      <th className="p-3">客户</th>
                      <th className="p-3">承运商 / 线路</th>
                      <th className="p-3 text-right">商品种数</th>
                      <th className="p-3 text-right">总件数</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {pendingOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">
                          没有符合该承运商及线路的待出库订单
                        </td>
                      </tr>
                    ) : (
                      pendingOrders.map(row => {
                        const isChecked = selectedOrderIds.includes(row.id);
                        return (
                          <tr key={row.id} className="hover:bg-slate-50/50">
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={e => handleSelectRow(row.id, e.target.checked)}
                                className="rounded text-primary border-slate-300"
                              />
                            </td>
                            <td className="p-3 font-mono font-semibold text-slate-700">{row.id}</td>
                            <td className="p-3">{row.customerName}</td>
                            <td className="p-3">
                              <div className="font-semibold text-slate-600">{row.carrier}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{row.route}</div>
                            </td>
                            <td className="p-3 text-right font-mono">{row.itemCount}</td>
                            <td className="p-3 text-right font-mono font-bold text-slate-700">{row.totalQuantity}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 底部保存栏 */}
          <div className="forge-action-bar">
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/outbound')}
              className="cursor-pointer"
            >
              返回列表
            </Button>
            
            <div className="flex items-center gap-3">
              {selectedOrderIds.length > 50 && (
                <div className="flex items-center gap-1 text-red-500 font-bold">
                  <AlertTriangle size={14} />
                  <span>已超出50单上限</span>
                </div>
              )}
              <Button
                type="button"
                size="sm"
                onClick={handleCreate}
                disabled={selectedOrderIds.length === 0 || selectedOrderIds.length > 50}
                className="bg-primary hover:bg-primary/90 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Plus size={14} />
                <span>生成波次拣货单</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

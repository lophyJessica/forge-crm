import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { inventoryApi } from '../api/inventory';
import { InventoryFlow, FlowType } from '../types/inventory';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Search, RotateCcw, Download, Info } from 'lucide-react';

export default function FlowList() {
  // --- 状态定义 ---
  const [flows, setFlows] = useState<InventoryFlow[]>([]);
  const [warehouseCode, setWarehouseCode] = useState('');
  const [productCodeOrName, setProductCodeOrName] = useState('');
  const [flowType, setFlowType] = useState('');
  const [flowDirection, setFlowDirection] = useState<'IN' | 'OUT' | 'ALL'>('ALL');
  const [sourceOrderId, setSourceOrderId] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // 基础档案
  const warehouses = useLiveQuery(() => db.warehouses.toArray()) || [];

  // 获取默认时间跨度 (默认显示最近90天，便于首屏展示)
  useEffect(() => {
    const today = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(today.getDate() - 90);
    
    setDateStart(ninetyDaysAgo.toISOString().split('T')[0]);
    setDateEnd(today.toISOString().split('T')[0]);
  }, []);

  const loadData = async () => {
    try {
      const res = await inventoryApi.getFlows({
        warehouseCode: warehouseCode || undefined,
        productCodeOrName: productCodeOrName || undefined,
        flowType: flowType || undefined,
        flowDirection: flowDirection,
        dateStart: dateStart || undefined,
        dateEnd: dateEnd || undefined,
        sourceOrderId: sourceOrderId || undefined
      });
      setFlows(res);
    } catch (err: any) {
      alert(err.message || '查询流水失败');
    }
  };

  // 监听日期变化进行自动载入，但第一次等默认值设完再载入
  useEffect(() => {
    if (dateStart && dateEnd) {
      loadData();
    }
  }, [warehouseCode, flowType, flowDirection, dateStart, dateEnd]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleReset = () => {
    setWarehouseCode('');
    setProductCodeOrName('');
    setFlowType('');
    setFlowDirection('ALL');
    setSourceOrderId('');
    
    const today = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(today.getDate() - 90);
    setDateStart(ninetyDaysAgo.toISOString().split('T')[0]);
    setDateEnd(today.toISOString().split('T')[0]);
  };

  const handleExport = () => {
    if (flows.length === 0) return;
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(flows, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute("href", jsonStr);
    dl.setAttribute("download", `wms_inventory_flows_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(dl);
    dl.click();
    dl.remove();
  };

  const FLOW_TYPES: FlowType[] = [
    '采购入库', '上架确认', '销售出库', '零售出库', '调拨入库', '调拨出库', '盘盈', '盘亏', '报损'
  ];

  return (
    <div className="space-y-4 text-xs">
      {/* 页头 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900">库存收发流水台账</h1>
          <p className="text-xs text-slate-500 mt-1">追溯仓库所有物料出入库及盘点调拨变动的历史记账凭证 (只读审计)</p>
        </div>
        <div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport} 
            disabled={flows.length === 0}
            className="flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download size={14} />
            <span>导出收发流水</span>
          </Button>
        </div>
      </div>

      {/* 查询卡片 */}
      <form onSubmit={handleSearch} className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">仓库</label>
            <select
              value={warehouseCode}
              onChange={e => setWarehouseCode(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">全部仓库</option>
              {warehouses.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">商品编码 / 名称</label>
            <Input 
              placeholder="商品编码/名称模糊查询..." 
              value={productCodeOrName}
              onChange={e => setProductCodeOrName(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">业务变动类型</label>
            <select
              value={flowType}
              onChange={e => setFlowType(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 focus-visible:outline-none"
            >
              <option value="">全部变动类型</option>
              {FLOW_TYPES.map(ft => <option key={ft} value={ft}>{ft}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">出入方向</label>
            <select
              value={flowDirection}
              onChange={e => setFlowDirection(e.target.value as any)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 focus-visible:outline-none"
            >
              <option value="ALL">全部方向</option>
              <option value="IN">入库变动 (+)</option>
              <option value="OUT">出库变动 (-)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">来源业务单号</label>
            <Input 
              placeholder="RCV / WAVE / FL单号..." 
              value={sourceOrderId}
              onChange={e => setSourceOrderId(e.target.value)}
              className="h-9 font-mono"
            />
          </div>
          <div className="space-y-1 md:col-span-2 lg:col-span-2">
            <label className="font-semibold text-slate-500">变动时间范围</label>
            <div className="flex items-center gap-1">
              <Input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="h-9 text-xs" />
              <span className="text-slate-400">至</span>
              <Input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="h-9 text-xs" />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Info size={12} />
            <span>查询时间跨度严禁超过 365 天以确保数据库性能。</span>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleReset} className="flex items-center gap-1 cursor-pointer">
              <RotateCcw size={14} />
              <span>重置</span>
            </Button>
            <Button type="submit" size="sm" className="flex items-center gap-1 cursor-pointer">
              <Search size={14} />
              <span>查询</span>
            </Button>
          </div>
        </div>
      </form>

      {/* 列表表格 */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                <th className="p-3">流水号</th>
                <th className="p-3">发生记账时间</th>
                <th className="p-3">变动仓库</th>
                <th className="p-3">商品编码</th>
                <th className="p-3">商品名称/规格</th>
                <th className="p-3">单位</th>
                <th className="p-3">变动类型</th>
                <th className="p-3 text-right">变动件数</th>
                <th className="p-3 text-right">变动后现存</th>
                <th className="p-3">来源单号</th>
                <th className="p-3">经办操作人</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {flows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    暂无库存流水记录
                  </td>
                </tr>
              ) : (
                flows.map(row => {
                  const isPositive = row.qtyChange > 0;
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono text-slate-500">{row.id}</td>
                      <td className="p-3 font-mono text-slate-400 text-[10px]">{row.timestamp}</td>
                      <td className="p-3">{row.warehouseName}</td>
                      <td className="p-3 font-mono font-semibold">{row.productCode}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{row.productName}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{row.productSpec}</div>
                      </td>
                      <td className="p-3">{row.unit}</td>
                      <td className="p-3 font-bold text-slate-600">{row.flowType}</td>
                      <td className={`p-3 text-right font-mono font-bold ${
                        isPositive ? 'text-emerald-600 font-semibold' : 'text-slate-800'
                      }`}>
                        {isPositive ? `+${row.qtyChange}` : row.qtyChange}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800">{row.qtyAfter}</td>
                      <td className="p-3 font-mono text-primary font-semibold select-all">
                        {row.sourceOrderId}
                      </td>
                      <td className="p-3">{row.operator}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

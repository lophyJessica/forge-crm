import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { inventoryApi } from '../api/inventory';
import { InventoryStock } from '../types/inventory';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Search, RotateCcw, Download, AlertTriangle, Layers } from 'lucide-react';

export default function StockQuery() {
  // --- 状态定义 ---
  const [stocks, setStocks] = useState<InventoryStock[]>([]);
  const [warehouseCode, setWarehouseCode] = useState('');
  const [productCodeOrName, setProductCodeOrName] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [hideZero, setHideZero] = useState(false);

  // 基础档案
  const warehouses = useLiveQuery(() => db.warehouses.toArray()) || [];

  const loadData = async () => {
    try {
      const res = await inventoryApi.getStocks({
        warehouseCode: warehouseCode || undefined,
        productCodeOrName: productCodeOrName || undefined,
        batchNo: batchNo || undefined,
        hideZero
      });
      setStocks(res);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [warehouseCode, productCodeOrName, batchNo, hideZero]);

  const handleReset = () => {
    setWarehouseCode('');
    setProductCodeOrName('');
    setBatchNo('');
    setHideZero(false);
  };

  const handleExport = () => {
    if (stocks.length === 0) return;
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stocks, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute("href", jsonStr);
    dl.setAttribute("download", `wms_inventory_stocks_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(dl);
    dl.click();
    dl.remove();
  };

  return (
    <div className="space-y-4 text-xs">
      {/* 页头 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900">即时库存查询</h1>
          <p className="text-xs text-slate-500 mt-1">实时追踪仓库中各物料可用、占用、冻结及在途的详细数量分布</p>
        </div>
        <div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport} 
            disabled={stocks.length === 0}
            className="flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} />
            <span>导出库存台账</span>
          </Button>
        </div>
      </div>

      {/* 查询卡片 */}
      <form onSubmit={e => { e.preventDefault(); loadData(); }} className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">选择仓库</label>
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
              placeholder="拼音/编码/名称关键词..." 
              value={productCodeOrName}
              onChange={e => setProductCodeOrName(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">库存批次号</label>
            <Input 
              placeholder="输入批次号查询..." 
              value={batchNo}
              onChange={e => setBatchNo(e.target.value)}
              className="h-9 font-mono"
            />
          </div>
          
          {/* 零库存开关 */}
          <div className="flex items-center gap-2 h-9">
            <input
              type="checkbox"
              id="hideZeroCheck"
              checked={hideZero}
              onChange={e => setHideZero(e.target.checked)}
              className="rounded text-primary border-slate-300 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="hideZeroCheck" className="font-bold text-slate-700 cursor-pointer">
              不显示零库存商品 (现存量 ≤ 0)
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={handleReset} className="flex items-center gap-1 cursor-pointer">
            <RotateCcw size={14} />
            <span>重置</span>
          </Button>
          <Button type="submit" size="sm" className="flex items-center gap-1 cursor-pointer">
            <Search size={14} />
            <span>查询</span>
          </Button>
        </div>
      </form>

      {/* 数据表格 */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                <th className="p-3">商品编码</th>
                <th className="p-3">名称 / 规格</th>
                <th className="p-3">计量单位</th>
                <th className="p-3">库存仓库</th>
                <th className="p-3">入库批次</th>
                <th className="p-3 text-right">现存量</th>
                <th className="p-3 text-right">可用量</th>
                <th className="p-3 text-right text-blue-600">占用量</th>
                <th className="p-3 text-right text-orange-600">冻结量</th>
                <th className="p-3 text-right text-indigo-600">在途量</th>
                <th className="p-3 text-right">安全库存</th>
                <th className="p-3">最后变动时间</th>
                <th className="p-3 text-center">预警提示</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {stocks.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-400">
                    暂无符合条件的库存记录
                  </td>
                </tr>
              ) : (
                stocks.map(row => {
                  const isWarn = row.qtyAvailable < row.safetyStock;
                  const isNegativeTotal = row.qtyTotal < 0;

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-semibold">{row.productCode}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{row.productName}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{row.productSpec}</div>
                      </td>
                      <td className="p-3">{row.unit}</td>
                      <td className="p-3">{row.warehouseName}</td>
                      <td className="p-3 font-mono text-slate-500">{row.batchNo}</td>
                      <td className={`p-3 text-right font-mono font-bold ${
                        isNegativeTotal ? 'text-red-600' : 'text-slate-800'
                      }`}>
                        {row.qtyTotal}
                      </td>
                      <td className={`p-3 text-right font-mono font-bold ${
                        isWarn ? 'text-red-600' : 'text-slate-800'
                      }`}>
                        {row.qtyAvailable}
                      </td>
                      <td className="p-3 text-right font-mono text-blue-600 font-bold bg-blue-50/10">
                        {row.qtyAllocated || 0}
                      </td>
                      <td className="p-3 text-right font-mono text-orange-600 font-bold bg-orange-50/10">
                        {row.qtyFrozen || 0}
                      </td>
                      <td className="p-3 text-right font-mono text-indigo-600 font-bold bg-indigo-50/10">
                        {row.qtyOnWay || 0}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-400">{row.safetyStock}</td>
                      <td className="p-3 font-mono text-slate-400 text-[10px]">{row.lastModified}</td>
                      <td className="p-3 text-center">
                        {isWarn ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                            <AlertTriangle size={10} />
                            <span>低于安全库存</span>
                          </span>
                        ) : (
                          <span className="text-slate-300 font-normal">正常</span>
                        )}
                      </td>
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

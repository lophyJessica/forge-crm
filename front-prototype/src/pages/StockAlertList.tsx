import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Search, RotateCcw, AlertTriangle, CheckCircle } from 'lucide-react';

interface StockAlertItem {
  id: number;
  productCode: string;
  productName: string;
  productSpec: string;
  unit: string;
  warehouseCode: string;
  warehouseName: string;
  qtyTotal: number;
  qtyAllocated: number;
  qtyOnWay: number;
  safetyStock: number;
  minStock: number; // safetyStock * 0.4
  gapQty: number; // 缺口数量 = safetyStock - qtyTotal
  alertType: 'MINIMUM_LOW' | 'SAFETY_LOW' | 'NORMAL';
}

export default function StockAlertList() {
  // --- 状态定义 ---
  const [activeTab, setActiveTab] = useState<'ALL' | 'SAFETY_LOW' | 'MINIMUM_LOW'>('ALL');
  const [alertItems, setAlertItems] = useState<StockAlertItem[]>([]);
  
  // 筛选条件
  const [productKeyword, setProductKeyword] = useState('');
  const [warehouseCode, setWarehouseCode] = useState('');
  const [alertTypeFilter, setAlertTypeFilter] = useState<'ALL' | 'SAFETY_LOW' | 'MINIMUM_LOW'>('ALL');

  const warehouses = useLiveQuery(() => db.warehouses.toArray()) || [];

  // --- 数据计算 ---
  const loadData = async () => {
    try {
      const stocks = await db.inventory_stocks.toArray();
      const derived: StockAlertItem[] = stocks.map(s => {
        const safety = s.safetyStock || 0;
        const minLine = Math.round(safety * 0.4);
        const qty = s.qtyTotal || 0;

        let alertType: 'MINIMUM_LOW' | 'SAFETY_LOW' | 'NORMAL' = 'NORMAL';
        if (safety > 0) {
          if (qty <= minLine) {
            alertType = 'MINIMUM_LOW';
          } else if (qty < safety) {
            alertType = 'SAFETY_LOW';
          }
        }

        const gap = Math.max(0, safety - qty);

        return {
          id: s.id!,
          productCode: s.productCode,
          productName: s.productName,
          productSpec: s.productSpec,
          unit: s.unit,
          warehouseCode: s.warehouseCode,
          warehouseName: s.warehouseName,
          qtyTotal: qty,
          qtyAllocated: s.qtyAllocated || 0,
          qtyOnWay: s.qtyOnWay || 0,
          safetyStock: safety,
          minStock: minLine,
          gapQty: gap,
          alertType,
        };
      });

      // 过滤
      let filtered = derived;
      if (productKeyword) {
        filtered = filtered.filter(item => 
          item.productCode.toLowerCase().includes(productKeyword.toLowerCase().trim()) || 
          item.productName.toLowerCase().includes(productKeyword.toLowerCase().trim())
        );
      }
      if (warehouseCode) {
        filtered = filtered.filter(item => item.warehouseCode === warehouseCode);
      }

      // Tab / Filter 联动
      const currentFilter = activeTab === 'ALL' ? (alertTypeFilter === 'ALL' ? undefined : alertTypeFilter) : activeTab;
      if (currentFilter) {
        filtered = filtered.filter(item => item.alertType === currentFilter);
      }

      // 默认按缺口大小或者编码排序
      filtered.sort((a, b) => b.gapQty - a.gapQty || a.productCode.localeCompare(b.productCode));
      setAlertItems(filtered);
    } catch (err) {
      console.error('加载库存预警数据失败', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, alertTypeFilter, warehouseCode, productKeyword]);

  const handleReset = () => {
    setProductKeyword('');
    setWarehouseCode('');
    setAlertTypeFilter('ALL');
  };

  const getStatusBadge = (type: 'MINIMUM_LOW' | 'SAFETY_LOW' | 'NORMAL') => {
    const config = {
      MINIMUM_LOW: { label: '低于最低库存', classes: 'bg-rose-50 text-rose-700 border-rose-200 font-bold' },
      SAFETY_LOW: { label: '低于安全库存', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
      NORMAL: { label: '正常库存', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    };
    const current = config[type];
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${current.classes}`}>
        {current.label}
      </span>
    );
  };

  return (
    <div className="space-y-4 text-xs">
      {/* 页头 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900">库存预警管理</h1>
          <p className="text-xs text-slate-500 mt-1">系统对各仓库现存总量进行安全值监控。低于最低库存(≤安全值40%)标红，低于安全库存标黄</p>
        </div>
      </div>

      {/* 查询条件 */}
      <form onSubmit={(e) => { e.preventDefault(); loadData(); }} className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">商品编码 / 名称</label>
            <Input 
              placeholder="输入编码或名称..." 
              value={productKeyword} 
              onChange={e => setProductKeyword(e.target.value)} 
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">所在仓库</label>
            <select
              value={warehouseCode}
              onChange={e => setWarehouseCode(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">全部仓库</option>
              {warehouses.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">预警级别</label>
            <select
              value={alertTypeFilter}
              onChange={e => setAlertTypeFilter(e.target.value as any)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="ALL">全部级别</option>
              <option value="SAFETY_LOW">低于安全库存 (黄)</option>
              <option value="MINIMUM_LOW">低于最低库存 (红)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
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

      {/* Tabs */}
      <div className="border-b border-slate-200 flex justify-between items-end">
        <div className="flex gap-1 text-sm font-medium">
          {(['ALL', 'SAFETY_LOW', 'MINIMUM_LOW'] as const).map(tab => {
            const labelMap = { ALL: '全部', SAFETY_LOW: '安全库存预警', MINIMUM_LOW: '最低库存预警' };
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2.5 px-4 border-b-2 font-semibold text-xs transition-colors cursor-pointer ${
                  isActive 
                    ? 'border-primary text-primary font-bold' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {labelMap[tab]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3">预警状态</th>
                <th className="p-3">商品编码</th>
                <th className="p-3">商品名称 / 规格</th>
                <th className="p-3">单位</th>
                <th className="p-3">所在仓库</th>
                <th className="p-3 text-right">现存总量</th>
                <th className="p-3 text-right">安全库存线</th>
                <th className="p-3 text-right">最低库存线(40%)</th>
                <th className="p-3 text-right font-bold text-red-600">当前补货缺口</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {alertItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">暂无任何预警商品记录</td>
                </tr>
              ) : (
                alertItems.map((row, index) => {
                  let rowBg = '';
                  if (row.alertType === 'MINIMUM_LOW') {
                    rowBg = 'bg-rose-50/40 hover:bg-rose-50/70';
                  } else if (row.alertType === 'SAFETY_LOW') {
                    rowBg = 'bg-amber-50/20 hover:bg-amber-50/40';
                  } else {
                    rowBg = 'hover:bg-slate-50/50';
                  }

                  return (
                    <tr key={row.id} className={`${rowBg} transition-colors`}>
                      <td className="p-3 text-center text-slate-400 font-mono">{index + 1}</td>
                      <td className="p-3">{getStatusBadge(row.alertType)}</td>
                      <td className="p-3 font-mono font-semibold">{row.productCode}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{row.productName}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{row.productSpec}</div>
                      </td>
                      <td className="p-3">{row.unit}</td>
                      <td className="p-3">{row.warehouseName}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800">{row.qtyTotal}</td>
                      <td className="p-3 text-right font-mono text-slate-500">{row.safetyStock}</td>
                      <td className="p-3 text-right font-mono text-slate-500">{row.minStock}</td>
                      <td className="p-3 text-right font-mono font-bold text-rose-600">
                        {row.gapQty > 0 ? (
                          <div className="flex items-center justify-end gap-1 font-bold">
                            <AlertTriangle size={12} />
                            <span>{row.gapQty}</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1 text-emerald-600">
                            <CheckCircle size={12} />
                            <span>0 (足量)</span>
                          </div>
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

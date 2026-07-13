import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { WaveOrder } from '../types/outbound';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Search, RotateCcw, Eye, ArrowUpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface PickingVirtualOrder {
  id: string; // 拣货单号
  waveOrderId: string; // 来源出库波次
  carrier: string;
  route: string;
  itemCount: number;
  totalQty: number;
  status: 'PICKING' | 'COMPLETED';
  pickerId?: string;
  createdAt: string;
}

export default function PickingList() {
  const navigate = useNavigate();

  // --- 状态定义 ---
  const [activeTab, setActiveTab] = useState<'ALL' | 'PICKING' | 'COMPLETED'>('ALL');
  const [pickingOrders, setPickingOrders] = useState<PickingVirtualOrder[]>([]);
  
  // 筛选条件
  const [pickingId, setPickingId] = useState('');
  const [waveId, setWaveId] = useState('');
  const [pickerId, setPickerId] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PICKING' | 'COMPLETED'>('ALL');

  // --- 数据装载与派生 ---
  const loadData = async () => {
    try {
      const allWaves = await db.wave_orders.toArray();
      const derived: PickingVirtualOrder[] = allWaves
        .filter(wave => wave.status === 'PICKING' || wave.status === 'PICKED' || wave.status === 'CHECKED' || wave.status === 'SHIPPED')
        .map(wave => {
          const pickingStatus = wave.status === 'PICKING' ? 'PICKING' : 'COMPLETED';
          const pId = `PICK${wave.id.substring(4)}`;
          return {
            id: pId,
            waveOrderId: wave.id,
            carrier: wave.carrier,
            route: wave.route,
            itemCount: wave.items.length,
            totalQty: wave.items.reduce((sum, item) => sum + item.qtyRequired, 0),
            status: pickingStatus,
            pickerId: wave.pickerId,
            createdAt: wave.createdAt,
          };
        });

      // 过滤逻辑
      let filtered = derived;
      if (pickingId) {
        filtered = filtered.filter(o => o.id.toLowerCase().includes(pickingId.toLowerCase().trim()));
      }
      if (waveId) {
        filtered = filtered.filter(o => o.waveOrderId.toLowerCase().includes(waveId.toLowerCase().trim()));
      }
      if (pickerId) {
        filtered = filtered.filter(o => o.pickerId && o.pickerId.toLowerCase().includes(pickerId.toLowerCase().trim()));
      }

      // Tab / Status 过滤
      const currentTab = activeTab === 'ALL' ? (statusFilter === 'ALL' ? undefined : statusFilter) : activeTab;
      if (currentTab) {
        filtered = filtered.filter(o => o.status === currentTab);
      }

      // 按时间倒序
      filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setPickingOrders(filtered);
    } catch (err) {
      console.error('加载拣货单数据失败', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, statusFilter, pickingId, waveId, pickerId]);

  const handleReset = () => {
    setPickingId('');
    setWaveId('');
    setPickerId('');
    setStatusFilter('ALL');
  };

  const getStatusBadge = (status: 'PICKING' | 'COMPLETED') => {
    const config = {
      PICKING: { label: '拣货中', classes: 'bg-orange-50 text-orange-700 border-orange-200' },
      COMPLETED: { label: '已完成', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    };
    const current = config[status];
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
          <h1 className="text-xl font-bold text-slate-900">拣货单管理</h1>
          <p className="text-xs text-slate-500 mt-1">处理仓内下架及实物商品拣选合并作业，指导作业员依推荐货位下架</p>
        </div>
      </div>

      {/* 查询条件 */}
      <form onSubmit={(e) => { e.preventDefault(); loadData(); }} className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">拣货单号</label>
            <Input 
              placeholder="输入PICK单号..." 
              value={pickingId} 
              onChange={e => setPickingId(e.target.value)} 
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">来源波次单</label>
            <Input 
              placeholder="输入WAVE单号..." 
              value={waveId} 
              onChange={e => setWaveId(e.target.value)} 
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">拣货员</label>
            <Input 
              placeholder="输入拣货员ID..." 
              value={pickerId} 
              onChange={e => setPickerId(e.target.value)} 
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">拣货状态</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="ALL">全部状态</option>
              <option value="PICKING">拣货中</option>
              <option value="COMPLETED">已完成</option>
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
          {(['ALL', 'PICKING', 'COMPLETED'] as const).map(tab => {
            const labelMap = { ALL: '全部', PICKING: '拣货中', COMPLETED: '已完成' };
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
                <th className="p-3">拣货单号</th>
                <th className="p-3">状态</th>
                <th className="p-3">关联出库波次</th>
                <th className="p-3">承运商</th>
                <th className="p-3">出库线路</th>
                <th className="p-3">商品种数</th>
                <th className="p-3 text-right">应拣总件数</th>
                <th className="p-3">拣货作业员</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {pickingOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">暂无符合条件的拣货单记录</td>
                </tr>
              ) : (
                pickingOrders.map((row, index) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="p-3 text-center text-slate-400 font-mono">{index + 1}</td>
                    <td className="p-3 font-semibold text-primary font-mono hover:underline">
                      <Link to={`/outbound/pickings/${row.id}`}>{row.id}</Link>
                    </td>
                    <td className="p-3">{getStatusBadge(row.status)}</td>
                    <td className="p-3 font-mono text-slate-500">
                      <Link to={`/outbound/waves`} className="hover:underline">{row.waveOrderId}</Link>
                    </td>
                    <td className="p-3">{row.carrier}</td>
                    <td className="p-3">{row.route}</td>
                    <td className="p-3">{row.itemCount}</td>
                    <td className="p-3 text-right font-bold font-mono">{row.totalQty}</td>
                    <td className="p-3">{row.pickerId || '-'}</td>
                    <td className="p-3 text-center space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-primary hover:bg-blue-50"
                        onClick={() => navigate(`/outbound/pickings/${row.id}`)}
                      >
                        <Eye size={12} className="mr-1" />
                        <span>查看</span>
                      </Button>

                      {row.status === 'PICKING' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-orange-600 hover:bg-orange-50 font-bold"
                          onClick={() => navigate(`/outbound/waves/${row.waveOrderId}/pick`)}
                        >
                          <ArrowUpCircle size={12} className="mr-1" />
                          <span>执行拣货</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

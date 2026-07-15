import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import PageTitle from '../components/shared/PageTitle';
import FilterForm from '../components/shared/FilterForm';
import DataTable from '../components/shared/DataTable';
import Pagination from '../components/shared/Pagination';
import StatusTabs from '../components/shared/StatusTabs';
import { usePagination } from '../hooks/usePagination';
import { Search, RotateCcw, Eye, ArrowUpCircle } from 'lucide-react';

interface CheckVirtualOrder {
  id: string; // 复核单号
  waveOrderId: string; // 来源出库波次
  carrier: string;
  route: string;
  itemCount: number;
  totalQty: number;
  status: 'PENDING' | 'COMPLETED';
  pickerId?: string;
  createdAt: string;
}

export default function CheckList() {
  const navigate = useNavigate();

  // --- 状态定义 ---
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [checkOrders, setCheckOrders] = useState<CheckVirtualOrder[]>([]);
  const { page, pageSize, pageRows, setPage, changePageSize } = usePagination(checkOrders);
  
  // 筛选条件
  const [checkId, setCheckId] = useState('');
  const [waveId, setWaveId] = useState('');
  const [pickerId, setPickerId] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  // --- 数据装载与派生 ---
  const loadData = async () => {
    try {
      const allWaves = await db.wave_orders.toArray();
      const derived: CheckVirtualOrder[] = allWaves
        .filter(wave => wave.status === 'PICKED' || wave.status === 'CHECKED' || wave.status === 'SHIPPED')
        .map(wave => {
          const checkStatus = wave.status === 'PICKED' ? 'PENDING' : 'COMPLETED';
          const cId = `CHECK${wave.id.substring(4)}`;
          return {
            id: cId,
            waveOrderId: wave.id,
            carrier: wave.carrier,
            route: wave.route,
            itemCount: wave.items.length,
            totalQty: wave.items.reduce((sum, item) => sum + item.qtyRequired, 0),
            status: checkStatus,
            pickerId: wave.pickerId,
            createdAt: wave.createdAt,
          };
        });

      // 过滤逻辑
      let filtered = derived;
      if (checkId) {
        filtered = filtered.filter(o => o.id.toLowerCase().includes(checkId.toLowerCase().trim()));
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
      setCheckOrders(filtered);
    } catch (err) {
      console.error('加载复核单数据失败', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, statusFilter, checkId, waveId, pickerId]);

  const handleReset = () => {
    setCheckId('');
    setWaveId('');
    setPickerId('');
    setStatusFilter('ALL');
  };

  const getStatusBadge = (status: 'PENDING' | 'COMPLETED') => {
    const config = {
      PENDING: { label: '待复核', classes: 'bg-zinc-100 text-zinc-800 border-zinc-200' },
      COMPLETED: { label: '已完成', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    };
    const current = config[status] ?? { label: status || '未知状态', classes: 'bg-slate-100 text-slate-500 border-slate-200' };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${current.classes}`}>
        {current.label}
      </span>
    );
  };

  return (
    <div className="space-y-4 text-xs">
      {/* 页头 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <PageTitle compact title="出库复核单" description="对拣货完毕的实物商品进行二次扫描复核，验证条码、商品一致性及出库数量" />
        </div>
      </div>

      {/* 查询条件 */}
      <FilterForm onSubmit={(e) => { e.preventDefault(); loadData(); }}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">复核单号</label>
            <Input 
              placeholder="输入CHECK单号..." 
              value={checkId} 
              onChange={e => setCheckId(e.target.value)} 
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
            <label className="text-xs font-semibold text-slate-500">拣货员/执行人</label>
            <Input 
              placeholder="输入人员ID..." 
              value={pickerId} 
              onChange={e => setPickerId(e.target.value)} 
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">复核状态</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="ALL">全部状态</option>
              <option value="PENDING">待复核</option>
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
      </FilterForm>

      {/* Tabs */}
      <StatusTabs
        items={[
          { key: 'ALL', label: '全部' },
          { key: 'PENDING', label: '待复核' },
          { key: 'COMPLETED', label: '已完成' },
        ]}
        activeKey={activeTab}
        onChange={key => setActiveTab(key as 'ALL' | 'PENDING' | 'COMPLETED')}
        ariaLabel="复核单状态筛选"
      />

      {/* 表格 */}
      <DataTable minWidth="1180px">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3">复核单号</th>
                <th className="p-3">状态</th>
                <th className="p-3">关联出库波次</th>
                <th className="p-3">承运商</th>
                <th className="p-3">出库线路</th>
                <th className="p-3">商品种数</th>
                <th className="p-3 text-right">应复核总件数</th>
                <th className="p-3">拣货员</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {checkOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">暂无符合条件的复核单记录</td>
                </tr>
              ) : (
                pageRows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="p-3 text-center text-slate-400 font-mono">{index + 1}</td>
                    <td className="p-3 font-semibold text-primary font-mono hover:underline">
                      <Link to={`/outbound/checks/${row.id}`}>{row.id}</Link>
                    </td>
                    <td className="p-3">{getStatusBadge(row.status)}</td>
                    <td className="p-3 font-mono text-slate-500">
                      <Link to={`/outbound/${row.waveOrderId}`} className="hover:underline">{row.waveOrderId}</Link>
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
                        onClick={() => navigate(`/outbound/checks/${row.id}`)}
                      >
                        <Eye size={12} className="mr-1" />
                        <span>查看</span>
                      </Button>

                      {row.status === 'PENDING' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-emerald-600 hover:bg-emerald-50 font-bold"
                          onClick={() => navigate(`/outbound/${row.waveOrderId}/checking`)}
                        >
                          <ArrowUpCircle size={12} className="mr-1" />
                          <span>执行复核</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
      </DataTable>
      <Pagination page={page} pageSize={pageSize} total={checkOrders.length} onPageChange={setPage} onPageSizeChange={changePageSize} />
    </div>
  );
}

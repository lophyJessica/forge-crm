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
import { Search, RotateCcw, Eye, Package } from 'lucide-react';

export default function PackageList() {
  const navigate = useNavigate();

  // --- 状态定义 ---
  const [activeTab, setActiveTab] = useState<'ALL' | 'PACKED' | 'SHIPPED'>('ALL');
  const [packages, setPackages] = useState<any[]>([]);
  
  // 筛选条件
  const [packageId, setPackageId] = useState('');
  const [waveId, setWaveId] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PACKED' | 'SHIPPED'>('ALL');
  const { page, pageSize, pageRows, setPage, changePageSize } = usePagination(packages);

  // --- 数据装载 ---
  const loadData = async () => {
    try {
      let list = await db.pkg_records.toArray();

      if (packageId) {
        list = list.filter(p => p.id.toLowerCase().includes(packageId.toLowerCase().trim()));
      }
      if (waveId) {
        list = list.filter(p => p.waveId.toLowerCase().includes(waveId.toLowerCase().trim()));
      }
      if (trackingNumber) {
        list = list.filter(p => p.trackingNumber && p.trackingNumber.toLowerCase().includes(trackingNumber.toLowerCase().trim()));
      }

      // Tab / Status 过滤
      const currentTab = activeTab === 'ALL' ? (statusFilter === 'ALL' ? undefined : statusFilter) : activeTab;
      if (currentTab) {
        list = list.filter(p => p.status === currentTab);
      }

      // 按时间倒序排序
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setPackages(list);
    } catch (err) {
      console.error('加载包裹数据失败', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, statusFilter, packageId, waveId, trackingNumber]);

  const handleReset = () => {
    setPackageId('');
    setWaveId('');
    setTrackingNumber('');
    setStatusFilter('ALL');
  };

  const getStatusBadge = (status: 'PACKED' | 'SHIPPED') => {
    const config = {
      PACKED: { label: '已打包', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
      SHIPPED: { label: '已交运', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    };
    const current = config[status] || { label: status, classes: 'bg-slate-100 text-slate-700' };
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
          <PageTitle compact title="包裹记录管理" description="查看出库商品的包装箱记录、重量复称值、及快递物流追踪单号" />
        </div>
      </div>

      {/* 查询条件 */}
      <FilterForm onSubmit={(e) => { e.preventDefault(); loadData(); }}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">包裹号</label>
            <Input 
              placeholder="输入PKG单号..." 
              value={packageId} 
              onChange={e => setPackageId(e.target.value)} 
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">出库波次</label>
            <Input 
              placeholder="输入WAVE单号..." 
              value={waveId} 
              onChange={e => setWaveId(e.target.value)} 
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">快递运单号</label>
            <Input 
              placeholder="输入快递单号..." 
              value={trackingNumber} 
              onChange={e => setTrackingNumber(e.target.value)} 
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">包裹状态</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="ALL">全部状态</option>
              <option value="PACKED">已打包</option>
              <option value="SHIPPED">已交运</option>
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
          { key: 'PACKED', label: '已打包' },
          { key: 'SHIPPED', label: '已交运' },
        ]}
        activeKey={activeTab}
        onChange={key => setActiveTab(key as 'ALL' | 'PACKED' | 'SHIPPED')}
        ariaLabel="包裹状态筛选"
      />

      {/* 表格 */}
      <DataTable minWidth="1180px">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3">包裹号</th>
                <th className="p-3">状态</th>
                <th className="p-3">关联出库波次</th>
                <th className="p-3 text-right">称重质量 (kg)</th>
                <th className="p-3">快递面单号</th>
                <th className="p-3">打包生成时间</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {packages.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">暂无符合条件的包裹记录</td>
                </tr>
              ) : (
                pageRows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="p-3 text-center text-slate-400 font-mono">{index + 1}</td>
                    <td className="p-3 font-semibold text-primary font-mono hover:underline">
                      <Link to={`/outbound/packages/${row.id}`}>{row.id}</Link>
                    </td>
                    <td className="p-3">{getStatusBadge(row.status)}</td>
                    <td className="p-3 font-mono text-slate-500">
                      <Link to={`/outbound/${row.waveId}`} className="hover:underline">{row.waveId}</Link>
                    </td>
                    <td className="p-3 text-right font-bold font-mono text-slate-700">{row.weight.toFixed(2)}</td>
                    <td className="p-3 font-mono text-slate-600 font-semibold">{row.trackingNumber}</td>
                    <td className="p-3 font-mono text-slate-500">{row.createdAt}</td>
                    <td className="p-3 text-center">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-primary hover:bg-blue-50"
                        onClick={() => navigate(`/outbound/packages/${row.id}`)}
                      >
                        <Eye size={12} className="mr-1" />
                        <span>查看明细</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
      </DataTable>
      <Pagination page={page} pageSize={pageSize} total={packages.length} onPageChange={setPage} onPageSizeChange={changePageSize} />
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { outboundApi } from '../api/outbound';
import { WaveOrder, WaveStatus } from '../types/outbound';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import PageTitle from '../components/shared/PageTitle';
import FilterForm from '../components/shared/FilterForm';
import DataTable from '../components/shared/DataTable';
import Pagination from '../components/shared/Pagination';
import StatusTabs from '../components/shared/StatusTabs';
import { usePagination } from '../hooks/usePagination';
import { 
  Search, RotateCcw, Download, Eye, Edit, Trash2, 
  XCircle, CheckCircle, Navigation, UserCheck, Inbox, Truck
} from 'lucide-react';

export default function WaveList() {
  const navigate = useNavigate();

  // --- 状态定义 ---
  const [activeTab, setActiveTab] = useState<WaveStatus | 'ALL'>('ALL');
  const [waves, setWaves] = useState<WaveOrder[]>([]);
  const { page, pageSize, pageRows, setPage, changePageSize } = usePagination(waves);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // 筛选条件
  const [waveId, setWaveId] = useState('');
  const [carrier, setCarrier] = useState('');
  const [route, setRoute] = useState('');
  const [statusFilter, setStatusFilter] = useState<WaveStatus | 'ALL'>('ALL');
  const [createdAtStart, setCreatedAtStart] = useState('');
  const [createdAtEnd, setCreatedAtEnd] = useState('');

  // 分配拣货员弹窗
  const [assigningWaveId, setAssigningWaveId] = useState<string | null>(null);
  const [selectedPicker, setSelectedPicker] = useState('');

  // 状态计数
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});

  // 模拟拣货员列表
  const PICKERS = [
    { id: 'Picker01', name: '仓管员李强 (Picker01)' },
    { id: 'Picker02', name: '仓管员王芳 (Picker02)' },
    { id: 'Picker03', name: '现场组长赵勇 (Picker03)' },
  ];

  const loadData = async () => {
    const currentStatus = activeTab === 'ALL' ? (statusFilter === 'ALL' ? undefined : statusFilter) : activeTab;
    try {
      const res = await outboundApi.getWaves({
        id: waveId || undefined,
        carrier: carrier || undefined,
        route: route || undefined,
        status: currentStatus,
        createdAtStart: createdAtStart || undefined,
        createdAtEnd: createdAtEnd || undefined
      });

      // 附加计算包裹信息判断是否已经包装
      const finalWaves = await Promise.all(res.map(async w => {
        const pkgs = await outboundApi.getPackagesByWaveId(w.id);
        return {
          ...w,
          hasPackages: pkgs.length > 0
        };
      }));

      setWaves(finalWaves as any);
      setSelectedIds([]);

      // 计算计数
      const allStatuses: (WaveStatus | 'ALL')[] = ['ALL', 'DRAFT', 'PICKING', 'PICKED', 'CHECKED', 'SHIPPED', 'VOIDED'];
      const counts: Record<string, number> = {};
      for (const st of allStatuses) {
        const tempStatus = st === 'ALL' ? (statusFilter === 'ALL' ? undefined : statusFilter) : st;
        const tempRes = await outboundApi.getWaves({
          id: waveId || undefined,
          carrier: carrier || undefined,
          route: route || undefined,
          status: tempStatus,
          createdAtStart: createdAtStart || undefined,
          createdAtEnd: createdAtEnd || undefined
        });
        counts[st] = tempRes.length;
      }
      setTabCounts(counts);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, statusFilter, waveId, carrier, route, createdAtStart, createdAtEnd]);

  const handleReset = () => {
    setWaveId('');
    setCarrier('');
    setRoute('');
    setStatusFilter('ALL');
    setCreatedAtStart('');
    setCreatedAtEnd('');
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(current => Array.from(new Set([...current, ...pageRows.map(w => w.id)])));
    } else {
      setSelectedIds(current => current.filter(id => !pageRows.some(wave => wave.id === id)));
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(x => x !== id));
    }
  };

  // 确认分配拣货员
  const handleConfirmAssign = async () => {
    if (!assigningWaveId || !selectedPicker) return;
    try {
      await outboundApi.assignPicker(assigningWaveId, selectedPicker);
      setAssigningWaveId(null);
      setSelectedPicker('');
      loadData();
      alert('已成功指派拣货任务，波次单进入拣货中状态');
    } catch (err: any) {
      alert(err.message || '指派失败');
    }
  };

  // 作废波次
  const handleVoidWave = async (id: string) => {
    if (!window.confirm(`确定要作废波次单 ${id} 吗？`)) return;
    try {
      await outboundApi.voidWave(id, 'Admin');
      loadData();
      alert('波次已成功作废');
    } catch (err: any) {
      alert(err.message || '作废失败');
    }
  };

  const handleExport = () => {
    const exportData = selectedIds.length > 0
      ? waves.filter(w => selectedIds.includes(w.id))
      : waves;
    if (exportData.length === 0) {
      alert('无可导出的波次记录');
      return;
    }
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute("href", jsonStr);
    dl.setAttribute("download", `wms_waves_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(dl);
    dl.click();
    dl.remove();
  };

  // 获取状态标签样式
  const getStatusBadge = (status: WaveStatus) => {
    const config: Record<WaveStatus, { label: string; classes: string }> = {
      DRAFT: { label: '草稿', classes: 'bg-zinc-100 text-zinc-800 border-zinc-200' },
      PICKING: { label: '拣货中', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
      PICKED: { label: '已拣货', classes: 'bg-orange-50 text-orange-700 border-orange-200' },
      CHECKED: { label: '已复核', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
      SHIPPED: { label: '已交运', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      VOIDED: { label: '已作废', classes: 'bg-rose-50 text-rose-700 border-rose-200' }
    };
    const cur = config[status] || { label: status, classes: 'bg-slate-100 text-slate-800' };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${cur.classes}`}>
        {cur.label}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* 页头 */}
      <div className="flex flex-wrap items-start justify-between gap-3 text-xs">
        <div>
          <PageTitle compact title="波次出库管理" description="合并销售订单为拣货波次，规划路径进行 PDA 拣货、称重包装与物流交运" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="flex items-center gap-1.5 cursor-pointer">
            <Download size={14} />
            <span>导出波次</span>
          </Button>
          <Button size="sm" onClick={() => navigate('/outbound/new')} className="bg-primary hover:bg-primary/90 text-white flex items-center gap-1.5 cursor-pointer font-bold">
            <span>新建波次单</span>
          </Button>
        </div>
      </div>

      {/* 搜索 */}
      <FilterForm onSubmit={e => { e.preventDefault(); loadData(); }} className="grid grid-cols-1 md:grid-cols-6 gap-3 text-xs !space-y-0">
        <div className="space-y-1">
          <label className="font-semibold text-slate-500">波次单号</label>
          <Input placeholder="WAVE单号..." value={waveId} onChange={e => setWaveId(e.target.value)} className="h-9" />
        </div>
        <div className="space-y-1">
          <label className="font-semibold text-slate-500">承运商</label>
          <select value={carrier} onChange={e => setCarrier(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <option value="">全部承运商</option>
            <option value="顺丰速运">顺丰速运</option>
            <option value="京东快递">京东快递</option>
            <option value="中通快递">中通快递</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="font-semibold text-slate-500">配送线路</label>
          <Input placeholder="输入配送线路..." value={route} onChange={e => setRoute(e.target.value)} className="h-9" />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="font-semibold text-slate-500">创建日期</label>
          <div className="flex items-center gap-1">
            <Input type="date" value={createdAtStart} onChange={e => setCreatedAtStart(e.target.value)} className="h-9 text-xs" />
            <span className="text-slate-400">至</span>
            <Input type="date" value={createdAtEnd} onChange={e => setCreatedAtEnd(e.target.value)} className="h-9 text-xs" />
          </div>
        </div>
        <div className="flex items-end gap-2 pb-0.5">
          <Button type="button" variant="outline" size="sm" onClick={handleReset} className="w-full h-9 flex items-center justify-center gap-1 cursor-pointer">
            <RotateCcw size={14} />
            <span>重置</span>
          </Button>
          <Button type="submit" size="sm" className="w-full h-9 flex items-center justify-center gap-1 cursor-pointer">
            <Search size={14} />
            <span>查询</span>
          </Button>
        </div>
      </FilterForm>

      {/* Tabs */}
      <StatusTabs
        items={([
          { key: 'ALL', label: '全部' },
          { key: 'DRAFT', label: '草稿' },
          { key: 'PICKING', label: '拣货中' },
          { key: 'PICKED', label: '已拣货' },
          { key: 'CHECKED', label: '已复核' },
          { key: 'SHIPPED', label: '已交运' },
          { key: 'VOIDED', label: '已作废' },
        ] as const).map(tab => ({ ...tab, count: tabCounts[tab.key] || 0 }))}
        activeKey={activeTab}
        onChange={key => setActiveTab(key as WaveStatus | 'ALL')}
        ariaLabel="出库波次状态筛选"
      />

      {/* 表格 */}
      <DataTable minWidth="1280px">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={pageRows.length > 0 && pageRows.every(wave => selectedIds.includes(wave.id))}
                    onChange={handleSelectAll}
                    className="rounded text-primary border-slate-300"
                  />
                </th>
                <th className="p-3">波次单号</th>
                <th className="p-3">状态</th>
                <th className="p-3">承运商</th>
                <th className="p-3">线路</th>
                <th className="p-3 text-right">合并订单数</th>
                <th className="p-3 text-right">商品种数</th>
                <th className="p-3 text-right">件数总计</th>
                <th className="p-3">指派拣货员</th>
                <th className="p-3">创建时间</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {waves.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    暂无符合条件的波次记录
                  </td>
                </tr>
              ) : (
                pageRows.map(row => {
                  const isChecked = selectedIds.includes(row.id);
                  // 汇总件数
                  const totalQty = row.items.reduce((sum, i) => sum + i.qtyRequired, 0);
                  // 附加包裹判断
                  const isPacked = (row as any).hasPackages;

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/50 font-medium">
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => handleSelectRow(row.id, e.target.checked)}
                          className="rounded text-primary border-slate-300"
                        />
                      </td>
                      <td className="p-3 font-semibold text-primary font-mono hover:underline">
                        <Link to={`/outbound/${row.id}`}>{row.id}</Link>
                      </td>
                      <td className="p-3">{getStatusBadge(row.status)}</td>
                      <td className="p-3">{row.carrier}</td>
                      <td className="p-3 max-w-[120px] truncate" title={row.route}>{row.route}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-600">{row.orderIds.length}</td>
                      <td className="p-3 text-right font-mono">{row.items.length}</td>
                      <td className="p-3 text-right font-mono font-bold">{totalQty}</td>
                      <td className="p-3">
                        {row.pickerId ? (
                          <span className="font-semibold text-slate-800">{row.pickerId}</span>
                        ) : (
                          <span className="text-slate-300 font-normal">未指派</span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-slate-400">{row.createdAt}</td>
                      <td className="p-3 text-center space-x-1 whitespace-nowrap">
                        {row.status === 'DRAFT' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-primary hover:bg-blue-50 font-bold"
                              onClick={() => setAssigningWaveId(row.id)}
                            >
                              <UserCheck size={12} className="mr-1" />
                              <span>指派</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-red-600 hover:bg-red-50"
                              onClick={() => handleVoidWave(row.id)}
                            >
                              <XCircle size={12} className="mr-1" />
                              <span>作废</span>
                            </Button>
                          </>
                        )}

                        {row.status === 'PICKING' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-blue-600 hover:bg-blue-50 font-bold"
                            onClick={() => navigate(`/outbound/${row.id}/picking`)}
                          >
                            <Navigation size={12} className="mr-1" />
                            <span>PDA拣货</span>
                          </Button>
                        )}

                        {row.status === 'PICKED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-orange-600 hover:bg-orange-50 font-bold animate-pulse"
                            onClick={() => navigate(`/outbound/${row.id}/checking`)}
                          >
                            <CheckCircle size={12} className="mr-1" />
                            <span>去复核</span>
                          </Button>
                        )}

                        {row.status === 'CHECKED' && (
                          <>
                            {!isPacked ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-amber-600 hover:bg-amber-50 font-bold"
                                onClick={() => navigate(`/outbound/${row.id}/packing`)}
                              >
                                <Inbox size={12} className="mr-1" />
                                <span>去包装</span>
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-emerald-600 hover:bg-emerald-50 font-bold"
                                onClick={() => navigate(`/outbound/${row.id}/shipping`)}
                              >
                                <Truck size={12} className="mr-1" />
                                <span>交运确认</span>
                              </Button>
                            )}
                          </>
                        )}

                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-slate-500 hover:bg-slate-100"
                          onClick={() => navigate(`/outbound/${row.id}`)}
                        >
                          <Eye size={12} className="mr-1" />
                          <span>详情</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
      </DataTable>

      <Pagination page={page} pageSize={pageSize} total={waves.length} onPageChange={setPage} onPageSizeChange={changePageSize} />

      {/* 指派拣货员弹窗 */}
      {assigningWaveId && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 text-xs">
          <div className="bg-white rounded-lg border border-slate-200 max-w-sm w-full shadow-lg p-5">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1">
              <UserCheck size={16} className="text-primary" />
              <span>分配拣货现场操作员</span>
            </h3>
            <p className="text-slate-500 mt-2">
              请指派一名仓库现场人员前往货架层执行波次拣货：
            </p>
            <div className="mt-3">
              <select
                value={selectedPicker}
                onChange={e => setSelectedPicker(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-1 focus-visible:outline-none focus-visible:ring-2"
              >
                <option value="">-- 选择拣货作业员 --</option>
                {PICKERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" size="sm" onClick={() => setAssigningWaveId(null)} className="cursor-pointer">
                取消
              </Button>
              <Button 
                size="sm" 
                onClick={handleConfirmAssign} 
                disabled={!selectedPicker}
                className="cursor-pointer bg-primary text-white disabled:opacity-50 font-bold"
              >
                确定分配并下推拣货
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

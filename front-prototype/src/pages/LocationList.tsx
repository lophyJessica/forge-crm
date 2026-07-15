import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { baseDataApi } from '../api/baseData';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import PageTitle from '../components/shared/PageTitle';
import FilterForm from '../components/shared/FilterForm';
import DataTable from '../components/shared/DataTable';
import Pagination from '../components/shared/Pagination';
import { usePagination } from '../hooks/usePagination';
import {
  BASE_STATUS_LABELS,
  BaseDataStatus,
  LocationArchive,
  Warehouse,
  Zone,
} from '../types/baseData';
import { CheckCircle2, Edit, Plus, RotateCcw, Search, StopCircle } from 'lucide-react';

const statusBadge = (status: BaseDataStatus) => {
  const classes = status === 'ENABLED'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-slate-100 text-slate-500 border-slate-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${classes}`}>
      {BASE_STATUS_LABELS[status] ?? status ?? '未知状态'}
    </span>
  );
};

export default function LocationList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<LocationArchive[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [keyword, setKeyword] = useState('');
  const [warehouseCode, setWarehouseCode] = useState('');
  const [zoneCode, setZoneCode] = useState('');
  const [status, setStatus] = useState<BaseDataStatus | 'ALL'>('ALL');
  const { page, pageSize, pageRows, setPage, changePageSize } = usePagination(rows);

  const filteredZones = warehouseCode ? zones.filter(item => item.warehouseCode === warehouseCode) : zones;

  const loadData = async () => {
    const data = await baseDataApi.getLocations({ keyword, warehouseCode, zoneCode, status });
    setRows(data);
  };

  useEffect(() => {
    baseDataApi.getWarehouses().then(setWarehouses);
    baseDataApi.getZones().then(setZones);
  }, []);

  useEffect(() => {
    loadData();
  }, [keyword, warehouseCode, zoneCode, status]);

  const handleWarehouseChange = (value: string) => {
    setWarehouseCode(value);
    setZoneCode('');
  };

  const handleReset = () => {
    setKeyword('');
    setWarehouseCode('');
    setZoneCode('');
    setStatus('ALL');
  };

  const handleStatusChange = async (row: LocationArchive) => {
    const nextStatus: BaseDataStatus = row.status === 'ENABLED' ? 'DISABLED' : 'ENABLED';
    const actionName = nextStatus === 'DISABLED' ? '停用' : '启用';
    if (!window.confirm(`确认${actionName}货位 ${row.code} 吗？`)) return;

    try {
      await baseDataApi.setLocationStatus(row.code, nextStatus);
      await loadData();
    } catch (err: any) {
      alert(err.message || `${actionName}失败`);
    }
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <PageTitle compact title="货位管理" description="维护仓库内可扫描货位，停用后不再进入上架、拣货等业务候选" />
        </div>
        <Button size="sm" onClick={() => navigate('/base/locations/new')} className="flex items-center gap-1.5">
          <Plus size={14} />
          <span>新增货位</span>
        </Button>
      </div>

      <FilterForm onSubmit={e => { e.preventDefault(); loadData(); }}>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="space-y-1 md:col-span-2">
            <label className="font-semibold text-slate-500">编码 / 条码 / 仓库 / 库区</label>
            <Input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="输入关键词..." className="h-9" />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">所属仓库</label>
            <select value={warehouseCode} onChange={e => handleWarehouseChange(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 focus-visible:outline-none">
              <option value="">全部仓库</option>
              {warehouses.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">所属库区</label>
            <select value={zoneCode} onChange={e => setZoneCode(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 focus-visible:outline-none">
              <option value="">全部库区</option>
              {filteredZones.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">状态</label>
            <select value={status} onChange={e => setStatus(e.target.value as BaseDataStatus | 'ALL')} className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 focus-visible:outline-none">
              <option value="ALL">全部状态</option>
              <option value="ENABLED">启用</option>
              <option value="DISABLED">停用</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleReset} className="flex items-center gap-1">
              <RotateCcw size={14} />
              <span>重置</span>
            </Button>
            <Button type="submit" size="sm" className="flex items-center gap-1">
              <Search size={14} />
              <span>查询</span>
            </Button>
          </div>
        </div>
      </FilterForm>

      <DataTable minWidth="980px">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="p-3">货位编码</th>
                <th className="p-3">所属仓库</th>
                <th className="p-3">所属库区</th>
                <th className="p-3">条码</th>
                <th className="p-3">状态</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">暂无货位档案</td></tr>
              ) : pageRows.map(row => (
                <tr key={row.code} className="hover:bg-slate-50/50">
                  <td className="p-3 font-mono font-semibold text-primary">{row.code}</td>
                  <td className="p-3">{row.warehouseName}</td>
                  <td className="p-3">{row.zoneName}</td>
                  <td className="p-3 font-mono text-slate-500">{row.barcode}</td>
                  <td className="p-3">{statusBadge(row.status)}</td>
                  <td className="p-3 text-center space-x-1">
                    <Button variant="ghost" size="sm" className="h-7 text-blue-600 hover:bg-blue-50" onClick={() => navigate(`/base/locations/${row.code}/edit`)}>
                      <Edit size={12} className="mr-1" />
                      <span>编辑</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 ${row.status === 'ENABLED' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                      onClick={() => handleStatusChange(row)}
                    >
                      {row.status === 'ENABLED' ? <StopCircle size={12} className="mr-1" /> : <CheckCircle2 size={12} className="mr-1" />}
                      <span>{row.status === 'ENABLED' ? '停用' : '启用'}</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
      </DataTable>
      <Pagination page={page} pageSize={pageSize} total={rows.length} onPageChange={setPage} onPageSizeChange={changePageSize} />
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { baseDataApi } from '../api/baseData';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  BASE_STATUS_LABELS,
  BaseDataStatus,
  Warehouse,
  WAREHOUSE_TYPE_LABELS,
  WarehouseType,
} from '../types/baseData';
import { Edit, Plus, RotateCcw, Search, StopCircle, CheckCircle2 } from 'lucide-react';

const statusBadge = (status: BaseDataStatus) => {
  const classes = status === 'ENABLED'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-slate-100 text-slate-500 border-slate-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${classes}`}>
      {BASE_STATUS_LABELS[status]}
    </span>
  );
};

export default function WarehouseList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Warehouse[]>([]);
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState<WarehouseType | ''>('');
  const [status, setStatus] = useState<BaseDataStatus | 'ALL'>('ALL');

  const loadData = async () => {
    const data = await baseDataApi.getWarehouses({ keyword, type, status });
    setRows(data);
  };

  useEffect(() => {
    loadData();
  }, [type, status]);

  const handleReset = () => {
    setKeyword('');
    setType('');
    setStatus('ALL');
  };

  const handleStatusChange = async (row: Warehouse) => {
    const nextStatus: BaseDataStatus = row.status === 'ENABLED' ? 'DISABLED' : 'ENABLED';
    const actionName = nextStatus === 'DISABLED' ? '停用' : '启用';
    const ok = window.confirm(`确认${actionName}仓库 ${row.name} 吗？`);
    if (!ok) return;

    try {
      await baseDataApi.setWarehouseStatus(row.code, nextStatus);
      await loadData();
    } catch (err: any) {
      alert(err.message || `${actionName}失败`);
    }
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900">仓库档案</h1>
          <p className="text-xs text-slate-500 mt-1">维护 WMS 仓库主体资料，停用后不再进入业务单据候选范围</p>
        </div>
        <Button size="sm" onClick={() => navigate('/base/warehouses/new')} className="flex items-center gap-1.5">
          <Plus size={14} />
          <span>新增仓库</span>
        </Button>
      </div>

      <form onSubmit={e => { e.preventDefault(); loadData(); }} className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">编码 / 名称 / 负责人</label>
            <Input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="输入关键词..." className="h-9" />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">类型</label>
            <select value={type} onChange={e => setType(e.target.value as WarehouseType | '')} className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 focus-visible:outline-none">
              <option value="">全部类型</option>
              {Object.entries(WAREHOUSE_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
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
      </form>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="p-3">编码</th>
                <th className="p-3">名称</th>
                <th className="p-3">类型</th>
                <th className="p-3">负责人</th>
                <th className="p-3">地址</th>
                <th className="p-3">状态</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">暂无仓库档案</td></tr>
              ) : rows.map(row => (
                <tr key={row.code} className="hover:bg-slate-50/50">
                  <td className="p-3 font-mono font-semibold text-primary">{row.code}</td>
                  <td className="p-3 font-semibold">{row.name}</td>
                  <td className="p-3">{WAREHOUSE_TYPE_LABELS[row.type]}</td>
                  <td className="p-3">{row.manager}</td>
                  <td className="p-3 max-w-[260px] truncate" title={row.address}>{row.address}</td>
                  <td className="p-3">{statusBadge(row.status)}</td>
                  <td className="p-3 text-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-blue-600 hover:bg-blue-50"
                      onClick={() => navigate(`/base/warehouses/${row.code}/edit`)}
                    >
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
          </table>
        </div>
      </div>
    </div>
  );
}

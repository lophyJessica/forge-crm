import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { damageApi } from '../api/damage';
import { DAMAGE_REASON_LABELS, DAMAGE_STATUS_LABELS, DamageOrder, DamageReason, DamageStatus } from '../types/damage';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AlertTriangle, CheckCircle2, Download, Eye, Plus, RotateCcw, Search, XCircle, Send } from 'lucide-react';

const currentUser: { role: 'supervisor' | 'operator' } = {
  role: 'supervisor',
};

const statusClasses: Record<DamageStatus, string> = {
  DRAFT: 'bg-zinc-100 text-zinc-800 border-zinc-200',
  PENDING_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
  CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  VOIDED: 'bg-rose-50 text-rose-700 border-rose-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
};

const reasonOptions: Array<DamageReason | 'ALL'> = ['ALL', 'TRANSFER_LOSS', 'DAMAGED', 'EXPIRED', 'SHORTAGE'];

export default function DamageList() {
  const navigate = useNavigate();
  const warehouses = useLiveQuery(() => db.warehouses.toArray()) || [];
  const isSupervisor = currentUser.role === 'supervisor';

  const [activeTab, setActiveTab] = useState<DamageStatus | 'ALL'>('ALL');
  const [damages, setDamages] = useState<DamageOrder[]>([]);
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});
  const [damageId, setDamageId] = useState('');
  const [warehouseCode, setWarehouseCode] = useState('');
  const [reason, setReason] = useState<DamageReason | 'ALL'>('ALL');
  const [createdAtStart, setCreatedAtStart] = useState('');
  const [createdAtEnd, setCreatedAtEnd] = useState('');

  const loadData = async () => {
    const filters = {
      id: damageId || undefined,
      warehouseCode: warehouseCode || undefined,
      reason,
      createdAtStart: createdAtStart || undefined,
      createdAtEnd: createdAtEnd || undefined,
    };

    const list = await damageApi.getDamages({ ...filters, status: activeTab });
    setDamages(list);

    const nextCounts: Record<string, number> = {};
    for (const status of ['ALL', 'DRAFT', 'PENDING_REVIEW', 'CONFIRMED', 'VOIDED', 'REJECTED'] as const) {
      const rows = await damageApi.getDamages({ ...filters, status });
      nextCounts[status] = rows.length;
    }
    setTabCounts(nextCounts);
  };

  useEffect(() => {
    loadData();
  }, [activeTab, warehouseCode, reason, createdAtStart, createdAtEnd]);

  const handleReset = () => {
    setDamageId('');
    setWarehouseCode('');
    setReason('ALL');
    setCreatedAtStart('');
    setCreatedAtEnd('');
  };

  const handleSubmitForReview = async (id: string) => {
    if (!window.confirm(`确定要提交报损单 ${id} 进行审核吗？`)) return;
    try {
      await damageApi.submitDamageForReview(id, 'WmsOperator01');
      await loadData();
      alert('报损单已成功提交审核');
    } catch (err: any) {
      alert(err.message || '提交审核失败');
    }
  };

  const handleVoid = async (id: string) => {
    if (!window.confirm(`确定要作废报损单 ${id} 吗？`)) return;
    try {
      await damageApi.voidDamage(id, 'WmsOperator01');
      await loadData();
      alert('报损单已作废');
    } catch (err: any) {
      alert(err.message || '作废失败');
    }
  };

  const handleReject = async (id: string) => {
    const rejectedReason = window.prompt(`请输入驳回报损单 ${id} 的原因`);
    if (rejectedReason === null) return;
    try {
      await damageApi.rejectDamage(id, rejectedReason, 'WmsOperator01');
      await loadData();
      alert('报损单已驳回，已回退为草稿态');
    } catch (err: any) {
      alert(err.message || '驳回失败');
    }
  };

  const handleExport = () => {
    if (damages.length === 0) return;
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(damages, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute('href', jsonStr);
    dl.setAttribute('download', `wms_damages_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(dl);
    dl.click();
    dl.remove();
  };

  const renderStatus = (status: DamageStatus) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${statusClasses[status]}`}>
      {DAMAGE_STATUS_LABELS[status]}
    </span>
  );

  return (
    <div className="space-y-4 text-xs">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900">报损管理</h1>
          <p className="text-xs text-slate-500 mt-1">处理调拨差异、坏货、过期和短少等库存损耗，确认后立即扣减现存</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={damages.length === 0} className="flex items-center gap-1.5">
            <Download size={14} />
            <span>导出报损单</span>
          </Button>
          <Button size="sm" onClick={() => navigate('/inventory/damages/new')} className="bg-primary hover:bg-primary-hover text-white flex items-center gap-1.5 font-bold">
            <Plus size={14} />
            <span>新建报损单</span>
          </Button>
        </div>
      </div>

      <form onSubmit={e => { e.preventDefault(); loadData(); }} className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm grid grid-cols-1 md:grid-cols-7 gap-3">
        <div className="space-y-1">
          <label className="font-semibold text-slate-500">报损单号</label>
          <Input placeholder="输入BL单号..." value={damageId} onChange={e => setDamageId(e.target.value)} className="h-9 font-mono" />
        </div>
        <div className="space-y-1">
          <label className="font-semibold text-slate-500">仓库</label>
          <select value={warehouseCode} onChange={e => setWarehouseCode(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 focus-visible:outline-none focus-visible:ring-2">
            <option value="">全部仓库</option>
            {warehouses.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="font-semibold text-slate-500">报损原因</label>
          <select value={reason} onChange={e => setReason(e.target.value as DamageReason | 'ALL')} className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 focus-visible:outline-none focus-visible:ring-2">
            {reasonOptions.map(option => (
              <option key={option} value={option}>{option === 'ALL' ? '全部原因' : DAMAGE_REASON_LABELS[option]}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="font-semibold text-slate-500">创建时间</label>
          <div className="flex items-center gap-1">
            <Input type="date" value={createdAtStart} onChange={e => setCreatedAtStart(e.target.value)} className="h-9 text-xs" />
            <span className="text-slate-400">至</span>
            <Input type="date" value={createdAtEnd} onChange={e => setCreatedAtEnd(e.target.value)} className="h-9 text-xs" />
          </div>
        </div>
        <div className="md:col-span-2 flex items-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleReset} className="w-full h-9 flex items-center gap-1">
            <RotateCcw size={14} />
            <span>重置</span>
          </Button>
          <Button type="submit" size="sm" className="w-full h-9 flex items-center gap-1">
            <Search size={14} />
            <span>查询</span>
          </Button>
        </div>
      </form>

      <div className="border-b border-slate-200">
        <div className="flex gap-1 text-sm font-medium">
          {(['ALL', 'DRAFT', 'PENDING_REVIEW', 'CONFIRMED', 'VOIDED', 'REJECTED'] as const).map(tab => {
            const labels = { ALL: '全部', DRAFT: '草稿', PENDING_REVIEW: '待审核', CONFIRMED: '已确认', VOIDED: '已作废', REJECTED: '已驳回' };
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 border-b-2 font-bold text-xs cursor-pointer transition-colors ${
                  isActive ? 'border-primary text-primary bg-white rounded-t-md' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {labels[tab]} ({tabCounts[tab] || 0})
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                <th className="p-3">报损单号BL</th>
                <th className="p-3">仓库</th>
                <th className="p-3">报损原因</th>
                <th className="p-3">状态</th>
                <th className="p-3 text-right">商品种数</th>
                <th className="p-3 text-right">总数量</th>
                <th className="p-3">创建人</th>
                <th className="p-3">时间</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {damages.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">暂无符合条件的报损单</td>
                </tr>
              ) : damages.map(row => (
                <tr key={row.id} className="hover:bg-slate-50/50">
                  <td className="p-3 font-semibold text-primary font-mono hover:underline">
                    <Link to={`/inventory/damages/${row.id}`}>{row.id}</Link>
                  </td>
                  <td className="p-3">{row.warehouseName}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700 font-semibold">
                      <AlertTriangle size={12} />
                      {DAMAGE_REASON_LABELS[row.reason]}
                    </span>
                  </td>
                  <td className="p-3">{renderStatus(row.status)}</td>
                  <td className="p-3 text-right font-mono font-bold">{row.itemCount}</td>
                  <td className="p-3 text-right font-mono font-bold text-red-600">{row.totalQty}</td>
                  <td className="p-3">{row.createdBy}</td>
                  <td className="p-3 font-mono text-slate-400">{row.createdAt}</td>
                  <td className="p-3 text-center space-x-1 whitespace-nowrap">
                    <Button variant="ghost" size="sm" className="h-7 text-slate-500" onClick={() => navigate(`/inventory/damages/${row.id}`)}>
                      <Eye size={12} className="mr-1" />
                      <span>查看</span>
                    </Button>
                    {row.status === 'DRAFT' && (
                      <>
                        <Button variant="ghost" size="sm" className="h-7 text-blue-600 hover:bg-blue-50 font-bold" onClick={() => handleSubmitForReview(row.id)}>
                          <Send size={12} className="mr-1" />
                          <span>提交审核</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-red-600 hover:bg-red-50" onClick={() => handleVoid(row.id)}>
                          <XCircle size={12} className="mr-1" />
                          <span>作废</span>
                        </Button>
                      </>
                    )}
                    {row.status === 'PENDING_REVIEW' && (
                      <>
                        {isSupervisor && (
                          <Button variant="ghost" size="sm" className="h-7 text-emerald-600 hover:bg-emerald-50 font-bold" onClick={() => navigate(`/inventory/damages/${row.id}`)}>
                            <CheckCircle2 size={12} className="mr-1" />
                            <span>审核</span>
                          </Button>
                        )}
                        {isSupervisor && (
                          <Button variant="ghost" size="sm" className="h-7 text-amber-600 hover:bg-amber-50 font-bold" onClick={() => handleReject(row.id)}>
                            <XCircle size={12} className="mr-1" />
                            <span>驳回</span>
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 text-red-600 hover:bg-red-50" onClick={() => handleVoid(row.id)}>
                          <XCircle size={12} className="mr-1" />
                          <span>作废</span>
                        </Button>
                      </>
                    )}
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

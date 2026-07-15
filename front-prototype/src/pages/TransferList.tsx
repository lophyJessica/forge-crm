import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { inventoryOperationsApi } from '../api/inventoryOperations';
import { TRANSFER_STATUS_LABELS, TransferOrder, TransferStatus } from '../types/inventoryOperations';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import PageTitle from '../components/shared/PageTitle';
import FilterForm from '../components/shared/FilterForm';
import DataTable from '../components/shared/DataTable';
import Pagination from '../components/shared/Pagination';
import StatusTabs from '../components/shared/StatusTabs';
import { usePagination } from '../hooks/usePagination';
import { ArrowDownToLine, ArrowRightLeft, ArrowUpFromLine, CheckCircle2, Download, Eye, RotateCcw, Search, Send, XCircle } from 'lucide-react';

const currentUser: { role: 'supervisor' | 'operator' } = {
  role: 'supervisor',
};

const statusClasses: Record<TransferStatus, string> = {
  DRAFT: 'bg-zinc-100 text-zinc-800 border-zinc-200',
  PENDING_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
  CONFIRMED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  OUTBOUND: 'bg-orange-50 text-orange-700 border-orange-200',
  INBOUND: 'bg-blue-50 text-blue-700 border-blue-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  VOIDED: 'bg-rose-50 text-rose-700 border-rose-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function TransferList() {
  const navigate = useNavigate();
  const warehouses = useLiveQuery(() => db.warehouses.toArray()) || [];
  const pendingReviewDamages = useLiveQuery(
    () => db.damage_orders.where('status').equals('PENDING_REVIEW').toArray()
  ) || [];
  const isSupervisor = currentUser.role === 'supervisor';

  const [activeTab, setActiveTab] = useState<TransferStatus | 'ALL'>('ALL');
  const [transfers, setTransfers] = useState<TransferOrder[]>([]);
  const { page, pageSize, pageRows, setPage, changePageSize } = usePagination(transfers);
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});
  const [transferId, setTransferId] = useState('');
  const [outWarehouseCode, setOutWarehouseCode] = useState('');
  const [inWarehouseCode, setInWarehouseCode] = useState('');
  const [createdAtStart, setCreatedAtStart] = useState('');
  const [createdAtEnd, setCreatedAtEnd] = useState('');

  const loadData = async () => {
    const list = await inventoryOperationsApi.getTransfers({
      id: transferId || undefined,
      outWarehouseCode: outWarehouseCode || undefined,
      inWarehouseCode: inWarehouseCode || undefined,
      status: activeTab,
      createdAtStart: createdAtStart || undefined,
      createdAtEnd: createdAtEnd || undefined,
    });
    setTransfers(list);

    const nextCounts: Record<string, number> = {};
    for (const status of ['ALL', 'DRAFT', 'PENDING_REVIEW', 'CONFIRMED', 'OUTBOUND', 'INBOUND', 'COMPLETED', 'VOIDED', 'REJECTED'] as const) {
      const rows = await inventoryOperationsApi.getTransfers({
        id: transferId || undefined,
        outWarehouseCode: outWarehouseCode || undefined,
        inWarehouseCode: inWarehouseCode || undefined,
        status,
        createdAtStart: createdAtStart || undefined,
        createdAtEnd: createdAtEnd || undefined,
      });
      nextCounts[status] = rows.length;
    }
    setTabCounts(nextCounts);
  };

  useEffect(() => {
    loadData();
  }, [activeTab, transferId, outWarehouseCode, inWarehouseCode, createdAtStart, createdAtEnd]);

  const handleReset = () => {
    setTransferId('');
    setOutWarehouseCode('');
    setInWarehouseCode('');
    setCreatedAtStart('');
    setCreatedAtEnd('');
  };

  const handleSubmitForReview = async (id: string) => {
    if (!window.confirm(`确定要提交调拨单 ${id} 进行审核吗？`)) return;
    try {
      await inventoryOperationsApi.submitTransferForReview(id, 'WmsOperator01');
      await loadData();
      alert('调拨单已成功提交审核');
    } catch (err: any) {
      alert(err.message || '提交审核失败');
    }
  };

  const handleOutbound = async (id: string) => {
    try {
      await inventoryOperationsApi.confirmTransferOutbound(id, 'WmsOperator01');
      await loadData();
      alert('调拨单已确认出库，调拨数量已转入在途');
    } catch (err: any) {
      alert(err.message || '确认出库失败');
    }
  };

  const handleInbound = async (id: string) => {
    try {
      await inventoryOperationsApi.confirmTransferInbound(id, 'WmsOperator01');
      await loadData();
      alert('调拨单已确认入库，调入仓库存已更新');
    } catch (err: any) {
      alert(err.message || '确认入库失败');
    }
  };

  const handleVoid = async (id: string) => {
    if (!window.confirm(`确定要作废调拨单 ${id} 吗？`)) return;
    try {
      await inventoryOperationsApi.voidTransfer(id, 'WmsOperator01');
      await loadData();
      alert('调拨单已作废');
    } catch (err: any) {
      alert(err.message || '作废失败');
    }
  };

  const handleExport = () => {
    if (transfers.length === 0) return;
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(transfers, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute('href', jsonStr);
    dl.setAttribute('download', `wms_transfers_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(dl);
    dl.click();
    dl.remove();
  };

  const renderStatus = (status: TransferStatus) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${statusClasses[status] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
      {TRANSFER_STATUS_LABELS[status] ?? status ?? '未知状态'}
    </span>
  );

  return (
    <div className="space-y-4 text-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <PageTitle compact title="调拨管理" description="处理仓间调拨出库、在途与调入仓入库确认" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={transfers.length === 0} className="flex items-center gap-1.5">
            <Download size={14} />
            <span>导出调拨单</span>
          </Button>
          <Button size="sm" onClick={() => navigate('/inventory/transfers/new')} className="bg-primary hover:bg-primary/90 text-white flex items-center gap-1.5 font-bold">
            <ArrowRightLeft size={14} />
            <span>新建调拨单</span>
          </Button>
        </div>
      </div>

      <FilterForm onSubmit={e => { e.preventDefault(); loadData(); }} className="grid grid-cols-1 md:grid-cols-7 gap-3 !space-y-0">
        <div className="space-y-1">
          <label className="font-semibold text-slate-500">调拨单号</label>
          <Input placeholder="输入TR单号..." value={transferId} onChange={e => setTransferId(e.target.value)} className="h-9 font-mono" />
        </div>
        <div className="space-y-1">
          <label className="font-semibold text-slate-500">调出仓库</label>
          <select value={outWarehouseCode} onChange={e => setOutWarehouseCode(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 focus-visible:outline-none focus-visible:ring-2">
            <option value="">全部调出仓</option>
            {warehouses.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="font-semibold text-slate-500">调入仓库</label>
          <select value={inWarehouseCode} onChange={e => setInWarehouseCode(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 focus-visible:outline-none focus-visible:ring-2">
            <option value="">全部调入仓</option>
            {warehouses.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
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
      </FilterForm>

      <StatusTabs
        items={([
          { key: 'ALL', label: '全部' },
          { key: 'DRAFT', label: '草稿' },
          { key: 'PENDING_REVIEW', label: '待审核' },
          { key: 'CONFIRMED', label: '已审核' },
          { key: 'OUTBOUND', label: '已出库' },
          { key: 'INBOUND', label: '已入库' },
          { key: 'COMPLETED', label: '已完成' },
          { key: 'VOIDED', label: '已作废' },
          { key: 'REJECTED', label: '已驳回' },
        ] as const).map(tab => ({ ...tab, count: tabCounts[tab.key] || 0 }))}
        activeKey={activeTab}
        onChange={key => setActiveTab(key as TransferStatus | 'ALL')}
        ariaLabel="调拨单状态筛选"
      />

      <DataTable minWidth="1280px">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                <th className="p-3">调拨单号TR</th>
                <th className="p-3">调出仓库</th>
                <th className="p-3">调入仓库</th>
                <th className="p-3">状态</th>
                <th className="p-3 text-right">商品种数</th>
                <th className="p-3">创建时间</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">暂无符合条件的调拨单</td>
                </tr>
              ) : pageRows.map(row => (
                <tr key={row.id} className="hover:bg-slate-50/50">
                  <td className="p-3 font-semibold text-primary font-mono hover:underline">
                    <Link to={`/inventory/transfers/${row.id}`}>{row.id}</Link>
                  </td>
                  <td className="p-3">{row.outWarehouseName}</td>
                  <td className="p-3">{row.inWarehouseName}</td>
                  <td className="p-3">{renderStatus(row.status)}</td>
                  <td className="p-3 text-right font-mono font-bold">{row.itemCount}</td>
                  <td className="p-3 font-mono text-slate-400">{row.createdAt}</td>
                  <td className="p-3 text-center space-x-1 whitespace-nowrap">
                    <Button variant="ghost" size="sm" className="h-7 text-slate-500" onClick={() => navigate(`/inventory/transfers/${row.id}`)}>
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
                    {isSupervisor && row.status === 'PENDING_REVIEW' && (
                      <Button variant="ghost" size="sm" className="h-7 text-emerald-600 hover:bg-emerald-50 font-bold" onClick={() => navigate(`/inventory/transfers/${row.id}`)}>
                        <CheckCircle2 size={12} className="mr-1" />
                        <span>审核</span>
                      </Button>
                    )}
                    {row.status === 'CONFIRMED' && (
                      <Button variant="ghost" size="sm" className="h-7 text-orange-600 hover:bg-orange-50 font-bold" onClick={() => handleOutbound(row.id)}>
                        <ArrowUpFromLine size={12} className="mr-1" />
                        <span>确认出库</span>
                      </Button>
                    )}
                    {row.status === 'OUTBOUND' && (
                      <Button variant="ghost" size="sm" className="h-7 text-emerald-600 hover:bg-emerald-50 font-bold" onClick={() => handleInbound(row.id)}>
                        <ArrowDownToLine size={12} className="mr-1" />
                        <span>确认入库</span>
                      </Button>
                    )}
                    {isSupervisor && row.blNo && pendingReviewDamages.some(damage => damage.id === row.blNo) && (
                      <Button variant="ghost" size="sm" className="h-7 text-emerald-600 hover:bg-emerald-50 font-bold" onClick={() => navigate(`/inventory/damages/${row.blNo}`)}>
                        <CheckCircle2 size={12} className="mr-1" />
                        <span>审核</span>
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
      </DataTable>
      <Pagination page={page} pageSize={pageSize} total={transfers.length} onPageChange={setPage} onPageSizeChange={changePageSize} />
    </div>
  );
}

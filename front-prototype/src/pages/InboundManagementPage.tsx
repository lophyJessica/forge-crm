import React, { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../db';
import { inboundApi } from '../api/inbound';
import { InboundOrder, InboundStatus } from '../types/inbound';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import PageTitle from '../components/shared/PageTitle';
import FilterForm from '../components/shared/FilterForm';
import DataTable from '../components/shared/DataTable';
import Pagination from '../components/shared/Pagination';
import StatusTabs from '../components/shared/StatusTabs';
import {
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  PackageCheck,
  Printer,
  RotateCcw,
  Search,
  X,
  XCircle,
} from 'lucide-react';

type StatusTab = InboundStatus | 'ALL';

interface InboundQuery {
  rcvNumber: string;
  poNumber: string;
  productKeyword: string;
  supplierCode: string;
  warehouseCode: string;
  status: StatusTab;
  receiveDateStart: string;
  receiveDateEnd: string;
}

const EMPTY_QUERY: InboundQuery = {
  rcvNumber: '',
  poNumber: '',
  productKeyword: '',
  supplierCode: '',
  warehouseCode: '',
  status: 'ALL',
  receiveDateStart: '',
  receiveDateEnd: '',
};

const STATUS_TABS: Array<{ key: StatusTab; label: string }> = [
  { key: 'ALL', label: '全部' },
  { key: 'DRAFT', label: '待收货' },
  { key: 'RECEIVING', label: '收货中' },
  { key: 'QC_PENDING', label: '待质检' },
  { key: 'PUTAWAY_PENDING', label: '待上架' },
  { key: 'EXCEPTION', label: '异常' },
  { key: 'COMPLETED', label: '已完成' },
  { key: 'VOIDED', label: '已作废' },
];

const STATUS_CONFIG: Record<InboundStatus, { label: string; className: string }> = {
  DRAFT: { label: '待收货', className: 'bg-zinc-100 text-zinc-700' },
  RECEIVING: { label: '收货中', className: 'bg-blue-50 text-blue-700' },
  QC_PENDING: { label: '待质检', className: 'bg-amber-50 text-amber-700' },
  PUTAWAY_PENDING: { label: '待上架', className: 'bg-orange-50 text-orange-700' },
  EXCEPTION: { label: '异常', className: 'bg-rose-50 text-rose-700' },
  COMPLETED: { label: '已完成', className: 'bg-emerald-50 text-emerald-700' },
  VOIDED: { label: '已作废', className: 'bg-slate-100 text-slate-500' },
};

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block min-w-0 space-y-1 ${className}`}>
      <span className="block text-xs font-semibold text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function fieldClassName() {
  return 'h-9 rounded-md border-slate-200 bg-white text-xs shadow-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
}

function Select({ value, onChange, children, ariaLabel }: { value: string; onChange: (value: string) => void; children: React.ReactNode; ariaLabel: string }) {
  return (
    <select
      value={value}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
      className={`w-full ${fieldClassName()} px-3 py-1 outline-none`}
    >
      {children}
    </select>
  );
}

function formatWarehouse(order: InboundOrder) {
  return `${order.warehouseName} / 收货区`;
}

function includesText(value: string, keyword: string) {
  return value.toLocaleLowerCase().includes(keyword.trim().toLocaleLowerCase());
}

export default function InboundManagementPage() {
  const navigate = useNavigate();
  const orders = useLiveQuery(() => db.inbound_orders.toArray(), []) || [];
  const suppliers = useLiveQuery(() => db.suppliers.toArray(), []) || [];
  const warehouses = useLiveQuery(() => db.warehouses.toArray(), []) || [];

  const [activeTab, setActiveTab] = useState<StatusTab>('ALL');
  const [draftQuery, setDraftQuery] = useState<InboundQuery>(EMPTY_QUERY);
  const [query, setQuery] = useState<InboundQuery>(EMPTY_QUERY);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [qcOrder, setQcOrder] = useState<InboundOrder | null>(null);

  const matchesQuery = (order: InboundOrder, includeStatus = true) => {
    if (query.rcvNumber && !includesText(order.id, query.rcvNumber)) return false;
    if (query.poNumber && !includesText(order.purchaseOrderId, query.poNumber)) return false;
    if (query.productKeyword && !order.items.some((item) => includesText(item.productCode, query.productKeyword) || includesText(item.productName, query.productKeyword))) return false;
    if (query.supplierCode && order.supplierCode !== query.supplierCode) return false;
    if (query.warehouseCode && order.warehouseCode !== query.warehouseCode) return false;
    if (query.receiveDateStart && order.receiveDate < query.receiveDateStart) return false;
    if (query.receiveDateEnd && order.receiveDate > query.receiveDateEnd) return false;
    if (includeStatus && query.status !== 'ALL' && order.status !== query.status) return false;
    return true;
  };

  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => matchesQuery(order) && (activeTab === 'ALL' || order.status === activeTab))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [orders, query, activeTab]);

  const tabCounts = useMemo(() => {
    return STATUS_TABS.reduce<Record<string, number>>((counts, tab) => {
      counts[tab.key] = orders.filter((order) => matchesQuery(order, false) && (tab.key === 'ALL' || order.status === tab.key)).length;
      return counts;
    }, {});
  }, [orders, query]);

  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const pageOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
    setSelectedIds([]);
  }, [pageCount, query, activeTab]);

  const updateDraft = (key: keyof InboundQuery, value: string) => {
    setDraftQuery((current) => ({ ...current, [key]: value }));
  };

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQuery(draftQuery);
    if (draftQuery.status !== 'ALL') setActiveTab('ALL');
    setPage(1);
  };

  const handleReset = () => {
    setDraftQuery(EMPTY_QUERY);
    setQuery(EMPTY_QUERY);
    setActiveTab('ALL');
    setPage(1);
  };

  const handleTabChange = (tab: StatusTab) => {
    setActiveTab(tab);
    setDraftQuery((current) => ({ ...current, status: 'ALL' }));
    setQuery((current) => ({ ...current, status: 'ALL' }));
    setPage(1);
  };

  const handlePageSizeChange = (nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? pageOrders.map((order) => order.id) : []);
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedIds((current) => checked ? [...current, id] : current.filter((item) => item !== id));
  };

  const handleVoid = async () => {
    if (!voidingId || !voidReason.trim()) return;
    try {
      await inboundApi.voidInbound(voidingId, voidReason.trim(), 'WmsOperator01');
      setVoidingId(null);
      setVoidReason('');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '作废失败');
    }
  };

  const handleQC = async (passed: boolean) => {
    if (!qcOrder) return;
    try {
      await inboundApi.handleQualityCheck(qcOrder.id, passed, 'WmsOperator01');
      setQcOrder(null);
      window.alert(passed ? '质检合格，已生成待上架任务' : '已登记为异常单据');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '质检登记失败');
    }
  };

  const handlePrint = (order: InboundOrder) => {
    window.alert(`收货单 ${order.id} 已发送打印，共 ${order.totalReceivedQuantity} 张标签`);
  };

  const handleExport = () => {
    const exportOrders = selectedIds.length > 0 ? filteredOrders.filter((order) => selectedIds.includes(order.id)) : filteredOrders;
    if (exportOrders.length === 0) {
      window.alert('当前没有可导出的记录');
      return;
    }
    const blob = new Blob([JSON.stringify(exportOrders, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `forge-wms-inbounds-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleBatchPrint = () => {
    if (selectedIds.length === 0) {
      window.alert('请先勾选需要打印的收货单');
      return;
    }
    const selectedOrders = filteredOrders.filter((order) => selectedIds.includes(order.id));
    const printable = selectedOrders.every((order) => ['QC_PENDING', 'PUTAWAY_PENDING', 'EXCEPTION', 'COMPLETED'].includes(order.status));
    if (!printable) {
      window.alert('仅待质检、待上架、异常和已完成单据支持打印标签');
      return;
    }
    window.alert(`已发送 ${selectedOrders.length} 张收货单的标签打印任务`);
  };

  const allPageSelected = pageOrders.length > 0 && pageOrders.every((order) => selectedIds.includes(order.id));

  return (
    <div className="space-y-4">
      <PageTitle
        eyebrow="入库作业管理"
        title="收货单管理"
        description="查看采购订单下推的收货任务，完成到货登记、质检和上架衔接"
        actions={(
          <>
            <Button type="button" variant="outline" size="sm" onClick={handleBatchPrint} className="gap-1.5 border-orange-200 text-orange-700 hover:bg-orange-50">
              <Printer size={14} />
              批量打印标签
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
              <Download size={14} />
              数据导出
            </Button>
          </>
        )}
      />

      <FilterForm
        onSubmit={handleSearch}
        footer={(
          <span className="text-[11px] text-slate-400">支持单号、PO、SKU 模糊查询；日期按收货日期筛选</span>
        )}
      >
        <div className="grid grid-cols-12 gap-x-3 gap-y-3">
          <Field label="收货单号" className="col-span-12 md:col-span-6 lg:col-span-2">
            <Input value={draftQuery.rcvNumber} onChange={(event) => updateDraft('rcvNumber', event.target.value)} placeholder="输入 RCV 单号" className={fieldClassName()} />
          </Field>
          <Field label="来源采购订单" className="col-span-12 md:col-span-6 lg:col-span-2">
            <Input value={draftQuery.poNumber} onChange={(event) => updateDraft('poNumber', event.target.value)} placeholder="输入 PO 单号" className={fieldClassName()} />
          </Field>
          <Field label="商品编码 / SKU" className="col-span-12 md:col-span-6 lg:col-span-2">
            <Input value={draftQuery.productKeyword} onChange={(event) => updateDraft('productKeyword', event.target.value)} placeholder="输入 SKU 或商品名" className={fieldClassName()} />
          </Field>
          <Field label="供应商" className="col-span-12 md:col-span-6 lg:col-span-2">
            <Select value={draftQuery.supplierCode} onChange={(value) => updateDraft('supplierCode', value)} ariaLabel="供应商">
              <option value="">全部供应商</option>
              {suppliers.map((supplier) => <option key={supplier.code} value={supplier.code}>{supplier.name}</option>)}
            </Select>
          </Field>
          <Field label="收货仓库" className="col-span-12 md:col-span-6 lg:col-span-2">
            <Select value={draftQuery.warehouseCode} onChange={(value) => updateDraft('warehouseCode', value)} ariaLabel="收货仓库">
              <option value="">全部仓库</option>
              {warehouses.map((warehouse) => <option key={warehouse.code} value={warehouse.code}>{warehouse.name}</option>)}
            </Select>
          </Field>
          <Field label="状态" className="col-span-12 md:col-span-6 lg:col-span-2">
            <Select value={draftQuery.status} onChange={(value) => { updateDraft('status', value); setActiveTab('ALL'); }} ariaLabel="单据状态">
              {STATUS_TABS.map((status) => <option key={status.key} value={status.key}>{status.label}</option>)}
            </Select>
          </Field>
          <Field label="收货日期" className="col-span-12 lg:col-span-4">
            <div className="flex items-center gap-2">
              <Input type="date" value={draftQuery.receiveDateStart} onChange={(event) => updateDraft('receiveDateStart', event.target.value)} className={`${fieldClassName()} min-w-0 flex-1`} />
              <span className="shrink-0 text-xs text-slate-400">至</span>
              <Input type="date" value={draftQuery.receiveDateEnd} onChange={(event) => updateDraft('receiveDateEnd', event.target.value)} className={`${fieldClassName()} min-w-0 flex-1`} />
            </div>
          </Field>
          <div className="col-span-12 flex items-end justify-end gap-2 lg:col-span-8">
            <Button type="button" variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
              <RotateCcw size={14} />
              重置
            </Button>
            <Button type="submit" size="sm" className="gap-1.5">
              <Search size={14} />
              查询
            </Button>
          </div>
        </div>
      </FilterForm>

      <div className="relative">
        <StatusTabs
          items={STATUS_TABS.map(tab => ({ ...tab, count: tabCounts[tab.key] ?? 0 }))}
          activeKey={activeTab}
          onChange={key => handleTabChange(key as StatusTab)}
          ariaLabel="入库单状态筛选"
        />
        <span className="absolute right-3 top-4 hidden text-[11px] text-slate-400 xl:block">共 {filteredOrders.length} 条收货记录</span>
      </div>

      <DataTable minWidth="1480px">
        <thead>
          <tr className="h-11 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
            <th className="w-11 px-3 text-center">
              <input type="checkbox" aria-label="选择当前页" checked={allPageSelected} onChange={(event) => handleSelectAll(event.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            </th>
            <th className="px-3">收货单号</th>
            <th className="px-3">状态</th>
            <th className="px-3">来源 PO</th>
            <th className="px-3">供应商</th>
            <th className="px-3">仓库 / 库区</th>
            <th className="px-3">收货日期</th>
            <th className="px-3 text-center">商品种数</th>
            <th className="px-3 text-right">实收合计</th>
            <th className="w-[290px] px-3 text-center">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
          {pageOrders.length === 0 ? (
            <tr><td colSpan={10} className="h-48 text-center text-slate-400">未找到符合条件的收货单</td></tr>
          ) : pageOrders.map((order) => {
            const config = STATUS_CONFIG[order.status] ?? {
              label: order.status || '未知状态',
              className: 'bg-slate-100 text-slate-500',
            };
            return (
              <tr key={order.id} className="h-12 transition-colors hover:bg-slate-50">
                <td className="px-3 text-center">
                  <input type="checkbox" aria-label={`选择 ${order.id}`} checked={selectedIds.includes(order.id)} onChange={(event) => handleSelectRow(order.id, event.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                </td>
                <td className="px-3 font-mono font-semibold text-blue-600"><Link to={`/inbound/${order.id}`} className="hover:underline">{order.id}</Link></td>
                <td className="px-3"><span className={`inline-flex rounded px-2 py-1 text-[11px] font-semibold ${config.className}`}>{config.label}</span></td>
                <td className="px-3 font-mono text-slate-500">{order.purchaseOrderId}</td>
                <td className="max-w-[190px] truncate px-3" title={order.supplierName}>{order.supplierName}</td>
                <td className="px-3">{formatWarehouse(order)}</td>
                <td className="px-3 font-mono text-slate-500">{order.receiveDate}</td>
                <td className="px-3 text-center">{order.itemCount}</td>
                <td className="px-3 text-right font-mono font-semibold text-slate-800">{order.totalReceivedQuantity}</td>
                <td className="px-3">
                  <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                    <Button type="button" variant="ghost" size="sm" onClick={() => navigate(`/inbound/${order.id}`)} className="h-7 gap-1 px-2 text-slate-600 hover:bg-slate-100"><Eye size={13} />查看</Button>
                    {(order.status === 'DRAFT' || order.status === 'RECEIVING') && <Button type="button" variant="ghost" size="sm" onClick={() => navigate(`/inbound/${order.id}/edit`)} className="h-7 gap-1 px-2 text-blue-600 hover:bg-blue-50"><PackageCheck size={13} />执行收货</Button>}
                    {order.status === 'DRAFT' && <Button type="button" variant="ghost" size="sm" onClick={() => { setVoidingId(order.id); setVoidReason(''); }} className="h-7 gap-1 px-2 text-rose-600 hover:bg-rose-50"><XCircle size={13} />作废</Button>}
                    {order.status === 'QC_PENDING' && <Button type="button" variant="ghost" size="sm" onClick={() => setQcOrder(order)} className="h-7 gap-1 px-2 font-semibold text-orange-700 hover:bg-orange-50"><ClipboardCheck size={13} />质检登记</Button>}
                    {['QC_PENDING', 'PUTAWAY_PENDING', 'EXCEPTION', 'COMPLETED'].includes(order.status) && <Button type="button" variant="ghost" size="sm" onClick={() => handlePrint(order)} className="h-7 gap-1 px-2 text-slate-600 hover:bg-slate-100"><Printer size={13} />打印</Button>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </DataTable>

      <Pagination page={page} pageSize={pageSize} total={filteredOrders.length} onPageChange={setPage} onPageSizeChange={handlePageSizeChange} />

      {(voidingId || qcOrder) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          {voidingId && (
            <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">确认作废收货单</h2>
                <button type="button" aria-label="关闭作废弹窗" title="关闭" onClick={() => setVoidingId(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={16} /></button>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">作废后单据将无法继续收货，请填写原因。</p>
              <Input value={voidReason} onChange={(event) => setVoidReason(event.target.value)} placeholder="请输入作废原因" className="mt-4 h-9 text-xs" />
              <div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setVoidingId(null)}>取消</Button><Button type="button" variant="destructive" size="sm" disabled={!voidReason.trim()} onClick={handleVoid}>确认作废</Button></div>
            </div>
          )}
          {qcOrder && (
            <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between"><h2 className="text-sm font-bold text-slate-900">质检登记</h2><button type="button" aria-label="关闭质检弹窗" title="关闭" onClick={() => setQcOrder(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={16} /></button></div>
              <p className="mt-2 text-xs leading-5 text-slate-500">收货单 <span className="font-mono text-slate-700">{qcOrder.id}</span>，实收合计 <span className="font-semibold text-slate-700">{qcOrder.totalReceivedQuantity}</span> 件。</p>
              <div className="mt-4 rounded-md border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-800">合格后生成待上架任务，不合格则将单据标记为异常。</div>
              <div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setQcOrder(null)}>取消</Button><Button type="button" variant="outline" size="sm" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => handleQC(false)}>判定不合格</Button><Button type="button" size="sm" className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => handleQC(true)}><CheckCircle2 size={14} />判定合格</Button></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

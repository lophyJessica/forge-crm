import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { inboundApi } from '../api/inbound';
import { InboundOrder } from '../types/inbound';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import PageTitle from '../components/shared/PageTitle';
import FilterForm from '../components/shared/FilterForm';
import DataTable from '../components/shared/DataTable';
import Pagination from '../components/shared/Pagination';
import StatusTabs from '../components/shared/StatusTabs';
import { usePagination } from '../hooks/usePagination';
import { Search, RotateCcw, Eye, ArrowUpCircle, ChevronDown, ChevronUp, Layers } from 'lucide-react';

interface PutawayVirtualOrder {
  id: string; // 上架单号
  inboundOrderId: string; // 来源收货单
  warehouseCode: string;
  warehouseName: string;
  itemCount: number;
  totalQty: number;
  status: 'PENDING' | 'PUTAWAYING' | 'COMPLETED';
  operator?: string;
  putawayDate?: string;
  createdAt: string;
}

export default function PutawayList() {
  const navigate = useNavigate();

  // --- 状态定义 ---
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'PUTAWAYING' | 'COMPLETED'>('ALL');
  const [putawayOrders, setPutawayOrders] = useState<PutawayVirtualOrder[]>([]);
  const { page, pageSize, pageRows, setPage, changePageSize } = usePagination(putawayOrders);
  
  // 筛选条件
  const [putawayId, setPutawayId] = useState('');
  const [inboundId, setInboundId] = useState('');
  const [warehouseCode, setWarehouseCode] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PUTAWAYING' | 'COMPLETED'>('ALL');

  const warehouses = useLiveQuery(() => db.warehouses.toArray()) || [];

  // --- 数据装载与派生 ---
  const loadData = async () => {
    try {
      // 获取可以生成上架单的收货单 (状态为待上架、已完成、异常、或者待质检但已有上架动作的)
      const allInbounds = await db.inbound_orders.toArray();
      const derived: PutawayVirtualOrder[] = allInbounds
        .filter(order => order.status === 'QC_PENDING' || order.status === 'PUTAWAY_PENDING' || order.status === 'EXCEPTION' || order.status === 'COMPLETED')
        .map(order => {
          const hasRecord = order.putawayRecords && order.putawayRecords.length > 0;
          const record = hasRecord ? order.putawayRecords![0] : null;
          
          let putStatus: 'PENDING' | 'PUTAWAYING' | 'COMPLETED' = 'PENDING';
          if (order.status === 'COMPLETED') {
            putStatus = 'COMPLETED';
          } else if (hasRecord) {
            putStatus = 'PUTAWAYING';
          }

          const vId = record?.id || `PUT${order.id.substring(3)}`;
          return {
            id: vId,
            inboundOrderId: order.id,
            warehouseCode: order.warehouseCode,
            warehouseName: order.warehouseName,
            itemCount: order.items.length,
            totalQty: order.totalReceivedQuantity || 0,
            status: putStatus,
            operator: record?.operator,
            putawayDate: record?.putawayDate,
            createdAt: order.createdAt,
          };
        });

      // 过滤逻辑
      let filtered = derived;
      if (putawayId) {
        filtered = filtered.filter(o => o.id.toLowerCase().includes(putawayId.toLowerCase().trim()));
      }
      if (inboundId) {
        filtered = filtered.filter(o => o.inboundOrderId.toLowerCase().includes(inboundId.toLowerCase().trim()));
      }
      if (warehouseCode) {
        filtered = filtered.filter(o => o.warehouseCode === warehouseCode);
      }

      // Tab / Status 过滤
      const currentTab = activeTab === 'ALL' ? (statusFilter === 'ALL' ? undefined : statusFilter) : activeTab;
      if (currentTab) {
        filtered = filtered.filter(o => o.status === currentTab);
      }

      // 按创建时间倒序
      filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setPutawayOrders(filtered);
    } catch (err) {
      console.error('加载上架单数据失败', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, statusFilter, warehouseCode, putawayId, inboundId]);

  const handleReset = () => {
    setPutawayId('');
    setInboundId('');
    setWarehouseCode('');
    setStatusFilter('ALL');
  };

  const getStatusBadge = (status: 'PENDING' | 'PUTAWAYING' | 'COMPLETED') => {
    const config = {
      PENDING: { label: '待上架', classes: 'bg-zinc-100 text-zinc-800 border-zinc-200' },
      PUTAWAYING: { label: '上架中', classes: 'bg-orange-50 text-orange-700 border-orange-200' },
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
          <PageTitle compact title="上架单管理" description="根据收货上架指令，将实物商品从收货缓存区搬运上架至指定货位" />
        </div>
      </div>

      {/* 查询条件 */}
      <FilterForm onSubmit={(e) => { e.preventDefault(); loadData(); }}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">上架单号</label>
            <Input 
              placeholder="输入PUT单号..." 
              value={putawayId} 
              onChange={e => setPutawayId(e.target.value)} 
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">来源收货单</label>
            <Input 
              placeholder="输入RCV单号..." 
              value={inboundId} 
              onChange={e => setInboundId(e.target.value)} 
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">收货仓库</label>
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
            <label className="text-xs font-semibold text-slate-500">上架状态</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="ALL">全部状态</option>
              <option value="PENDING">待上架</option>
              <option value="PUTAWAYING">上架中</option>
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
          { key: 'PENDING', label: '待上架' },
          { key: 'PUTAWAYING', label: '上架中' },
          { key: 'COMPLETED', label: '已完成' },
        ]}
        activeKey={activeTab}
        onChange={key => setActiveTab(key as 'ALL' | 'PENDING' | 'PUTAWAYING' | 'COMPLETED')}
        ariaLabel="上架单状态筛选"
      />

      {/* 表格 */}
      <DataTable minWidth="1180px">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3">上架单号</th>
                <th className="p-3">状态</th>
                <th className="p-3">来源收货单</th>
                <th className="p-3">收货仓库</th>
                <th className="p-3">商品种数</th>
                <th className="p-3 text-right">上架总件数</th>
                <th className="p-3">执行人</th>
                <th className="p-3">上架时间</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {putawayOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">暂无符合条件的上架单记录</td>
                </tr>
              ) : (
                pageRows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="p-3 text-center text-slate-400 font-mono">{index + 1}</td>
                    <td className="p-3 font-semibold text-primary font-mono hover:underline">
                      <Link to={`/inventory/putaways/${row.id}`}>{row.id}</Link>
                    </td>
                    <td className="p-3">{getStatusBadge(row.status)}</td>
                    <td className="p-3 font-mono text-slate-500">
                      <Link to={`/inbound/${row.inboundOrderId}`} className="hover:underline hover:text-primary">{row.inboundOrderId}</Link>
                    </td>
                    <td className="p-3">{row.warehouseName}</td>
                    <td className="p-3">{row.itemCount}</td>
                    <td className="p-3 text-right font-bold font-mono">{row.totalQty}</td>
                    <td className="p-3">{row.operator || '-'}</td>
                    <td className="p-3 font-mono text-slate-500">{row.putawayDate ? row.putawayDate.split(' ')[0] : '-'}</td>
                    <td className="p-3 text-center space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-primary hover:bg-blue-50"
                        onClick={() => navigate(`/inventory/putaways/${row.id}`)}
                      >
                        <Eye size={12} className="mr-1" />
                        <span>查看</span>
                      </Button>

                      {row.status !== 'COMPLETED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-emerald-600 hover:bg-emerald-50 font-bold"
                          onClick={() => navigate(`/inbound/${row.inboundOrderId}/putaway`)}
                        >
                          <ArrowUpCircle size={12} className="mr-1" />
                          <span>执行上架</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
      </DataTable>
      <Pagination page={page} pageSize={pageSize} total={putawayOrders.length} onPageChange={setPage} onPageSizeChange={changePageSize} />
    </div>
  );
}

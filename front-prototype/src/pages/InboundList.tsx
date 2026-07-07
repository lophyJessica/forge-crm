import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { inboundApi } from '../api/inbound';
import { InboundOrder, InboundStatus } from '../types/inbound';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  Search, RotateCcw, ChevronDown, ChevronUp, 
  Download, Eye, Edit, Trash2, XCircle, CheckCircle, ArrowUpCircle 
} from 'lucide-react';

export default function InboundList() {
  const navigate = useNavigate();

  // --- 状态定义 ---
  const [activeTab, setActiveTab] = useState<InboundStatus | 'ALL'>('ALL');
  const [inbounds, setInbounds] = useState<InboundOrder[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // 筛选条件状态
  const [rcvNumber, setRcvNumber] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [supplierCode, setSupplierCode] = useState('');
  const [warehouseCode, setWarehouseCode] = useState('');
  const [statusFilter, setStatusFilter] = useState<InboundStatus | 'ALL'>('ALL');
  const [receiveDateStart, setReceiveDateStart] = useState('');
  const [receiveDateEnd, setReceiveDateEnd] = useState('');
  const [updatedDateStart, setUpdatedDateStart] = useState('');
  const [updatedDateEnd, setUpdatedDateEnd] = useState('');

  // 展开折叠高级筛选
  const [isExpanded, setIsExpanded] = useState(false);

  // 作废弹窗状态
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');

  // 质检弹窗状态
  const [qcOrder, setQcOrder] = useState<InboundOrder | null>(null);

  // 二次确认弹窗状态
  const [confirmAction, setConfirmAction] = useState<{
    type: 'DELETE' | 'RECEIVE' | null;
    title: string;
    msg: string;
    orderId: string | null;
  }>({ type: null, title: '', msg: '', orderId: null });

  // 基础资料实时查询 (Dexie)
  const suppliers = useLiveQuery(() => db.suppliers.toArray()) || [];
  const warehouses = useLiveQuery(() => db.warehouses.toArray()) || [];

  // 各状态数量计数
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});

  // --- 数据加载 ---
  const loadData = async () => {
    const currentStatus = activeTab === 'ALL' ? (statusFilter === 'ALL' ? undefined : statusFilter) : activeTab;
    
    try {
      const res = await inboundApi.getInbounds({
        id: rcvNumber || undefined,
        purchaseOrderId: poNumber || undefined,
        supplierCode: supplierCode || undefined,
        warehouseCode: warehouseCode || undefined,
        status: currentStatus,
        receiveDateStart: receiveDateStart || undefined,
        receiveDateEnd: receiveDateEnd || undefined,
        updatedDateStart: isExpanded ? updatedDateStart || undefined : undefined,
        updatedDateEnd: isExpanded ? updatedDateEnd || undefined : undefined,
      });

      setInbounds(res);
      setSelectedIds([]);

      // 计算 Tab 数量计数
      const allStatuses: (InboundStatus | 'ALL')[] = ['ALL', 'DRAFT', 'RECEIVED', 'PUTAWAY', 'VOIDED'];
      const counts: Record<string, number> = {};
      
      for (const st of allStatuses) {
        const tempStatus = st === 'ALL' ? (statusFilter === 'ALL' ? undefined : statusFilter) : st;
        const tempRes = await inboundApi.getInbounds({
          id: rcvNumber || undefined,
          purchaseOrderId: poNumber || undefined,
          supplierCode: supplierCode || undefined,
          warehouseCode: warehouseCode || undefined,
          status: tempStatus,
          receiveDateStart: receiveDateStart || undefined,
          receiveDateEnd: receiveDateEnd || undefined,
          updatedDateStart: isExpanded ? updatedDateStart || undefined : undefined,
          updatedDateEnd: isExpanded ? updatedDateEnd || undefined : undefined,
        });
        counts[st] = tempRes.length;
      }
      setTabCounts(counts);
    } catch (err: any) {
      console.error("加载收货单数据失败", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, statusFilter, supplierCode, warehouseCode, receiveDateStart, receiveDateEnd, updatedDateStart, updatedDateEnd, isExpanded]);

  // --- 交互处理 ---
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleReset = () => {
    setRcvNumber('');
    setPoNumber('');
    setSupplierCode('');
    setWarehouseCode('');
    setStatusFilter('ALL');
    setReceiveDateStart('');
    setReceiveDateEnd('');
    setUpdatedDateStart('');
    setUpdatedDateEnd('');
  };

  const handleTabChange = (tab: InboundStatus | 'ALL') => {
    setActiveTab(tab);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(inbounds.map(o => o.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(x => x !== id));
    }
  };

  const handleVoidClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setVoidingId(id);
    setVoidReason('');
  };

  const handleConfirmVoid = async () => {
    if (!voidingId) return;
    try {
      await inboundApi.voidInbound(voidingId, voidReason, 'WmsOperator01');
      setVoidingId(null);
      loadData();
    } catch (err: any) {
      alert(err.message || '作废失败');
    }
  };

  const handleQCResult = async (isPassed: boolean) => {
    if (!qcOrder) return;
    try {
      await inboundApi.handleQualityCheck(qcOrder.id, isPassed, 'WmsOperator01');
      setQcOrder(null);
      loadData();
      alert(isPassed ? '质检合格判定成功，现可开始上架流程' : '质检判定不合格，已自动作废单据并退回');
    } catch (err: any) {
      alert(err.message || '判定失败');
    }
  };

  const executeAction = async () => {
    const { type, orderId } = confirmAction;
    if (!orderId) return;
    try {
      if (type === 'DELETE') {
        await inboundApi.deleteInbound(orderId);
        alert('收货草稿单已物理删除');
      } else if (type === 'RECEIVE') {
        await inboundApi.confirmInboundReceipt(orderId, 'WmsOperator01');
        alert('确认收货成功，库存已转入冻结并生成收货流水，等待质检上架');
      }
      setConfirmAction({ type: null, title: '', msg: '', orderId: null });
      loadData();
    } catch (err: any) {
      alert(err.message || '操作失败');
    }
  };

  const handleExport = () => {
    const exportData = selectedIds.length > 0 
      ? inbounds.filter(o => selectedIds.includes(o.id))
      : inbounds;
    
    if (exportData.length === 0) {
      alert('无可导出的收货单记录');
      return;
    }

    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", jsonStr);
    downloadAnchor.setAttribute("download", `wms_inbounds_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // --- 状态徽章渲染 ---
  const getStatusBadge = (status: InboundStatus) => {
    const config: Record<InboundStatus, { label: string; classes: string }> = {
      DRAFT: { label: '草稿', classes: 'bg-zinc-100 text-zinc-800 border-zinc-200' },
      RECEIVED: { label: '已收货', classes: 'bg-orange-50 text-orange-700 border-orange-200' },
      PUTAWAY: { label: '已上架', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      VOIDED: { label: '已作废', classes: 'bg-rose-50 text-rose-700 border-rose-200' }
    };
    const current = config[status] || { label: status, classes: 'bg-slate-100 text-slate-800 border-slate-200' };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${current.classes}`}>
        {current.label}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* 面包屑 / 页头 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900">收货单管理</h1>
          <p className="text-xs text-slate-500 mt-1">处理供应商到货登记、实物清点、入库质检及货位上架</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="flex items-center gap-1.5 cursor-pointer">
            <Download size={14} />
            <span>数据导出</span>
          </Button>
        </div>
      </div>

      {/* 查询区 */}
      <form onSubmit={handleSearch} className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">收货单号</label>
            <Input 
              placeholder="输入RCV单号..." 
              value={rcvNumber} 
              onChange={e => setRcvNumber(e.target.value)} 
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">来源采购订单</label>
            <Input 
              placeholder="输入PO单号..." 
              value={poNumber} 
              onChange={e => setPoNumber(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">供应商</label>
            <select
              value={supplierCode}
              onChange={e => setSupplierCode(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">全部供应商</option>
              {suppliers.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
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
            <label className="text-xs font-semibold text-slate-500">状态</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="ALL">全部状态</option>
              <option value="DRAFT">草稿</option>
              <option value="RECEIVED">已收货</option>
              <option value="PUTAWAY">已上架</option>
              <option value="VOIDED">已作废</option>
            </select>
          </div>
          <div className="space-y-1 md:col-span-2 lg:col-span-2">
            <label className="text-xs font-semibold text-slate-500">收货日期</label>
            <div className="flex items-center gap-1">
              <Input type="date" value={receiveDateStart} onChange={e => setReceiveDateStart(e.target.value)} className="h-9 px-1 text-xs" />
              <span className="text-slate-400 text-xs">至</span>
              <Input type="date" value={receiveDateEnd} onChange={e => setReceiveDateEnd(e.target.value)} className="h-9 px-1 text-xs" />
            </div>
          </div>
        </div>

        {/* 展开/折叠最后修改时间 */}
        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 font-mono">最后修改时间范围</label>
              <div className="flex items-center gap-1">
                <Input type="date" value={updatedDateStart} onChange={e => setUpdatedDateStart(e.target.value)} className="h-9 text-xs" />
                <span className="text-slate-400 text-xs">至</span>
                <Input type="date" value={updatedDateEnd} onChange={e => setUpdatedDateEnd(e.target.value)} className="h-9 text-xs" />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline cursor-pointer"
          >
            {isExpanded ? (
              <>
                <span>收起高级筛选</span>
                <ChevronUp size={14} />
              </>
            ) : (
              <>
                <span>展开高级筛选 (最后修改时间)</span>
                <ChevronDown size={14} />
              </>
            )}
          </button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleReset} className="flex items-center gap-1 cursor-pointer">
              <RotateCcw size={14} />
              <span>重置</span>
            </Button>
            <Button type="submit" size="sm" className="flex items-center gap-1 cursor-pointer">
              <Search size={14} />
              <span>查询</span>
            </Button>
          </div>
        </div>
      </form>

      {/* Tab 栏切换 */}
      <div className="border-b border-slate-200 flex justify-between items-end">
        <div className="flex gap-1 text-sm font-medium">
          {(['ALL', 'DRAFT', 'RECEIVED', 'PUTAWAY', 'VOIDED'] as const).map(tab => {
            const labelMap = { ALL: '全部', DRAFT: '草稿', RECEIVED: '已收货', PUTAWAY: '已上架', VOIDED: '已作废' };
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`px-4 py-2 border-b-2 font-bold cursor-pointer transition-colors text-xs ${
                  isActive
                    ? 'border-primary text-primary bg-white rounded-t-md'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {labelMap[tab]} ({tabCounts[tab] || 0})
              </button>
            );
          })}
        </div>
      </div>

      {/* 列表数据表格 */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === inbounds.length}
                    onChange={handleSelectAll}
                    className="rounded text-primary border-slate-300"
                  />
                </th>
                <th className="p-3">收货单号</th>
                <th className="p-3">状态</th>
                <th className="p-3">来源PO</th>
                <th className="p-3">供应商</th>
                <th className="p-3">收货仓库</th>
                <th className="p-3">收货日期</th>
                <th className="p-3">商品种数</th>
                <th className="p-3 text-right">实收总数</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {inbounds.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    暂无符合条件的收货记录
                  </td>
                </tr>
              ) : (
                inbounds.map(row => {
                  const isChecked = selectedIds.includes(row.id);
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => handleSelectRow(row.id, e.target.checked)}
                          className="rounded text-primary border-slate-300"
                        />
                      </td>
                      <td className="p-3 font-semibold text-primary font-mono hover:underline">
                        <Link to={`/inbound/${row.id}`}>{row.id}</Link>
                      </td>
                      <td className="p-3">{getStatusBadge(row.status)}</td>
                      <td className="p-3 font-mono text-slate-500">{row.purchaseOrderId}</td>
                      <td className="p-3 max-w-[150px] truncate" title={row.supplierName}>
                        {row.supplierName}
                      </td>
                      <td className="p-3">{row.warehouseName}</td>
                      <td className="p-3 font-mono">{row.receiveDate}</td>
                      <td className="p-3">{row.itemCount}</td>
                      <td className="p-3 text-right font-bold font-mono">{row.totalReceivedQuantity}</td>
                      <td className="p-3 text-center space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-primary hover:bg-blue-50"
                          onClick={() => navigate(`/inbound/${row.id}`)}
                        >
                          <Eye size={12} className="mr-1" />
                          <span>查看</span>
                        </Button>

                        {row.status === 'DRAFT' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-blue-600 hover:bg-blue-50"
                              onClick={() => navigate(`/inbound/${row.id}/edit`)}
                            >
                              <Edit size={12} className="mr-1" />
                              <span>编辑</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-emerald-600 hover:bg-emerald-50"
                              onClick={() => setConfirmAction({
                                type: 'RECEIVE',
                                title: '确认收货清点',
                                msg: `您确定对收货单 ${row.id} 执行确认收货操作吗？执行后，实收商品将转入 WMS 冻结库并生成库存流水。`,
                                orderId: row.id
                              })}
                            >
                              <CheckCircle size={12} className="mr-1" />
                              <span>收货</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-amber-600 hover:bg-amber-50"
                              onClick={(e) => handleVoidClick(row.id, e)}
                            >
                              <XCircle size={12} className="mr-1" />
                              <span>作废</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-red-600 hover:bg-red-50"
                              onClick={() => setConfirmAction({
                                type: 'DELETE',
                                title: '删除草稿单据',
                                msg: `您确定要物理删除草稿收货单 ${row.id} 吗？此操作不可逆！`,
                                orderId: row.id
                              })}
                            >
                              <Trash2 size={12} className="mr-1" />
                              <span>删除</span>
                            </Button>
                          </>
                        )}

                        {row.status === 'RECEIVED' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-orange-600 hover:bg-orange-50 font-bold"
                              onClick={() => setQcOrder(row)}
                            >
                              <span>质检</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-emerald-600 hover:bg-emerald-50 font-bold"
                              onClick={() => navigate(`/inbound/${row.id}/putaway`)}
                            >
                              <ArrowUpCircle size={12} className="mr-1" />
                              <span>上架</span>
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 质检模拟弹窗 */}
      {qcOrder && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-md w-full shadow-lg p-5">
            <h3 className="text-sm font-bold text-slate-800">WMS 实物到货质量检验判定</h3>
            <p className="text-xs text-slate-500 mt-2">
              当前收货单号：<strong className="font-mono text-slate-700">{qcOrder.id}</strong>，共收货 <strong className="text-slate-700 font-mono">{qcOrder.totalReceivedQuantity}</strong> 件商品。
            </p>
            <div className="bg-yellow-50 text-yellow-700 p-3 rounded border border-yellow-200 text-xs mt-3 leading-relaxed">
              <strong>质检业务规则提示：</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>合格判定：商品解封转入正常待上架库，库位绑定后可用。</li>
                <li>不合格判定：判定退货，本单据作废，库存对应的冻结数量将释放消除。</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" size="sm" onClick={() => setQcOrder(null)} className="cursor-pointer">
                取消
              </Button>
              <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50 cursor-pointer" onClick={() => handleQCResult(false)}>
                判定不合格(退货作废)
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer" onClick={() => handleQCResult(true)}>
                判定合格(确认放行)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 二次确认弹窗 */}
      {confirmAction.type && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-md w-full shadow-lg p-5">
            <h3 className="text-sm font-bold text-slate-800">{confirmAction.title}</h3>
            <p className="text-xs text-slate-600 mt-3 font-medium leading-relaxed">{confirmAction.msg}</p>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" size="sm" onClick={() => setConfirmAction({ type: null, title: '', msg: '', orderId: null })} className="cursor-pointer">
                取消
              </Button>
              <Button 
                variant={confirmAction.type === 'DELETE' ? 'destructive' : 'default'} 
                size="sm" 
                onClick={executeAction}
                className="cursor-pointer"
              >
                确定
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 作废弹窗 */}
      {voidingId && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-md w-full shadow-lg p-5">
            <h3 className="text-sm font-bold text-slate-800">确认作废收货单</h3>
            <p className="text-xs text-slate-500 mt-2">请输入作废原因，作废后单据将无法修改和入库：</p>
            <div className="mt-3">
              <Input
                placeholder="请输入详细的作废原因..."
                value={voidReason}
                onChange={e => setVoidReason(e.target.value)}
                className="h-10 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" size="sm" onClick={() => setVoidingId(null)} className="cursor-pointer">
                取消
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleConfirmVoid} 
                disabled={!voidReason.trim()}
                className="cursor-pointer disabled:opacity-50"
              >
                确认作废
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

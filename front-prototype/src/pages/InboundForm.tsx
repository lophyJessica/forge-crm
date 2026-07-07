import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { inboundApi } from '../api/inbound';
import { InboundOrder, InboundItem } from '../types/inbound';
import { integrationApi } from '../api/integration';
import { PurchaseOrderSync } from '../types/integration';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { ArrowLeft, Save, CheckCircle, Info } from 'lucide-react';

export default function InboundForm() {
  const navigate = useNavigate();
  const { id } = useParams(); // 编辑态下的收货单 id
  const [searchParams] = useSearchParams();
  const poId = searchParams.get('source_id'); // 新建态下来源采购订单 po_id

  // --- 状态定义 ---
  const [inboundOrder, setInboundOrder] = useState<InboundOrder | null>(null);
  const [items, setItems] = useState<InboundItem[]>([]);
  const [remark, setRemark] = useState('');
  const [receiveDate, setReceiveDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({}); // 存放商品行实收数量超标错误
  const [sourceOrders, setSourceOrders] = useState<PurchaseOrderSync[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState('');

  // 加载数据
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (id) {
          // 编辑态
          const order = await inboundApi.getInboundById(id);
          if (order) {
            if (order.status !== 'DRAFT') {
              alert('只有草稿态的收货单才能编辑！');
              navigate(`/inbound/${id}`);
              return;
            }
            setInboundOrder(order);
            setItems(order.items);
            setRemark(order.remark || '');
            setReceiveDate(order.receiveDate);
          }
        } else if (poId) {
          // 新建态 (根据采购订单生成)
          const po = await db.purchase_orders.get(poId);
          if (!po) {
            alert('未找到来源采购单！');
            navigate('/inbound');
            return;
          }
          
          // 调用 API 方法预生成草稿数据
          const draftId = await inboundApi.createInboundFromPO(poId, 'WmsOperator01');
          const order = await inboundApi.getInboundById(draftId);
          if (order) {
            setInboundOrder(order);
            setItems(order.items);
            setRemark(order.remark || '');
            setReceiveDate(order.receiveDate);
          }
        } else {
          const list = await integrationApi.getInboundPurchaseOrders();
          setSourceOrders(list);
          setSelectedSourceId(list[0]?.poId || '');
        }
      } catch (err: any) {
        alert(err.message || '加载收货表单出错');
        navigate('/inbound');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, poId]);

  const handleCreateFromSelectedPO = async () => {
    if (!selectedSourceId) {
      alert('请选择已下发的来源采购订单');
      return;
    }
    setLoading(true);
    try {
      const draftId = await inboundApi.createInboundFromPO(selectedSourceId, 'WmsOperator01');
      const order = await inboundApi.getInboundById(draftId);
      if (order) {
        setInboundOrder(order);
        setItems(order.items);
        setRemark(order.remark || '');
        setReceiveDate(order.receiveDate);
      }
    } catch (err: any) {
      alert(err.message || '创建收货草稿失败');
    } finally {
      setLoading(false);
    }
  };

  // 实收数量值变更
  const handleQtyChange = (index: number, val: string) => {
    const qty = val === '' ? 0 : Number(val);
    const item = items[index];
    const newItems = [...items];
    newItems[index] = {
      ...item,
      receivedQuantity: qty
    };
    setItems(newItems);

    // 强控校验：实收量 > PO未收货量
    const newErrors = { ...errors };
    if (qty > item.pendingQuantity) {
      newErrors[item.productCode] = `实收数 (${qty}) 超出采购订单未收货数 (${item.pendingQuantity})`;
    } else {
      delete newErrors[item.productCode];
    }
    setErrors(newErrors);
  };

  // 行备注值变更
  const handleItemRemarkChange = (index: number, val: string) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      remark: val
    };
    setItems(newItems);
  };

  // 提交/保存草稿
  const handleSave = async (isConfirm: boolean) => {
    if (!inboundOrder) return;

    // 校验所有实收量
    const newErrors: Record<string, string> = {};
    items.forEach(item => {
      if (item.receivedQuantity > item.pendingQuantity) {
        newErrors[item.productCode] = `实收数 (${item.receivedQuantity}) 超出采购订单未收货数 (${item.pendingQuantity})`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alert('商品行实收数量超过采购单未收数量上限，保存已被标红阻断！');
      return;
    }

    try {
      // 1. 保存当前的草稿明细
      await inboundApi.saveInboundDraft(inboundOrder.id, items, remark, 'WmsOperator01');
      
      // 2. 如果点击的是“确认收货”，则触发收货入库事务
      if (isConfirm) {
        await inboundApi.confirmInboundReceipt(inboundOrder.id, 'WmsOperator01');
        alert('收货单已确认收货，入库实物转入冻结并生成入库流水！');
      } else {
        alert('收货草稿保存成功');
      }

      navigate(`/inbound/${inboundOrder.id}`);
    } catch (err: any) {
      alert(err.message || '操作失败');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500 font-medium">正在解析单据数据...</div>;
  }

  if (!inboundOrder) {
    return (
      <div className="space-y-4 text-xs">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/inbound')} 
            className="p-1.5 rounded-md hover:bg-slate-100 border border-slate-200 bg-white text-slate-600 cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">创建收货单 (ERP下发PO)</h1>
            <p className="text-xs text-slate-500 mt-1">从 ERP integration_inbox 读取已下发采购订单并生成 WMS 收货草稿</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm max-w-3xl space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">选择来源采购订单</h3>
          {sourceOrders.length > 0 ? (
            <>
              <div className="space-y-1">
                <label className="font-semibold text-slate-500">来源PO</label>
                <select
                  value={selectedSourceId}
                  onChange={e => setSelectedSourceId(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-1 focus-visible:outline-none focus-visible:ring-2"
                >
                  {sourceOrders.map(po => (
                    <option key={po.poId} value={po.poId}>
                      {po.poId} / {po.supplier.name} / {po.warehouse.name} / {po.status === 'PARTIAL_RECEIVED' ? '部分收货' : '已下发'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="overflow-x-auto border border-slate-100 rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                      <th className="p-3">PO单号</th>
                      <th className="p-3">供应商</th>
                      <th className="p-3">收货仓库</th>
                      <th className="p-3 text-right">商品种数</th>
                      <th className="p-3">下发时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {sourceOrders.map(po => (
                      <tr key={po.poId} className={selectedSourceId === po.poId ? 'bg-blue-50/40' : ''}>
                        <td className="p-3 font-mono font-bold text-primary">{po.poId}</td>
                        <td className="p-3">{po.supplier.name}</td>
                        <td className="p-3">{po.warehouse.name}</td>
                        <td className="p-3 text-right font-mono">{po.items.length}</td>
                        <td className="p-3 font-mono text-slate-400">{po.syncTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/inbound')}>返回</Button>
                <Button size="sm" onClick={handleCreateFromSelectedPO} className="bg-primary text-white font-bold">
                  生成收货草稿
                </Button>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
              暂无 ERP 已下发且可收货的采购订单
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 页头导航 */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)} 
          className="p-1.5 rounded-md hover:bg-slate-100 border border-slate-200 bg-white text-slate-600 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {id ? `编辑收货单 ${inboundOrder.id}` : '创建收货单 (采购下推)'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">核对到货商品实物数量并登记入库</p>
        </div>
      </div>

      {/* 基本信息只读卡片 */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">基本单据信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-slate-400 font-semibold">来源采购单号</span>
            <div className="font-semibold text-primary font-mono select-all">
              {inboundOrder.purchaseOrderId}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-slate-400 font-semibold">往来供应商</span>
            <div className="font-semibold text-slate-700">{inboundOrder.supplierName}</div>
          </div>
          <div className="space-y-1">
            <span className="text-slate-400 font-semibold">入库收货仓库</span>
            <div className="font-semibold text-slate-700">{inboundOrder.warehouseName}</div>
          </div>
          <div className="space-y-1">
            <span className="text-slate-400 font-semibold">收货清点日期</span>
            <Input
              type="date"
              value={receiveDate}
              onChange={e => setReceiveDate(e.target.value)}
              className="h-8 py-0.5 text-xs font-mono w-44"
            />
          </div>
        </div>
        <div className="space-y-1 text-xs pt-1">
          <span className="text-slate-400 font-semibold">收货交接备注</span>
          <Textarea
            placeholder="录入到货清点异常、随货单据等备注说明..."
            value={remark}
            onChange={e => setRemark(e.target.value)}
            className="text-xs min-h-[60px]"
          />
        </div>
      </div>

      {/* 商品明细列表 */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">商品到货清点明细</h3>
          <div className="flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100">
            <Info size={12} />
            <span>实收数量清点时禁止超出采购订单未收数量，强控阻断。</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3">商品编码</th>
                <th className="p-3">商品名称/条码</th>
                <th className="p-3">规格/单位</th>
                <th className="p-3 text-right">采购总数</th>
                <th className="p-3 text-right">PO未收货数</th>
                <th className="p-3 w-40 text-right">实收清点数</th>
                <th className="p-3 w-60">行备注</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {items.map((row, index) => {
                const hasError = !!errors[row.productCode];
                return (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="p-3 text-center text-slate-400 font-mono">{index + 1}</td>
                    <td className="p-3 font-mono font-semibold">{row.productCode}</td>
                    <td className="p-3">
                      <div>{row.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{row.productBarcode}</div>
                    </td>
                    <td className="p-3 text-slate-500">
                      <div>{row.productSpec}</div>
                      <div className="mt-0.5 text-[10px]">{row.unit}</div>
                    </td>
                    <td className="p-3 text-right font-mono">{row.purchaseQuantity}</td>
                    <td className="p-3 text-right font-mono font-semibold text-slate-600 bg-slate-50/30">
                      {row.pendingQuantity}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col items-end gap-1">
                        <Input
                          type="number"
                          value={row.receivedQuantity}
                          onChange={e => handleQtyChange(index, e.target.value)}
                          className={`w-32 h-8 text-right font-bold font-mono text-xs ${
                            hasError ? 'border-red-500 focus-visible:ring-red-500 bg-red-50 text-red-700' : ''
                          }`}
                        />
                        {hasError && (
                          <span className="text-[10px] text-red-500 font-semibold leading-tight text-right w-52 block mt-0.5">
                            {errors[row.productCode]}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <Input
                        placeholder="行备注说明..."
                        value={row.remark}
                        onChange={e => handleItemRemarkChange(index, e.target.value)}
                        className="h-8 text-xs placeholder:text-slate-300"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 底部按钮栏 */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate(-1)}
          className="cursor-pointer"
        >
          返回
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleSave(false)} 
            className="flex items-center gap-1.5 cursor-pointer"
          >
            <Save size={14} />
            <span>保存草稿</span>
          </Button>
          <Button 
            size="sm" 
            onClick={() => handleSave(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer font-bold"
          >
            <CheckCircle size={14} />
            <span>确认收货</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

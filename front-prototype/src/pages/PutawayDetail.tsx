import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { db } from '../db';
import { InboundOrder } from '../types/inbound';
import { Button } from '../components/ui/Button';
import { ArrowLeft, ArrowUpCircle, Calendar, Layers, Clipboard, ShieldCheck } from 'lucide-react';

interface PutawayVirtualDetail {
  id: string;
  inboundOrderId: string;
  warehouseCode: string;
  warehouseName: string;
  status: 'PENDING' | 'PUTAWAYING' | 'COMPLETED';
  operator?: string;
  putawayDate?: string;
  createdAt: string;
  items: Array<{
    productCode: string;
    productName: string;
    productSpec: string;
    unit: string;
    recommendLocation: string; // 推荐货位
    actualLocation?: string; // 实际货位
    quantity: number; // 上架件数
  }>;
}

export default function PutawayDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [detail, setDetail] = useState<PutawayVirtualDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const allInbounds = await db.inbound_orders.toArray();
        let targetOrder: InboundOrder | null = null;
        let isRecordMatch = false;
        let matchedRecord: any = null;

        for (const order of allInbounds) {
          const hasRecord = order.putawayRecords && order.putawayRecords.length > 0;
          if (hasRecord) {
            const match = order.putawayRecords!.find(r => r.id === id);
            if (match) {
              targetOrder = order;
              isRecordMatch = true;
              matchedRecord = match;
              break;
            }
          }
          // 虚拟单号匹配
          const virtualId = `PUT${order.id.substring(3)}`;
          if (virtualId === id) {
            targetOrder = order;
            break;
          }
        }

        if (!targetOrder) {
          alert('上架单不存在');
          navigate('/inventory/putaways');
          return;
        }

        const record = matchedRecord || (targetOrder.putawayRecords && targetOrder.putawayRecords.length > 0 ? targetOrder.putawayRecords![0] : null);
        let putStatus: 'PENDING' | 'PUTAWAYING' | 'COMPLETED' = 'PENDING';
        if (targetOrder.status === 'COMPLETED') {
          putStatus = 'COMPLETED';
        } else if (record) {
          putStatus = 'PUTAWAYING';
        }

        const itemsMapped = targetOrder.items.map(item => {
          // 在 putawayRecords 中匹配该商品的实际上架货位和数量
          let actLoc = '待PDA作业分配';
          let qty = Number(item.receivedQuantity || 0);

          if (record && record.items) {
            const recItem = record.items.find((ri: any) => ri.productCode === item.productCode);
            if (recItem) {
              actLoc = recItem.locationCode || '待分配';
              qty = recItem.quantity;
            }
          }

          return {
            productCode: item.productCode,
            productName: item.productName,
            productSpec: item.productSpec,
            unit: item.unit,
            recommendLocation: item.locationCode || 'LOC-TEMP(待收货确认)',
            actualLocation: record ? actLoc : undefined,
            quantity: qty,
          };
        });

        setDetail({
          id: record?.id || `PUT${targetOrder.id.substring(3)}`,
          inboundOrderId: targetOrder.id,
          warehouseCode: targetOrder.warehouseCode,
          warehouseName: targetOrder.warehouseName,
          status: putStatus,
          operator: record?.operator,
          putawayDate: record?.putawayDate,
          createdAt: targetOrder.createdAt,
          items: itemsMapped,
        });
      } catch (err) {
        console.error(err);
        alert('加载上架单明细失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500 font-medium">正在解析上架指令...</div>;
  }

  if (!detail) {
    return <div className="bg-red-50 text-red-700 text-xs p-5 rounded border border-red-200 text-center font-medium">该上架单不存在</div>;
  }

  const getStatusClasses = (status: string) => {
    const config = {
      PENDING: 'bg-zinc-100 text-zinc-800 border-zinc-200',
      PUTAWAYING: 'bg-orange-50 text-orange-700 border-orange-200',
      COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
    return config[status as keyof typeof config] || 'bg-slate-100 text-slate-700';
  };

  const getStatusText = (status: string) => {
    const config = { PENDING: '待上架', PUTAWAYING: '上架中', COMPLETED: '已完成' };
    return config[status as keyof typeof config] || status;
  };

  return (
    <div className="space-y-4 text-xs pb-8">
      {/* 页头 */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/inventory/putaways')} className="p-1.5 rounded-md hover:bg-slate-100 border border-slate-200 bg-white text-slate-600 cursor-pointer">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 font-mono">{detail.id}</h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusClasses(detail.status)}`}>
                {getStatusText(detail.status)}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">来源收货单：{detail.inboundOrderId}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {detail.status !== 'COMPLETED' && (
            <Button 
              size="sm" 
              onClick={() => navigate(`/inbound/${detail.inboundOrderId}/putaway`)} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 font-bold cursor-pointer"
            >
              <ArrowUpCircle size={14} />
              <span>去执行上架</span>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* 商品明细列表 */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Layers size={16} className="text-primary" />
              <span>上架商品明细</span>
            </h3>
            <div className="px-2 py-1 rounded border bg-slate-50 text-slate-700 border-slate-200 font-mono font-bold">
              上架商品共 {detail.items.length} 种
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3">商品编码</th>
                  <th className="p-3">名称 / 规格</th>
                  <th className="p-3">单位</th>
                  <th className="p-3 text-right">上架数量</th>
                  <th className="p-3">系统推荐货位</th>
                  <th className="p-3">实际上架货位</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {detail.items.map((item, index) => (
                  <tr key={`${item.productCode}-${index}`} className="hover:bg-slate-50/50">
                    <td className="p-3 text-center text-slate-400 font-mono">{index + 1}</td>
                    <td className="p-3 font-mono font-semibold">{item.productCode}</td>
                    <td className="p-3">
                      <div>{item.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.productSpec}</div>
                    </td>
                    <td className="p-3">{item.unit}</td>
                    <td className="p-3 text-right font-mono font-bold text-primary">{item.quantity}</td>
                    <td className="p-3 font-mono text-slate-500 font-bold">{item.recommendLocation}</td>
                    <td className="p-3 font-mono">
                      {item.actualLocation ? (
                        <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">
                          {item.actualLocation}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">等待现场上架作业分配</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 侧边信息卡片 */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Clipboard size={14} className="text-slate-500" />
              <span>基础信息</span>
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold">上架仓库</span>
                <span className="font-semibold text-slate-700">{detail.warehouseName}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold">来源收货单</span>
                <span className="font-mono text-primary hover:underline">
                  <Link to={`/inbound/${detail.inboundOrderId}`}>{detail.inboundOrderId}</Link>
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold">上架货件数</span>
                <span className="font-mono font-bold text-slate-700">
                  {detail.items.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400 font-semibold flex items-center gap-1">创建时间</span>
                <span className="font-mono text-slate-500">{detail.createdAt}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-slate-500" />
              <span>执行记录</span>
            </h3>
            {detail.operator ? (
              <div className="space-y-3">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400 font-semibold">上架作业员</span>
                  <span className="font-semibold text-slate-700">{detail.operator}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400 font-semibold flex items-center gap-1">完成时间</span>
                  <span className="font-mono text-slate-500">{detail.putawayDate}</span>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 italic text-center py-2">暂无实际上架执行人记录</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

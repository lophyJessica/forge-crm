import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { inboundApi } from '../api/inbound';
import { InboundOrder, InboundStatus } from '../types/inbound';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  ArrowLeft, Edit, Trash2, XCircle, CheckCircle, 
  ArrowUpCircle, Info, Calendar, FileText, CheckSquare, Award 
} from 'lucide-react';

export default function InboundDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [order, setOrder] = useState<InboundOrder | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 弹窗状态
  const [voiding, setVoiding] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [qcPopup, setQcPopup] = useState(false);
  const [confirmReceipt, setConfirmReceipt] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await inboundApi.getInboundById(id);
      if (data) {
        setOrder(data);
      }
    } catch (err: any) {
      console.error(err);
      alert('加载收货单详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleVoid = async () => {
    if (!id) return;
    try {
      await inboundApi.voidInbound(id, voidReason, 'WmsOperator01');
      setVoiding(false);
      loadData();
      alert('收货单已成功作废');
    } catch (err: any) {
      alert(err.message || '作废失败');
    }
  };

  const handleReceipt = async () => {
    if (!id) return;
    try {
      await inboundApi.confirmInboundReceipt(id, 'WmsOperator01');
      setConfirmReceipt(false);
      loadData();
      alert('确认收货成功，库存转入冻结并提交质检，已生成收货流水！');
    } catch (err: any) {
      alert(err.message || '收货失败');
    }
  };

  const handleQC = async (isPassed: boolean) => {
    if (!id) return;
    try {
      await inboundApi.handleQualityCheck(id, isPassed, 'WmsOperator01');
      setQcPopup(false);
      loadData();
      alert(isPassed ? '质检判定合格放行，现可进行 PDA 上架' : '质检判定不合格退货，单据已自动作废');
    } catch (err: any) {
      alert(err.message || '判定失败');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500 font-medium">正在解析单据数据...</div>;
  }

  if (!order) {
    return (
      <div className="bg-red-50 text-red-700 text-xs p-5 rounded border border-red-200 text-center font-medium">
        该收货单不存在或已被物理删除！
      </div>
    );
  }

  // --- 状态徽章与时间线标记 ---
  const getStatusConfig = (status: InboundStatus) => {
    const config: Record<InboundStatus, { label: string; bg: string; text: string; step: number }> = {
      DRAFT: { label: '待收货', bg: 'bg-zinc-100 border-zinc-200', text: 'text-zinc-800', step: 1 },
      RECEIVING: { label: '收货中', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', step: 1 },
      QC_PENDING: { label: '待质检', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', step: 2 },
      PUTAWAY_PENDING: { label: '待上架', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', step: 3 },
      EXCEPTION: { label: '异常', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', step: 3 },
      COMPLETED: { label: '已完成', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', step: 4 },
      VOIDED: { label: '已作废', bg: 'bg-slate-100 border-slate-200', text: 'text-slate-400', step: 4 }
    };
    return config[status] || { label: status, bg: 'bg-slate-100', text: 'text-slate-700', step: 0 };
  };

  const statusCfg = getStatusConfig(order.status);

  return (
    <div className="space-y-4 pb-8">
      {/* 页头导航 */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/inbound')} 
            className="p-1.5 rounded-md hover:bg-slate-100 border border-slate-200 bg-white text-slate-600 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">{order.id}</h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusCfg.bg} ${statusCfg.text}`}>
                {statusCfg.label}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">创建时间：{order.createdAt}</p>
          </div>
        </div>
        <div className="text-right text-xs">
          <div className="text-slate-400 font-semibold">来源采购单</div>
          <div className="font-semibold text-primary font-mono select-all mt-0.5">{order.purchaseOrderId}</div>
        </div>
      </div>

      {/* 状态时间线 */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-5 font-mono">单据状态流转图</h3>
        <div className="flex items-center justify-between max-w-2xl mx-auto text-xs relative">
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-100 -z-10"></div>
          
          <div className="flex flex-col items-center gap-1.5 bg-white px-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${
              order.status === 'VOIDED' ? 'bg-zinc-100 border-zinc-300 text-zinc-500' : 'bg-primary text-white border-primary'
            }`}>
              1
            </div>
            <span className="font-semibold text-slate-700">采购下推草稿</span>
          </div>

          <div className="flex flex-col items-center gap-1.5 bg-white px-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${
              statusCfg.step >= 2 && order.status !== 'VOIDED'
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-slate-300 border-slate-200'
            }`}>
              2
            </div>
            <span className="font-semibold text-slate-700">收货清点 (冻结)</span>
          </div>

          <div className="flex flex-col items-center gap-1.5 bg-white px-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${
              statusCfg.step === 3 && order.status !== 'VOIDED'
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'bg-white text-slate-300 border-slate-200'
            }`}>
              3
            </div>
            <span className="font-semibold text-slate-700">货位上架 (转可用)</span>
          </div>

          {order.status === 'VOIDED' && (
            <div className="flex flex-col items-center gap-1.5 bg-white px-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-rose-500 text-white border-rose-500">
                ✕
              </div>
              <span className="font-semibold text-rose-600">单据已作废</span>
            </div>
          )}
        </div>
      </div>

      {/* 2栏布局 (左侧明细，右侧单据卡片) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左侧商品清单 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">商品到货清单</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                    <th className="p-3 w-10 text-center">#</th>
                    <th className="p-3">商品编码</th>
                    <th className="p-3">名称 / 规格</th>
                    <th className="p-3 text-right">采购数量</th>
                    <th className="p-3 text-right">实收数量</th>
                    <th className="p-3 text-right">已上架数</th>
                    <th className="p-3">上架货位</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                  {order.items.map((row, index) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="p-3 text-center text-slate-400 font-mono">{index + 1}</td>
                      <td className="p-3 font-mono font-semibold">{row.productCode}</td>
                      <td className="p-3">
                        <div>{row.productName}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{row.productSpec}</div>
                      </td>
                      <td className="p-3 text-right font-mono">{row.purchaseQuantity}</td>
                      <td className="p-3 text-right font-mono font-semibold text-slate-700 bg-slate-50/10">
                        {row.receivedQuantity}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-emerald-600">
                        {row.putawayQuantity}
                      </td>
                      <td className="p-3 font-mono">
                        {row.locationCode ? (
                          <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px] font-bold">
                            {row.locationCode}
                          </span>
                        ) : (
                          <span className="text-slate-300">未上架</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 上架记录 */}
          {order.putawayRecords && order.putawayRecords.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <Award size={16} className="text-emerald-500" />
                <span>货位上架执行历史</span>
              </h3>
              <div className="space-y-4">
                {order.putawayRecords.map((r, rIdx) => (
                  <div key={r.id} className="border border-slate-100 rounded-lg p-4 bg-slate-50/30 text-xs">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                      <div>
                        上架单号：<strong className="font-mono text-slate-800">{r.id}</strong>
                      </div>
                      <div className="text-slate-400 text-[10px] font-mono">
                        执行时间：{r.putawayDate} | 操作人：{r.operator}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {r.items.map((pi, piIdx) => (
                        <div key={piIdx} className="bg-white p-2 rounded border border-slate-150 flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-slate-700">{pi.productName}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{pi.productCode}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-emerald-600 font-mono">{pi.quantity} {pi.unit}</div>
                            <div className="font-mono font-bold text-[9px] bg-slate-100 text-slate-500 px-1 rounded inline-block mt-0.5">
                              {pi.locationCode}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 右侧基本信息卡片 */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">基础单据资料</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">往来供应商</span>
                <span className="font-semibold text-slate-700">{order.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">入库收货仓</span>
                <span className="font-semibold text-slate-700">{order.warehouseName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">到货收货日期</span>
                <span className="font-semibold text-slate-700 font-mono">{order.receiveDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">收货建单人</span>
                <span className="font-semibold text-slate-700">{order.createdBy}</span>
              </div>
              {order.updatedBy && (
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">最后编辑人</span>
                  <span className="font-semibold text-slate-700">{order.updatedBy}</span>
                </div>
              )}
              {order.updatedAt && (
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">编辑时间</span>
                  <span className="font-semibold text-slate-700 font-mono">{order.updatedAt}</span>
                </div>
              )}
            </div>
            {order.remark && (
              <div className="border-t border-slate-100 pt-3 space-y-1">
                <span className="text-slate-400 font-semibold">单据备注信息</span>
                <p className="text-slate-600 bg-slate-50 p-2.5 rounded text-[11px] leading-relaxed">{order.remark}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部按钮栏 - 状态动作按钮 */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm text-xs">
        <Button variant="outline" size="sm" onClick={() => navigate('/inbound')} className="cursor-pointer">
          返回列表
        </Button>
        <div className="flex gap-2">
          {(order.status === 'DRAFT' || order.status === 'RECEIVING') && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1 cursor-pointer text-blue-600"
                onClick={() => navigate(`/inbound/${order.id}/edit`)}
              >
                <Edit size={14} />
                <span>执行收货</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1 cursor-pointer text-amber-600 border-amber-200 hover:bg-amber-50"
                onClick={() => setVoiding(true)}
              >
                <XCircle size={14} />
                <span>作废单据</span>
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer font-bold animate-pulse"
                onClick={() => setConfirmReceipt(true)}
              >
                <CheckCircle size={14} />
                <span>确认收货</span>
              </Button>
            </>
          )}

          {order.status === 'QC_PENDING' && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1 cursor-pointer text-orange-600 border-orange-200 hover:bg-orange-50 font-bold"
                onClick={() => setQcPopup(true)}
              >
                <span>质检判定</span>
              </Button>
            </>
          )}

          {order.status === 'PUTAWAY_PENDING' && (
            <>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer font-bold"
                onClick={() => navigate(`/inbound/${order.id}/putaway`)}
              >
                <ArrowUpCircle size={14} />
                <span>PDA扫码上架</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 质检弹窗 */}
      {qcPopup && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-md w-full shadow-lg p-5 text-xs">
            <h3 className="text-sm font-bold text-slate-800">入库质量检验结果判定</h3>
            <p className="text-slate-500 mt-2">
              当前处理单据：<strong className="font-mono text-slate-700">{order.id}</strong>
            </p>
            <div className="bg-yellow-50 text-yellow-700 p-3 rounded border border-yellow-200 my-3 leading-relaxed">
              <strong>质检规则须知：</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>合格：准予放行，流转到 PDA 扫码上架确认入可用库。</li>
                <li>不合格：进行退货并销账，本收货单直接作废，冲减对应的冻结库存。</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" size="sm" onClick={() => setQcPopup(false)} className="cursor-pointer">
                取消
              </Button>
              <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50 cursor-pointer" onClick={() => handleQC(false)}>
                判定不合格(作废退回)
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer font-bold" onClick={() => handleQC(true)}>
                判定合格(准予上架)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 作废弹窗 */}
      {voiding && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-md w-full shadow-lg p-5 text-xs">
            <h3 className="text-sm font-bold text-slate-800">确认作废收货单</h3>
            <p className="text-slate-500 mt-2">请说明具体的作废原因：</p>
            <div className="mt-3">
              <Input
                placeholder="请输入详细的作废原因..."
                value={voidReason}
                onChange={e => setVoidReason(e.target.value)}
                className="h-10 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" size="sm" onClick={() => setVoiding(false)} className="cursor-pointer">
                取消
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleVoid} 
                disabled={!voidReason.trim()}
                className="cursor-pointer disabled:opacity-50"
              >
                确认作废
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 收货确认确认 */}
      {confirmReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-md w-full shadow-lg p-5 text-xs">
            <h3 className="text-sm font-bold text-slate-800">确认收货入库清点确认</h3>
            <p className="text-slate-600 mt-3 font-semibold leading-relaxed">
              执行“确认收货”后，系统将正式根据实收数量更新 IndexedDB 库存为“冻结状态”（可用量暂时不变，代表正在清点和质检），同时生成收货变动流水，确定继续吗？
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" size="sm" onClick={() => setConfirmReceipt(false)} className="cursor-pointer">
                取消
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer font-bold" onClick={handleReceipt}>
                确认收货
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../db';
import { WaveOrder, WaveStatus } from '../types/outbound';
import { Button } from '../components/ui/Button';
import DataTable from '../components/shared/DataTable';
import PageHeader from '../components/shared/PageHeader';
import { ArrowRight, Calendar, ClipboardList, Layers, Package, Truck, User } from 'lucide-react';

const STATUS_CONFIG: Record<WaveStatus, { label: string; classes: string }> = {
  DRAFT: { label: '待指派', classes: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
  PICKING: { label: '拣货中', classes: 'bg-orange-50 text-orange-700 border-orange-200' },
  PICKED: { label: '待复核', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  CHECKED: { label: '待包装/交运', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  SHIPPED: { label: '已交运', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  VOIDED: { label: '已作废', classes: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const FLOW_STEPS: Array<{ status: WaveStatus; label: string }> = [
  { status: 'DRAFT', label: '待指派' },
  { status: 'PICKING', label: '拣货中' },
  { status: 'PICKED', label: '待复核' },
  { status: 'CHECKED', label: '待包装/交运' },
  { status: 'SHIPPED', label: '已交运' },
];

const FLOW_INDEX: Record<WaveStatus, number> = {
  DRAFT: 0,
  PICKING: 1,
  PICKED: 2,
  CHECKED: 3,
  SHIPPED: 4,
  VOIDED: -1,
};

export default function WaveDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [detail, setDetail] = useState<WaveOrder | null>(null);
  const [hasPackages, setHasPackages] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const wave = await db.wave_orders.get(id);
        setDetail(wave || null);
        if (wave) {
          const packageCount = await db.pkg_records.where('waveId').equals(wave.id).count();
          setHasPackages(packageCount > 0);
        }
      } catch (error) {
        console.error(error);
        setDetail(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const totals = useMemo(() => {
    if (!detail) return { required: 0, picked: 0, checked: 0 };
    return detail.items.reduce(
      (result, item) => ({
        required: result.required + item.qtyRequired,
        picked: result.picked + item.qtyPicked,
        checked: result.checked + item.qtyChecked,
      }),
      { required: 0, picked: 0, checked: 0 },
    );
  }, [detail]);

  if (loading) {
    return <div className="forge-state-panel">正在解析波次单详情...</div>;
  }

  if (!detail) {
    return <div className="forge-state-panel forge-state-panel--error">该波次单不存在</div>;
  }

  const statusConfig = STATUS_CONFIG[detail.status] ?? {
    label: detail.status || '未知状态',
    classes: 'bg-slate-100 text-slate-500 border-slate-200',
  };
  const currentStep = FLOW_INDEX[detail.status];

  const nextAction = detail.status === 'PICKING'
    ? { label: '进入 PDA 拣货', to: `/outbound/${detail.id}/picking`, icon: Truck, className: 'bg-orange-600 hover:bg-orange-700' }
    : detail.status === 'PICKED'
      ? { label: '进入商品复核', to: `/outbound/${detail.id}/checking`, icon: ClipboardList, className: 'bg-amber-600 hover:bg-amber-700' }
      : detail.status === 'CHECKED'
        ? hasPackages
          ? { label: '进入交运确认', to: `/outbound/${detail.id}/shipping`, icon: Truck, className: 'bg-emerald-600 hover:bg-emerald-700' }
          : { label: '进入称重包装', to: `/outbound/${detail.id}/packing`, icon: Package, className: 'bg-blue-600 hover:bg-blue-700' }
        : null;
  const ActionIcon = nextAction?.icon;

  return (
    <div className="space-y-4 pb-8 text-xs">
      <PageHeader
        onBack={() => navigate('/outbound')}
        title={(
          <>
            <span className="font-mono">{detail.id}</span>
            <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${statusConfig.classes}`}>{statusConfig.label}</span>
          </>
        )}
        description={<span className="font-mono">创建时间：{detail.createdAt} · 创建人：{detail.createdBy}</span>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: '来源销售订单', value: detail.orderIds.length, unit: '单', icon: ClipboardList },
          { label: '商品种数', value: detail.items.length, unit: '种', icon: Layers },
          { label: '应拣总数', value: totals.required, unit: '件', icon: Package },
          { label: '已复核数量', value: totals.checked, unit: '件', icon: User },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div>
                <div className="text-[11px] font-semibold text-slate-400">{card.label}</div>
                <div className="mt-1 font-mono text-xl font-bold text-slate-800">
                  {card.value}<span className="ml-1 text-xs font-semibold">{card.unit}</span>
                </div>
              </div>
              <Icon size={18} className="text-primary" />
            </div>
          );
        })}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
            <ArrowRight size={15} className="text-primary" />
            状态流转
          </h2>
          {detail.status === 'VOIDED' && <span className="text-[11px] font-semibold text-rose-600">该波次已终止</span>}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {FLOW_STEPS.map((step, index) => {
            const done = currentStep >= index && detail.status !== 'VOIDED';
            return (
              <div key={step.status} className={`relative rounded-md border p-3 ${done ? 'border-blue-200 bg-blue-50/70' : 'border-slate-200 bg-slate-50'}`}>
                <div className={`mb-2 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${done ? 'bg-blue-600 text-white' : 'bg-white text-slate-400'}`}>{index + 1}</div>
                <div className={`font-semibold ${done ? 'text-blue-700' : 'text-slate-400'}`}>{step.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="xl:col-span-3">
          <DataTable minWidth="980px">
            <thead>
              <tr>
                <th className="px-3">商品编码</th>
                <th className="px-3">商品名称 / 规格</th>
                <th className="px-3">推荐货位</th>
                <th className="px-3 text-right">应拣数量</th>
                <th className="px-3 text-right">实拣数量</th>
                <th className="px-3 text-right">复核数量</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {detail.items.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">该波次暂无商品明细</td></tr>
              ) : detail.items.map(item => (
                <tr key={item.productCode} className="hover:bg-slate-50/60">
                  <td className="px-3 font-mono font-semibold text-primary">{item.productCode}</td>
                  <td className="px-3">
                    <div className="font-semibold text-slate-800">{item.productName}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-slate-400">{item.productSpec}</div>
                  </td>
                  <td className="px-3 font-mono text-slate-500">{item.recommendLocation}</td>
                  <td className="px-3 text-right font-mono font-bold">{item.qtyRequired} {item.unit}</td>
                  <td className="px-3 text-right font-mono text-slate-600">{item.qtyPicked}</td>
                  <td className="px-3 text-right font-mono text-slate-600">{item.qtyChecked}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>

        <aside className="space-y-4">
          <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-1.5 border-b border-slate-100 pb-2 text-sm font-bold text-slate-800"><Truck size={15} className="text-slate-500" />出库信息</h2>
            <div className="space-y-2.5">
              <div className="flex justify-between gap-3"><span className="text-slate-400">波次类型</span><span className="font-semibold text-slate-700">{detail.waveType === 'SYSTEM' ? '系统波次' : '手工波次'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-400">承运商</span><span className="font-semibold text-slate-700">{detail.carrier}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-400">配送线路</span><span className="font-semibold text-right text-slate-700">{detail.route}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-400">拣货员</span><span className="font-semibold text-slate-700">{detail.pickerId || '未指派'}</span></div>
              <div className="flex justify-between gap-3"><span className="flex items-center gap-1 text-slate-400"><Calendar size={13} />更新时间</span><span className="font-mono text-right text-slate-500">{detail.updatedAt || detail.createdAt}</span></div>
            </div>
          </div>

          {detail.remark && (
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-2 text-sm font-bold text-slate-800">波次备注</h2>
              <p className="rounded bg-slate-50 p-3 leading-5 text-slate-600">{detail.remark}</p>
            </div>
          )}
        </aside>
      </div>

      <div className="forge-action-bar">
        <Button type="button" variant="outline" size="sm" onClick={() => navigate('/outbound')}>返回波次列表</Button>
        {nextAction && (
          <Button type="button" size="sm" className={`gap-1.5 text-white ${nextAction.className}`} onClick={() => navigate(nextAction.to)}>
            {ActionIcon && <ActionIcon size={14} />}
            {nextAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}

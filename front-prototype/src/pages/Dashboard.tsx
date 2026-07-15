import React from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import PageTitle from '../components/shared/PageTitle';
import {
  AlertTriangle,
  ArrowRightLeft,
  BarChart3,
  Boxes,
  CheckSquare,
  ClipboardCheck,
  ClipboardX,
  PackageSearch,
  ShoppingCart,
  Truck,
} from 'lucide-react';

type Activity = {
  id: string;
  time: string;
  operator: string;
  action: string;
  target: string;
};

const getToday = () => {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const quickEntries = [
  { label: '收货入库', to: '/inbound', icon: ShoppingCart, tone: 'bg-blue-50 text-blue-700 border-blue-100' },
  { label: '出库波次', to: '/outbound', icon: Truck, tone: 'bg-orange-50 text-orange-700 border-orange-100' },
  { label: '库存查询', to: '/inventory', icon: PackageSearch, tone: 'bg-cyan-50 text-cyan-700 border-cyan-100' },
  { label: '盘点管理', to: '/inventory/checks', icon: ClipboardCheck, tone: 'bg-violet-50 text-violet-700 border-violet-100' },
  { label: '调拨管理', to: '/inventory/transfers', icon: ArrowRightLeft, tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  { label: '报损管理', to: '/inventory/damages', icon: ClipboardX, tone: 'bg-rose-50 text-rose-700 border-rose-100' },
];

export default function Dashboard() {
  const demoDate = useLiveQuery(async () => {
    const [inbounds, waves, checks] = await Promise.all([
      db.inbound_orders.toArray(),
      db.wave_orders.toArray(),
      db.inventory_checks.toArray(),
    ]);
    const dates = [
      ...inbounds.map(item => item.updatedAt || item.createdAt),
      ...waves.map(item => item.updatedAt || item.createdAt),
      ...checks.map(item => item.updatedAt || item.createdAt),
    ].filter((value): value is string => Boolean(value));
    return dates.sort().at(-1)?.slice(0, 10) || null;
  }, []) || getToday();
  const today = demoDate;

  const todayInboundCount = useLiveQuery(async () => {
    return await db.inbound_orders
      .filter(order => order.receiveDate === today || order.createdAt.startsWith(today))
      .count();
  }, [today]) || 0;

  const todayWaveCount = useLiveQuery(async () => {
    return await db.wave_orders
      .filter(order => order.createdAt.startsWith(today))
      .count();
  }, [today]) || 0;

  const pendingPickingTaskCount = useLiveQuery(async () => {
    const waves = await db.wave_orders
      .filter(order => order.status === 'DRAFT' || order.status === 'PICKING')
      .toArray();

    return waves.reduce((sum, wave) => {
      return sum + wave.items.filter(item => item.status !== 'PICKED' || item.qtyPicked < item.qtyRequired).length;
    }, 0);
  }) || 0;

  const warningSkuCount = useLiveQuery(async () => {
    const stocks = await db.inventory_stocks.toArray();
    return stocks.filter(item => item.qtyAvailable < item.safetyStock).length;
  }) || 0;

  const recentActivities = useLiveQuery(async () => {
    const [inbounds, waves, checks] = await Promise.all([
      db.inbound_orders.toArray(),
      db.wave_orders.toArray(),
      db.inventory_checks.toArray(),
    ]);

    const activities: Activity[] = [
      ...inbounds
        .filter(order => order.status === 'QC_PENDING' || order.status === 'PUTAWAY_PENDING' || order.status === 'COMPLETED')
        .map(order => ({
          id: order.id,
          time: order.updatedAt || order.createdAt,
          operator: order.createdBy || 'WmsOperator01',
          action: '收货',
          target: `${order.warehouseName} ${order.itemCount}种商品`,
        })),
      ...waves
        .filter(order => order.status === 'PICKING' || order.status === 'PICKED' || order.status === 'CHECKED' || order.status === 'SHIPPED')
        .map(order => ({
          id: order.id,
          time: order.updatedAt || order.createdAt,
          operator: order.pickerId || order.createdBy || '拣货员',
          action: '拣货',
          target: `${order.route} ${order.items.length}个任务`,
        })),
      ...checks
        .filter(order => order.status === 'COUNTING' || order.status === 'COMPLETED')
        .map(order => ({
          id: order.id,
          time: order.updatedAt || order.createdAt,
          operator: order.updatedBy || order.checker || order.createdBy,
          action: '盘点',
          target: `${order.warehouseName} ${order.itemCount}种商品`,
        })),
    ];

    return activities
      .sort((a, b) => b.time.localeCompare(a.time))
      .slice(0, 5);
  }) || [];

  const warehouseDistribution = useLiveQuery(async () => {
    const [warehouses, stocks] = await Promise.all([
      db.warehouses.toArray(),
      db.inventory_stocks.toArray(),
    ]);

    return warehouses
      .sort((a, b) => a.code.localeCompare(b.code))
      .slice(0, 6)
      .map(warehouse => ({
        code: warehouse.code,
        name: warehouse.name,
        qty: stocks
          .filter(stock => stock.warehouseCode === warehouse.code)
          .reduce((sum, stock) => sum + Math.max(0, stock.qtyTotal), 0),
      }));
  }) || [];

  const maxWarehouseQty = Math.max(1, ...warehouseDistribution.map(item => item.qty));

  const statCards = [
    { label: '今日入库单数', value: todayInboundCount, unit: '单', icon: ShoppingCart, tone: 'bg-blue-50 text-blue-700' },
    { label: '今日出库波次数', value: todayWaveCount, unit: '波', icon: Truck, tone: 'bg-orange-50 text-orange-700' },
    { label: '待拣货任务数', value: pendingPickingTaskCount, unit: '项', icon: CheckSquare, tone: 'bg-emerald-50 text-emerald-700' },
    { label: '库存预警SKU数', value: warningSkuCount, unit: 'SKU', icon: AlertTriangle, tone: warningSkuCount > 0 ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-500' },
  ];

  return (
    <div className="space-y-4 text-xs">
      <PageTitle
        eyebrow="主工作台"
        title="WMS 控制台"
        description="实时汇总今日入库、出库波次、拣货任务与库存预警状态"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-slate-400 font-semibold block">{card.label}</span>
                <strong className="text-2xl font-bold text-slate-800 font-mono">
                  {card.value}
                  <span className="text-xs font-semibold ml-1">{card.unit}</span>
                </strong>
                <span className="text-[10px] text-slate-400 block">数据来自 IndexedDB 实时聚合</span>
              </div>
              <div className={`p-3 rounded-lg ${card.tone}`}>
                <Icon size={22} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Boxes size={16} className="text-primary" />
              <span>快捷入口</span>
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {quickEntries.map(entry => {
              const Icon = entry.icon;
              return (
                <Link
                  key={entry.to}
                  to={entry.to}
                  className={`h-24 rounded-lg border p-4 flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:shadow-sm ${entry.tone}`}
                >
                  <Icon size={22} />
                  <span className="text-sm font-bold text-slate-800">{entry.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800">最近作业动态</h3>
            <span className="text-[10px] text-slate-400 font-mono">{today}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {recentActivities.length === 0 ? (
              <div className="py-8 text-center text-slate-400">暂无作业动态</div>
            ) : recentActivities.map(activity => (
              <div key={`${activity.id}-${activity.action}`} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-slate-800">{activity.operator}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{activity.time.substring(5, 16)}</span>
                </div>
                <p className="mt-1 text-slate-500 leading-relaxed">
                  <span className="font-semibold text-primary">{activity.action}</span>
                  <span className="mx-1">了</span>
                  <span>{activity.target}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <BarChart3 size={16} className="text-primary" />
            <span>仓库存储分布</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">按现存数量汇总</span>
        </div>
        <div className="h-64 flex items-end gap-4">
          {warehouseDistribution.map(item => {
            const height = Math.max(8, Math.round((item.qty / maxWarehouseQty) * 190));
            return (
              <div key={item.code} className="flex-1 min-w-0 h-full flex flex-col justify-end items-center gap-2">
                <div className="text-[10px] font-mono text-slate-500">{item.qty}</div>
                <div className="w-full max-w-24 bg-slate-100 rounded-t-md flex items-end justify-center overflow-hidden">
                  <div
                    className="w-full bg-primary rounded-t-md transition-all"
                    style={{ height: `${height}px` }}
                  />
                </div>
                <div className="w-full text-center">
                  <div className="text-[11px] font-bold text-slate-700 truncate" title={item.name}>{item.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{item.code}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

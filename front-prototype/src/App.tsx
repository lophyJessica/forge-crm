import React from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ManualPage from './pages/ManualPage';
import NotFoundPage from './pages/NotFoundPage';

// 模块 1：入库
import InboundList from './pages/InboundList';
import InboundForm from './pages/InboundForm';
import InboundDetail from './pages/InboundDetail';
import PutawayForm from './pages/PutawayForm';
import PutawayList from './pages/PutawayList';
import PutawayDetail from './pages/PutawayDetail';

// 模块 2：出库
import WaveList from './pages/WaveList';
import WaveForm from './pages/WaveForm';
import WaveDetail from './pages/WaveDetail';
import PickingForm from './pages/PickingForm';
import CheckForm from './pages/CheckForm';
import PackageForm from './pages/PackageForm';
import ShipForm from './pages/ShipForm';
import PickingList from './pages/PickingList';
import PickingDetail from './pages/PickingDetail';
import CheckList from './pages/CheckList';
import CheckDetail from './pages/CheckDetail';
import PackageList from './pages/PackageList';
import PackageDetail from './pages/PackageDetail';
import ShipList from './pages/ShipList';
import ShipDetail from './pages/ShipDetail';

// 模块 3：库存
import StockQuery from './pages/StockQuery';
import FlowList from './pages/FlowList';
import InventoryCheckList from './pages/InventoryCheckList';
import InventoryCheckForm from './pages/InventoryCheckForm';
import InventoryCheckDetail from './pages/InventoryCheckDetail';
import TransferList from './pages/TransferList';
import TransferForm from './pages/TransferForm';
import TransferDetail from './pages/TransferDetail';
import DamageList from './pages/DamageList';
import DamageForm from './pages/DamageForm';
import DamageDetail from './pages/DamageDetail';
import StockAlertList from './pages/StockAlertList';

// 模块 4：基础资料
import WarehouseList from './pages/WarehouseList';
import WarehouseForm from './pages/WarehouseForm';
import ZoneList from './pages/ZoneList';
import ZoneForm from './pages/ZoneForm';
import LocationList from './pages/LocationList';
import LocationForm from './pages/LocationForm';

// PDA 手持端
import PdaHome from './pages/PdaHome';
import PdaInbound from './pages/PdaInbound';
import PdaPicking from './pages/PdaPicking';
import PdaCheck from './pages/PdaCheck';
import AppShell from './components/layout/AppShell';
import Sidebar from './components/layout/Sidebar';
import TopNav from './components/layout/TopNav';

import { Bell, Menu, User } from 'lucide-react';

// 获取当前页面面包屑
const getBreadcrumbs = (path: string): [string, string] => {
  // 主工作台
  if (path === '/') return ['主工作台', '控制台首页'];
  if (path === '/manual') return ['操作支持', '操作手册'];
  
  // 入库作业管理
  if (path === '/inbound') return ['入库作业管理', '采购收货单'];
  if (path === '/inbound/new') return ['入库作业管理', '新建采购收货单'];
  if (/\/inbound\/[^/]+\/edit/.test(path)) return ['入库作业管理', '编辑采购收货单'];
  if (/\/inbound\/[^/]+\/putaway/.test(path)) return ['入库作业管理', '商品上架'];
  if (/\/inbound\/[^/]+/.test(path)) return ['入库作业管理', '采购收货单详情'];
  if (path === '/inventory/putaways') return ['入库作业管理', '商品上架单'];
  if (/\/inventory\/putaways\/[^/]+/.test(path)) return ['入库作业管理', '商品上架单详情'];

  // 出库作业管理
  if (path === '/outbound') return ['出库作业管理', '出库波次单'];
  if (path === '/outbound/new') return ['出库作业管理', '新建波次单'];
  if (/\/outbound\/[^/]+\/picking/.test(path)) return ['出库作业管理', '拣货下架'];
  if (/\/outbound\/[^/]+\/checking/.test(path)) return ['出库作业管理', '商品复核'];
  if (/\/outbound\/[^/]+\/packing/.test(path)) return ['出库作业管理', '打包包裹'];
  if (/\/outbound\/[^/]+\/shipping/.test(path)) return ['出库作业管理', '交运出库'];
  if (path === '/outbound/pickings') return ['出库作业管理', '拣货下架单'];
  if (/\/outbound\/pickings\/[^/]+/.test(path)) return ['出库作业管理', '拣货下架单详情'];
  if (path === '/outbound/checks') return ['出库作业管理', '商品复核单'];
  if (/\/outbound\/checks\/[^/]+/.test(path)) return ['出库作业管理', '商品复核单详情'];
  if (path === '/outbound/packages') return ['出库作业管理', '出库包裹'];
  if (/\/outbound\/packages\/[^/]+/.test(path)) return ['出库作业管理', '出库包裹详情'];
  if (path === '/outbound/ships') return ['出库作业管理', '交运出库单'];
  if (/\/outbound\/ships\/[^/]+/.test(path)) return ['出库作业管理', '交运出库单详情'];
  if (/\/outbound\/[^/]+$/.test(path)) return ['出库作业管理', '波次单详情'];

  // 库存中心台账
  if (path === '/inventory') return ['库存中心台账', '即时库存查询'];
  if (path === '/inventory/flows') return ['库存中心台账', '库存收发流水'];
  if (path === '/inventory/checks') return ['库存中心台账', '盘点管理'];
  if (path === '/inventory/checks/new') return ['库存中心台账', '新建盘点单'];
  if (/\/inventory\/checks\/[^/]+\/edit/.test(path)) return ['库存中心台账', '编辑盘点单'];
  if (/\/inventory\/checks\/[^/]+/.test(path)) return ['库存中心台账', '盘点单详情'];
  if (path === '/inventory/transfers') return ['库存中心台账', '调拨管理'];
  if (path === '/inventory/transfers/new') return ['库存中心台账', '新建调拨单'];
  if (/\/inventory\/transfers\/[^/]+\/edit/.test(path)) return ['库存中心台账', '编辑调拨单'];
  if (/\/inventory\/transfers\/[^/]+/.test(path)) return ['库存中心台账', '调拨单详情'];
  if (path === '/inventory/damages') return ['库存中心台账', '报损管理'];
  if (path === '/inventory/damages/new') return ['库存中心台账', '新建报损单'];
  if (/\/inventory\/damages\/[^/]+\/edit/.test(path)) return ['库存中心台账', '编辑报损单'];
  if (/\/inventory\/damages\/[^/]+/.test(path)) return ['库存中心台账', '报损单详情'];
  if (path === '/inventory/alerts') return ['库存中心台账', '库存水位预警'];

  // 基础资料维护
  if (path === '/base/warehouses') return ['基础资料维护', '仓库管理'];
  if (path === '/base/warehouses/new') return ['基础资料维护', '新建仓库'];
  if (/\/base\/warehouses\/[^/]+\/edit/.test(path)) return ['基础资料维护', '编辑仓库'];
  if (path === '/base/zones') return ['基础资料维护', '库区管理'];
  if (path === '/base/zones/new') return ['基础资料维护', '新建库区'];
  if (/\/base\/zones\/[^/]+\/edit/.test(path)) return ['基础资料维护', '编辑库区'];
  if (path === '/base/locations') return ['基础资料维护', '货位管理'];
  if (path === '/base/locations/new') return ['基础资料维护', '新建货位'];
  if (/\/base\/locations\/[^/]+\/edit/.test(path)) return ['基础资料维护', '编辑货位'];

  return ['主工作台', '控制台首页'];
};

// B 端后台主布局组件
function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const openMobileMenu = () => {
    setIsCollapsed(false);
    setMobileMenuOpen(true);
  };

  return (
    <AppShell
      sidebarCollapsed={isCollapsed}
      sidebar={(
        <>
          <Sidebar
            isCollapsed={isCollapsed}
            mobileMenuOpen={mobileMenuOpen}
            onCollapsedChange={setIsCollapsed}
          />
          {mobileMenuOpen && (
            <button
              type="button"
              aria-label="关闭导航菜单"
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-y-0 left-[200px] right-0 z-40 bg-slate-950/30 lg:hidden"
            />
          )}
        </>
      )}
      topNav={(
        <TopNav>
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="打开导航菜单"
              title="打开导航菜单"
              onClick={openMobileMenu}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
            >
              <Menu size={16} />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-500">
              {(() => {
                const [group, name] = getBreadcrumbs(location.pathname);
                return (
                  <>
                    <span className="truncate">{group}</span>
                    <span className="shrink-0 text-slate-300">/</span>
                    <span className="truncate font-semibold text-slate-800">{name}</span>
                  </>
                );
              })()}
            </div>
          </div>

          <div className="flex items-center gap-5 text-slate-500">
            <button
              type="button"
              aria-label="查看通知"
              title="查看通知"
              className="relative rounded-full p-1.5 transition-colors hover:bg-slate-100"
            >
              <Bell size={16} />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2 text-xs">
              <User size={15} />
              <span className="hidden font-semibold text-slate-700 sm:inline">WmsScheduler</span>
            </div>
          </div>
        </TopNav>
      )}
    >
      {children}
    </AppShell>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

function AppContent() {
  const location = useLocation();

  if (location.pathname.startsWith('/pda')) {
    return (
      <Routes>
        <Route path="/pda" element={<PdaHome />} />
        <Route path="/pda/inbound" element={<PdaInbound />} />
        <Route path="/pda/picking" element={<PdaPicking />} />
        <Route path="/pda/check" element={<PdaCheck />} />
        <Route path="*" element={<PdaHome />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        {/* 控制台首页 */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/manual" element={<ManualPage />} />
        
        {/* 模块1：入库 */}
        <Route path="/inbound" element={<InboundList />} />
        <Route path="/inbound/new" element={<InboundForm />} />
        <Route path="/inbound/:id/edit" element={<InboundForm />} />
        <Route path="/inbound/:id" element={<InboundDetail />} />
        <Route path="/inbound/:id/putaway" element={<PutawayForm />} />
        <Route path="/inventory/putaways" element={<PutawayList />} />
        <Route path="/inventory/putaways/:id" element={<PutawayDetail />} />

        {/* 模块2：出库 */}
        <Route path="/outbound" element={<WaveList />} />
        <Route path="/outbound/new" element={<WaveForm />} />
        <Route path="/outbound/:id" element={<WaveDetail />} />
        <Route path="/outbound/:wid/picking" element={<PickingForm />} />
        <Route path="/outbound/:wid/checking" element={<CheckForm />} />
        <Route path="/outbound/:wid/packing" element={<PackageForm />} />
        <Route path="/outbound/:wid/shipping" element={<ShipForm />} />
        <Route path="/outbound/pickings" element={<PickingList />} />
        <Route path="/outbound/pickings/:id" element={<PickingDetail />} />
        <Route path="/outbound/checks" element={<CheckList />} />
        <Route path="/outbound/checks/:id" element={<CheckDetail />} />
        <Route path="/outbound/packages" element={<PackageList />} />
        <Route path="/outbound/packages/:id" element={<PackageDetail />} />
        <Route path="/outbound/ships" element={<ShipList />} />
        <Route path="/outbound/ships/:id" element={<ShipDetail />} />

        {/* 模块3：库存 */}
        <Route path="/inventory" element={<StockQuery />} />
        <Route path="/inventory/flows" element={<FlowList />} />
        <Route path="/inventory/checks" element={<InventoryCheckList />} />
        <Route path="/inventory/checks/new" element={<InventoryCheckForm />} />
        <Route path="/inventory/checks/:id/edit" element={<InventoryCheckForm />} />
        <Route path="/inventory/checks/:id" element={<InventoryCheckDetail />} />
          <Route path="/inventory/transfers" element={<TransferList />} />
          <Route path="/inventory/transfers/new" element={<TransferForm />} />
          <Route path="/inventory/transfers/:id/edit" element={<TransferForm />} />
          <Route path="/inventory/transfers/:id" element={<TransferDetail />} />
          <Route path="/inventory/damages" element={<DamageList />} />
          <Route path="/inventory/damages/new" element={<DamageForm />} />
          <Route path="/inventory/damages/:id/edit" element={<DamageForm />} />
          <Route path="/inventory/damages/:id" element={<DamageDetail />} />
          <Route path="/inventory/alerts" element={<StockAlertList />} />

          {/* 模块4：基础资料 */}
        <Route path="/base/warehouses" element={<WarehouseList />} />
        <Route path="/base/warehouses/new" element={<WarehouseForm />} />
        <Route path="/base/warehouses/:code/edit" element={<WarehouseForm />} />
        <Route path="/base/zones" element={<ZoneList />} />
        <Route path="/base/zones/new" element={<ZoneForm />} />
        <Route path="/base/zones/:code/edit" element={<ZoneForm />} />
        <Route path="/base/locations" element={<LocationList />} />
        <Route path="/base/locations/new" element={<LocationForm />} />
        <Route path="/base/locations/:code/edit" element={<LocationForm />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}

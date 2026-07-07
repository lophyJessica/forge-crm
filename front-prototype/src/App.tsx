import React from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';

// 模块 1：入库
import InboundList from './pages/InboundList';
import InboundForm from './pages/InboundForm';
import InboundDetail from './pages/InboundDetail';
import PutawayForm from './pages/PutawayForm';

// 模块 2：出库
import WaveList from './pages/WaveList';
import WaveForm from './pages/WaveForm';
import PickingForm from './pages/PickingForm';
import CheckForm from './pages/CheckForm';
import PackageForm from './pages/PackageForm';
import ShipForm from './pages/ShipForm';

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

import { 
  Layers, Home, ShoppingCart, Truck, Package, 
  Menu, User, Bell, ClipboardList, Building2, Map, MapPin,
  ClipboardCheck, ArrowRightLeft, ClipboardX
} from 'lucide-react';

// B 端后台主布局组件
function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  // 判断菜单项激活态
  const isMenuChecked = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* 左侧侧边栏 */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0">
        {/* 系统 LOGO 区域 */}
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-slate-800 bg-slate-950">
          <div className="bg-primary p-1.5 rounded-lg text-white">
            <Layers size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-white text-sm tracking-wide">Forge WMS</h2>
            <p className="text-[10px] text-slate-500 font-mono">仓储管理控制台 v1.2</p>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
          {/* 组1：主工作台 */}
          <div>
            <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2 font-mono">主工作台</span>
            <ul className="space-y-1 text-xs">
              <li>
                <Link 
                  to="/" 
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer ${
                    isMenuChecked('/')
                      ? 'bg-primary text-white font-bold' 
                      : 'hover:bg-slate-855 hover:text-white text-slate-400'
                  }`}
                >
                  <Home size={15} />
                  <span>控制台首页</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* 组2：入库作业 */}
          <div>
            <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2 font-mono">入库作业管理</span>
            <ul className="space-y-1 text-xs font-semibold">
              <li>
                <Link 
                  to="/inbound" 
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer ${
                    isMenuChecked('/inbound')
                      ? 'bg-primary text-white font-bold' 
                      : 'hover:bg-slate-855 hover:text-white text-slate-400'
                  }`}
                >
                  <ShoppingCart size={15} />
                  <span>采购收货单</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* 组3：出库作业 */}
          <div>
            <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2 font-mono">出库作业管理</span>
            <ul className="space-y-1 text-xs font-semibold">
              <li>
                <Link 
                  to="/outbound" 
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer ${
                    isMenuChecked('/outbound')
                      ? 'bg-primary text-white font-bold' 
                      : 'hover:bg-slate-855 hover:text-white text-slate-400'
                  }`}
                >
                  <Truck size={15} />
                  <span>出库波次单</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* 组4：库存分析 */}
          <div>
            <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2 font-mono">库存中心台账</span>
            <ul className="space-y-1 text-xs font-semibold">
              <li>
                <Link 
                  to="/inventory" 
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer ${
                    location.pathname === '/inventory'
                      ? 'bg-primary text-white font-bold' 
                      : 'hover:bg-slate-855 hover:text-white text-slate-400'
                  }`}
                >
                  <Package size={15} />
                  <span>即时库存查询</span>
                </Link>
              </li>
              <li>
                <Link 
                  to="/inventory/flows" 
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer ${
                    isMenuChecked('/inventory/flows')
                      ? 'bg-primary text-white font-bold' 
                      : 'hover:bg-slate-855 hover:text-white text-slate-400'
                  }`}
                >
                  <ClipboardList size={15} />
                  <span>库存收发流水</span>
                </Link>
              </li>
              <li>
                <Link 
                  to="/inventory/checks" 
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer ${
                    isMenuChecked('/inventory/checks')
                      ? 'bg-primary text-white font-bold' 
                      : 'hover:bg-slate-855 hover:text-white text-slate-400'
                  }`}
                >
                  <ClipboardCheck size={15} />
                  <span>盘点管理</span>
                </Link>
              </li>
              <li>
                <Link 
                  to="/inventory/transfers" 
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer ${
                    isMenuChecked('/inventory/transfers')
                      ? 'bg-primary text-white font-bold' 
                      : 'hover:bg-slate-855 hover:text-white text-slate-400'
                  }`}
                >
                  <ArrowRightLeft size={15} />
                  <span>调拨管理</span>
                </Link>
              </li>
              <li>
                <Link 
                  to="/inventory/damages" 
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer ${
                    isMenuChecked('/inventory/damages')
                      ? 'bg-primary text-white font-bold' 
                      : 'hover:bg-slate-855 hover:text-white text-slate-400'
                  }`}
                >
                  <ClipboardX size={15} />
                  <span>报损管理</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* 组5：基础资料 */}
          <div>
            <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2 font-mono">基础资料维护</span>
            <ul className="space-y-1 text-xs font-semibold">
              <li>
                <Link 
                  to="/base/warehouses" 
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer ${
                    isMenuChecked('/base/warehouses')
                      ? 'bg-primary text-white font-bold' 
                      : 'hover:bg-slate-855 hover:text-white text-slate-400'
                  }`}
                >
                  <Building2 size={15} />
                  <span>仓库档案</span>
                </Link>
              </li>
              <li>
                <Link 
                  to="/base/zones" 
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer ${
                    isMenuChecked('/base/zones')
                      ? 'bg-primary text-white font-bold' 
                      : 'hover:bg-slate-855 hover:text-white text-slate-400'
                  }`}
                >
                  <Map size={15} />
                  <span>库区管理</span>
                </Link>
              </li>
              <li>
                <Link 
                  to="/base/locations" 
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer ${
                    isMenuChecked('/base/locations')
                      ? 'bg-primary text-white font-bold' 
                      : 'hover:bg-slate-855 hover:text-white text-slate-400'
                  }`}
                >
                  <MapPin size={15} />
                  <span>货位管理</span>
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        {/* 底部用户信息 */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white">
              S
            </div>
            <div>
              <div className="font-bold text-white">WmsScheduler</div>
              <span className="text-[10px] text-slate-500 font-medium">系统分配管理员</span>
            </div>
          </div>
        </div>
      </aside>

      {/* 右侧主作业区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部标题导航 */}
        <header className="h-16 bg-white border-b border-slate-200/85 px-8 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
            <button className="text-slate-500 hover:text-slate-700 cursor-pointer">
              <Menu size={18} />
            </button>
            <div className="h-4 w-px bg-slate-200"></div>
            <span className="text-xs font-semibold text-slate-500 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              强盛自研智能物流系统
            </span>
          </div>

          <div className="flex items-center gap-5 text-slate-500">
            <button className="relative p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            </button>
            <div className="h-4 w-px bg-slate-200"></div>
            <div className="flex items-center gap-2 text-xs">
              <User size={15} />
              <span className="font-semibold text-slate-700">WmsScheduler</span>
            </div>
          </div>
        </header>

        {/* 主内容区域 */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {children}
        </main>
      </div>
    </div>
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
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        {/* 控制台首页 */}
        <Route path="/" element={<Dashboard />} />
        
        {/* 模块1：入库 */}
        <Route path="/inbound" element={<InboundList />} />
        <Route path="/inbound/new" element={<InboundForm />} />
        <Route path="/inbound/:id/edit" element={<InboundForm />} />
        <Route path="/inbound/:id" element={<InboundDetail />} />
        <Route path="/inbound/:id/putaway" element={<PutawayForm />} />

        {/* 模块2：出库 */}
        <Route path="/outbound" element={<WaveList />} />
        <Route path="/outbound/new" element={<WaveForm />} />
        <Route path="/outbound/:wid/picking" element={<PickingForm />} />
        <Route path="/outbound/:wid/checking" element={<CheckForm />} />
        <Route path="/outbound/:wid/packing" element={<PackageForm />} />
        <Route path="/outbound/:wid/shipping" element={<ShipForm />} />

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
          <Route path="/inventory/damages/:id" element={<DamageDetail />} />

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
      </Routes>
    </Layout>
  );
}

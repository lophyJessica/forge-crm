import React from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ManualPage from './pages/ManualPage';

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
  ClipboardCheck, ArrowRightLeft, ClipboardX, BookOpen
} from 'lucide-react';

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
  if (/\/inventory\/damages\/[^/]+/.test(path)) return ['库存中心台账', '报损单详情'];
  if (path === '/inventory/alerts') return ['库存中心台账', '库存水位预警'];

  // 基础资料维护
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
  const isCollapsed = false;
  const [expandedGroups, setExpandedGroups] = React.useState<string[]>([]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  React.useEffect(() => {
    let activeGroup = '';
    const path = location.pathname;
    if (path === '/') {
      activeGroup = 'dashboard';
    } else if (path.startsWith('/inbound')) {
      activeGroup = 'inbound';
    } else if (path.startsWith('/outbound')) {
      activeGroup = 'outbound';
    } else if (path.startsWith('/inventory')) {
      activeGroup = 'inventory';
    } else if (path.startsWith('/base')) {
      activeGroup = 'base';
    } else if (path.startsWith('/manual')) {
      activeGroup = 'support';
    }

    if (activeGroup) {
      setExpandedGroups(prev => {
        if (prev.includes(activeGroup)) return prev;
        return [...prev, activeGroup];
      });
    }
  }, [location.pathname]);

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
      <aside className={`bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
        {/* 系统 LOGO 区域 */}
        <div className={`h-16 flex items-center border-b border-slate-800 bg-slate-950 transition-all duration-300 ${
          isCollapsed ? 'justify-center' : 'justify-between px-4'
        }`}>
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="bg-primary p-1.5 rounded-lg text-white shrink-0">
                <Layers size={20} className="text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-white text-sm tracking-wide truncate">Forge WMS</h2>
                <p className="text-[10px] text-slate-500 font-mono truncate">仓储管理控制台 v1.2</p>
              </div>
            </div>
          )}

        </div>

        {/* 导航菜单 */}
        <nav className={`flex-1 py-6 space-y-6 overflow-y-auto transition-all duration-300 ${
          isCollapsed ? 'px-2' : 'px-4'
        }`}>
          {/* 组1：主工作台 */}
          <div>
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => toggleGroup('dashboard')}
                className="w-full flex items-center justify-between px-3 text-xs font-bold text-white uppercase tracking-wider mb-2 font-mono hover:text-slate-100 transition-colors cursor-pointer"
              >
                <span>主工作台</span>
                <span className="text-[8px] transform transition-transform duration-200">
                  {expandedGroups.includes('dashboard') ? '▼' : '▶'}
                </span>
              </button>
            ) : null}
            {(isCollapsed || expandedGroups.includes('dashboard')) && (
              <ul className="space-y-1 text-[10px]">
                <li>
                  <Link 
                    to="/" 
                    title={isCollapsed ? "控制台首页" : ""}
                    className={`flex items-center rounded-md transition-colors cursor-pointer ${
                      isCollapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5'
                    } ${
                      isMenuChecked('/')
                        ? 'bg-primary text-white font-bold' 
                        : 'hover:bg-slate-855 hover:text-white text-slate-300'
                    }`}
                  >
                    <Home size={15} className="shrink-0" />
                    {!isCollapsed && <span>控制台首页</span>}
                  </Link>
                </li>
              </ul>
            )}
          </div>

          {/* 组2：入库作业 */}
          <div>
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => toggleGroup('inbound')}
                className="w-full flex items-center justify-between px-3 text-xs font-bold text-white uppercase tracking-wider mb-2 font-mono hover:text-slate-100 transition-colors cursor-pointer"
              >
                <span>入库作业管理</span>
                <span className="text-[8px] transform transition-transform duration-200">
                  {expandedGroups.includes('inbound') ? '▼' : '▶'}
                </span>
              </button>
            ) : null}
            {(isCollapsed || expandedGroups.includes('inbound')) && (
              <ul className="space-y-1 text-[10px] font-semibold">
                <li>
                  <Link 
                    to="/inbound" 
                    title={isCollapsed ? "采购收货单" : ""}
                    className={`flex items-center rounded-md transition-colors cursor-pointer ${
                      isCollapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5'
                    } ${
                      location.pathname === '/inbound' || location.pathname.startsWith('/inbound/') && !location.pathname.endsWith('/putaway')
                        ? 'bg-primary text-white font-bold' 
                        : 'hover:bg-slate-855 hover:text-white text-slate-300'
                    }`}
                  >
                    <ShoppingCart size={15} className="shrink-0" />
                    {!isCollapsed && <span>采购收货单</span>}
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/inventory/putaways" 
                    title={isCollapsed ? "商品上架单" : ""}
                    className={`flex items-center rounded-md transition-colors cursor-pointer ${
                      isCollapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5'
                    } ${
                      isMenuChecked('/inventory/putaways')
                        ? 'bg-primary text-white font-bold' 
                        : 'hover:bg-slate-855 hover:text-white text-slate-300'
                    }`}
                  >
                    <Layers size={15} className="shrink-0" />
                    {!isCollapsed && <span>商品上架单</span>}
                  </Link>
                </li>
              </ul>
            )}
          </div>

          {/* 组3：出库作业 */}
          <div>
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => toggleGroup('outbound')}
                className="w-full flex items-center justify-between px-3 text-xs font-bold text-white uppercase tracking-wider mb-2 font-mono hover:text-slate-100 transition-colors cursor-pointer"
              >
                <span>出库作业管理</span>
                <span className="text-[8px] transform transition-transform duration-200">
                  {expandedGroups.includes('outbound') ? '▼' : '▶'}
                </span>
              </button>
            ) : null}
            {(isCollapsed || expandedGroups.includes('outbound')) && (
              <ul className="space-y-1 text-[10px] font-semibold">
                <li>
                  <Link 
                    to="/outbound" 
                    title={isCollapsed ? "出库波次单" : ""}
                    className={`flex items-center rounded-md transition-colors cursor-pointer ${
                      isCollapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5'
                    } ${
                      location.pathname === '/outbound'
                        ? 'bg-primary text-white font-bold' 
                        : 'hover:bg-slate-855 hover:text-white text-slate-300'
                    }`}
                  >
                    <Layers size={15} className="shrink-0" />
                    {!isCollapsed && <span>出库波次单</span>}
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/outbound/pickings" 
                    title={isCollapsed ? "拣货下架单" : ""}
                    className={`flex items-center rounded-md transition-colors cursor-pointer ${
                      isCollapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5'
                    } ${
                      isMenuChecked('/outbound/pickings')
                        ? 'bg-primary text-white font-bold' 
                        : 'hover:bg-slate-855 hover:text-white text-slate-300'
                    }`}
                  >
                    <ClipboardList size={15} className="shrink-0" />
                    {!isCollapsed && <span>拣货下架单</span>}
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/outbound/checks" 
                    title={isCollapsed ? "商品复核单" : ""}
                    className={`flex items-center rounded-md transition-colors cursor-pointer ${
                      isCollapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5'
                    } ${
                      isMenuChecked('/outbound/checks')
                        ? 'bg-primary text-white font-bold' 
                        : 'hover:bg-slate-855 hover:text-white text-slate-300'
                    }`}
                  >
                    <ClipboardCheck size={15} className="shrink-0" />
                    {!isCollapsed && <span>商品复核单</span>}
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/outbound/packages" 
                    title={isCollapsed ? "出库包裹" : ""}
                    className={`flex items-center rounded-md transition-colors cursor-pointer ${
                      isCollapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5'
                    } ${
                      isMenuChecked('/outbound/packages')
                        ? 'bg-primary text-white font-bold' 
                        : 'hover:bg-slate-855 hover:text-white text-slate-300'
                    }`}
                  >
                    <Package size={15} className="shrink-0" />
                    {!isCollapsed && <span>出库包裹</span>}
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/outbound/ships" 
                    title={isCollapsed ? "交运出库单" : ""}
                    className={`flex items-center rounded-md transition-colors cursor-pointer ${
                      isCollapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5'
                    } ${
                      isMenuChecked('/outbound/ships')
                        ? 'bg-primary text-white font-bold' 
                        : 'hover:bg-slate-855 hover:text-white text-slate-300'
                    }`}
                  >
                    <Truck size={15} className="shrink-0" />
                    {!isCollapsed && <span>交运出库单</span>}
                  </Link>
                </li>
              </ul>
            )}
          </div>

          {/* 组4：库存分析 */}
          <div>
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => toggleGroup('inventory')}
                className="w-full flex items-center justify-between px-3 text-xs font-bold text-white uppercase tracking-wider mb-2 font-mono hover:text-slate-100 transition-colors cursor-pointer"
              >
                <span>库存中心台账</span>
                <span className="text-[8px] transform transition-transform duration-200">
                  {expandedGroups.includes('inventory') ? '▼' : '▶'}
                </span>
              </button>
            ) : null}
            {(isCollapsed || expandedGroups.includes('inventory')) && (
              <ul className="space-y-1 text-[10px] font-semibold">
                <li>
                  <Link 
                    to="/inventory" 
                    title={isCollapsed ? "即时库存查询" : ""}
                    className={`flex items-center rounded-md transition-colors cursor-pointer ${
                      isCollapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5'
                    } ${
                      location.pathname === '/inventory'
                        ? 'bg-primary text-white font-bold' 
                        : 'hover:bg-slate-855 hover:text-white text-slate-300'
                    }`}
                  >
                    <Package size={15} className="shrink-0" />
                    {!isCollapsed && <span>即时库存查询</span>}
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/inventory/flows" 
                    title={isCollapsed ? "库存收发流水" : ""}
                    className={`flex items-center rounded-md transition-colors cursor-pointer ${
                      isCollapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5'
                    } ${
                      isMenuChecked('/inventory/flows')
                        ? 'bg-primary text-white font-bold' 
                        : 'hover:bg-slate-855 hover:text-white text-slate-300'
                    }`}
                  >
                    <ClipboardList size={15} className="shrink-0" />
                    {!isCollapsed && <span>库存收发流水</span>}
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/inventory/checks" 
                    title={isCollapsed ? "盘点管理" : ""}
                    className={`flex items-center rounded-md transition-colors cursor-pointer ${
                      isCollapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5'
                    } ${
                      isMenuChecked('/inventory/checks')
                        ? 'bg-primary text-white font-bold' 
                        : 'hover:bg-slate-855 hover:text-white text-slate-300'
                    }`}
                  >
                    <ClipboardCheck size={15} className="shrink-0" />
                    {!isCollapsed && <span>盘点管理</span>}
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/inventory/transfers" 
                    title={isCollapsed ? "调拨管理" : ""}
                    className={`flex items-center rounded-md transition-colors cursor-pointer ${
                      isCollapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5'
                    } ${
                      isMenuChecked('/inventory/transfers')
                        ? 'bg-primary text-white font-bold' 
                        : 'hover:bg-slate-855 hover:text-white text-slate-300'
                    }`}
                  >
                    <ArrowRightLeft size={15} className="shrink-0" />
                    {!isCollapsed && <span>调拨管理</span>}
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/inventory/damages" 
                    title={isCollapsed ? "报损管理" : ""}
                    className={`flex items-center rounded-md transition-colors cursor-pointer ${
                      isCollapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5'
                    } ${
                      isMenuChecked('/inventory/damages')
                        ? 'bg-primary text-white font-bold' 
                        : 'hover:bg-slate-855 hover:text-white text-slate-300'
                    }`}
                  >
                    <ClipboardX size={15} className="shrink-0" />
                    {!isCollapsed && <span>报损管理</span>}
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/inventory/alerts" 
                    title={isCollapsed ? "库存水位预警" : ""}
                    className={`flex items-center rounded-md transition-colors cursor-pointer ${
                      isCollapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5'
                    } ${
                      isMenuChecked('/inventory/alerts')
                        ? 'bg-primary text-white font-bold' 
                        : 'hover:bg-slate-855 hover:text-white text-slate-300'
                    }`}
                  >
                    <Bell size={15} className="shrink-0" />
                    {!isCollapsed && <span>库存水位预警</span>}
                  </Link>
                </li>
              </ul>
            )}
          </div>

          {/* 组5：基础资料 */}
          <div>
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => toggleGroup('base')}
                className="w-full flex items-center justify-between px-3 text-xs font-bold text-white uppercase tracking-wider mb-2 font-mono hover:text-slate-100 transition-colors cursor-pointer"
              >
                <span>基础资料维护</span>
                <span className="text-[8px] transform transition-transform duration-200">
                  {expandedGroups.includes('base') ? '▼' : '▶'}
                </span>
              </button>
            ) : null}
            {(isCollapsed || expandedGroups.includes('base')) && (
              <ul className="space-y-1 text-[10px] font-semibold">
                <li>
                  <Link 
                    to="/base/zones" 
                    title={isCollapsed ? "库区管理" : ""}
                    className={`flex items-center rounded-md transition-colors cursor-pointer ${
                      isCollapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5'
                    } ${
                      isMenuChecked('/base/zones')
                        ? 'bg-primary text-white font-bold' 
                        : 'hover:bg-slate-855 hover:text-white text-slate-300'
                    }`}
                  >
                    <Map size={15} className="shrink-0" />
                    {!isCollapsed && <span>库区管理</span>}
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/base/locations" 
                    title={isCollapsed ? "货位管理" : ""}
                    className={`flex items-center rounded-md transition-colors cursor-pointer ${
                      isCollapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5'
                    } ${
                      isMenuChecked('/base/locations')
                        ? 'bg-primary text-white font-bold' 
                        : 'hover:bg-slate-855 hover:text-white text-slate-300'
                    }`}
                  >
                    <MapPin size={15} className="shrink-0" />
                    {!isCollapsed && <span>货位管理</span>}
                  </Link>
                </li>
              </ul>
            )}
          </div>

          {/* 组6：操作支持 */}
          <div>
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => toggleGroup('support')}
                className="w-full flex items-center justify-between px-3 text-xs font-bold text-white uppercase tracking-wider mb-2 font-mono hover:text-slate-100 transition-colors cursor-pointer"
              >
                <span>操作支持</span>
                <span className="text-[8px] transform transition-transform duration-200">
                  {expandedGroups.includes('support') ? '▼' : '▶'}
                </span>
              </button>
            ) : null}
            {(isCollapsed || expandedGroups.includes('support')) && (
              <ul className="space-y-1 text-[10px] font-semibold">
                <li>
                  <Link
                    to="/manual"
                    title={isCollapsed ? "操作手册" : ""}
                    className={`flex items-center rounded-md transition-colors cursor-pointer ${
                      isCollapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5'
                    } ${
                      isMenuChecked('/manual')
                        ? 'bg-primary text-white font-bold'
                        : 'hover:bg-slate-855 hover:text-white text-slate-300'
                    }`}
                  >
                    <BookOpen size={15} className="shrink-0" />
                    {!isCollapsed && <span>操作手册</span>}
                  </Link>
                </li>
              </ul>
            )}
          </div>
        </nav>

        {/* 底部用户信息 */}
        <div className={`p-4 border-t border-slate-800 bg-slate-950 flex items-center text-xs transition-all duration-300 ${
          isCollapsed ? 'justify-center px-2 gap-0' : 'justify-between gap-2'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white shrink-0">
              S
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="font-bold text-white truncate max-w-[120px]">WmsScheduler</div>
                <span className="text-[10px] text-slate-500 font-medium truncate block max-w-[120px]">系统分配管理员</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* 右侧主作业区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部标题导航 */}
        <header className="h-16 bg-white border-b border-slate-200/85 px-8 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            {(() => {
              const [group, name] = getBreadcrumbs(location.pathname);
              return (
                <>
                  <span>{group}</span>
                  <span className="text-slate-300">/</span>
                  <span className="text-slate-800 font-semibold">{name}</span>
                </>
              );
            })()}
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
          <Route path="/inventory/damages/:id" element={<DamageDetail />} />
          <Route path="/inventory/alerts" element={<StockAlertList />} />

          {/* 模块4：基础资料 */}
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

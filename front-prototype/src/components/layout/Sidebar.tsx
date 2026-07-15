import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BookOpen,
  Box,
  ChevronDown,
  ChevronLeft,
  Package,
  ShoppingCart,
  Truck,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  mobileMenuOpen: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

interface MenuChild {
  label: string;
  to: string;
  isActive?: (pathname: string) => boolean;
}

interface MenuSection {
  id: string;
  label: string;
  icon: LucideIcon;
  to?: string;
  children?: MenuChild[];
}

const isPathActive = (pathname: string, path: string) => (
  pathname === path || pathname.startsWith(`${path}/`)
);

const menuSections: MenuSection[] = [
  {
    id: 'dashboard',
    label: '主工作台',
    icon: Box,
    children: [
      {
        label: '控制台首页',
        to: '/',
        isActive: pathname => pathname === '/',
      },
    ],
  },
  {
    id: 'inbound',
    label: '入库作业管理',
    icon: Truck,
    children: [
      {
        label: '采购收货单',
        to: '/inbound',
        isActive: pathname => pathname.startsWith('/inbound') && !pathname.endsWith('/putaway'),
      },
      {
        label: '商品上架单',
        to: '/inventory/putaways',
        isActive: pathname => pathname.startsWith('/inventory/putaways') || pathname.endsWith('/putaway'),
      },
    ],
  },
  {
    id: 'outbound',
    label: '出库作业管理',
    icon: ShoppingCart,
    children: [
      {
        label: '出库波次单',
        to: '/outbound',
        isActive: pathname => pathname === '/outbound'
          || pathname === '/outbound/new'
          || (
            pathname.startsWith('/outbound/')
            && !['/outbound/pickings', '/outbound/checks', '/outbound/packages', '/outbound/ships']
              .some(path => pathname.startsWith(path))
          ),
      },
      { label: '拣货下架单', to: '/outbound/pickings' },
      { label: '商品复核单', to: '/outbound/checks' },
      { label: '出库包裹', to: '/outbound/packages' },
      { label: '交运出库单', to: '/outbound/ships' },
    ],
  },
  {
    id: 'inventory',
    label: '库存中心台账',
    icon: BarChart3,
    children: [
      {
        label: '即时库存查询',
        to: '/inventory',
        isActive: pathname => pathname === '/inventory',
      },
      { label: '库存收发流水', to: '/inventory/flows' },
      { label: '盘点管理', to: '/inventory/checks' },
      { label: '调拨管理', to: '/inventory/transfers' },
      { label: '报损管理', to: '/inventory/damages' },
      { label: '库存水位预警', to: '/inventory/alerts' },
    ],
  },
  {
    id: 'base',
    label: '基础资料维护',
    icon: Package,
    children: [
      { label: '仓库管理', to: '/base/warehouses' },
      { label: '库区管理', to: '/base/zones' },
      { label: '货位管理', to: '/base/locations' },
    ],
  },
  {
    id: 'support',
    label: '操作支持',
    icon: BookOpen,
    children: [
      { label: '操作手册', to: '/manual' },
      { label: 'PDA 手持端', to: '/pda' },
    ],
  },
];

const isChildActive = (child: MenuChild, pathname: string) => (
  child.isActive ? child.isActive(pathname) : isPathActive(pathname, child.to)
);

const getActiveSectionId = (pathname: string) => menuSections.find(section => {
  if (section.to) return section.to === '/' ? pathname === '/' : isPathActive(pathname, section.to);
  return section.children?.some(child => isChildActive(child, pathname));
})?.id;

export default function Sidebar({
  isCollapsed,
  mobileMenuOpen,
  onCollapsedChange,
}: SidebarProps) {
  const location = useLocation();
  const activeSectionId = getActiveSectionId(location.pathname);
  const [expandedGroup, setExpandedGroup] = React.useState<string | null>(() => (
    activeSectionId ?? null
  ));

  React.useEffect(() => {
    if (activeSectionId) {
      setExpandedGroup(activeSectionId);
    }
  }, [activeSectionId, location.pathname]);

  const toggleGroup = (groupId: string) => {
    if (isCollapsed) {
      onCollapsedChange(false);
      setExpandedGroup(groupId);
      return;
    }
    setExpandedGroup(current => current === groupId ? null : groupId);
  };

  return (
    <aside
      aria-label="主导航"
      className={`fixed inset-y-0 left-0 z-50 flex w-[200px] shrink-0 transform flex-col border-r border-[#edf0f4] bg-white text-[#596579] shadow-[4px_0_18px_rgba(30,64,175,0.05)] transition-[width,transform] duration-200 lg:z-30 lg:translate-x-0 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } ${isCollapsed ? 'lg:w-14' : 'lg:w-[200px]'}`}
    >
      <nav className={`flex-1 overflow-x-hidden overflow-y-auto py-4 ${isCollapsed ? 'lg:px-2' : 'px-2'}`}>
        <ul className="space-y-3">
          {menuSections.map(section => {
            const Icon = section.icon;
            const isExpanded = expandedGroup === section.id;
            const isSectionActive = activeSectionId === section.id;

            return (
              <li key={section.id}>
                {section.to ? (
                  <Link
                    to={section.to}
                    aria-current={isSectionActive ? 'page' : undefined}
                    title={isCollapsed ? section.label : undefined}
                    className={`flex h-11 items-center rounded-md transition-colors ${
                      isCollapsed ? 'justify-center lg:px-0' : 'gap-3 px-3'
                    } ${
                      isSectionActive
                        ? isCollapsed
                          ? 'bg-[#eaf3ff] text-[#1677ff]'
                          : 'font-medium text-[#1677ff]'
                        : 'text-[#596579] hover:bg-[#f6f7f9] hover:text-[#1677ff]'
                    }`}
                  >
                    <Icon size={17} strokeWidth={1.8} className="shrink-0" />
                    {!isCollapsed && <span className="truncate text-sm">{section.label}</span>}
                  </Link>
                ) : (
                  <>
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={`sidebar-group-${section.id}`}
                      title={isCollapsed ? section.label : undefined}
                      onClick={() => toggleGroup(section.id)}
                      className={`flex h-11 w-full items-center rounded-md transition-colors ${
                        isCollapsed ? 'justify-center lg:px-0' : 'gap-3 px-3'
                      } ${
                        isCollapsed && isSectionActive
                          ? 'bg-[#eaf3ff] text-[#1677ff]'
                          : isExpanded && !isCollapsed
                            ? 'bg-[#f6f7f9] text-[#596579]'
                            : 'text-[#596579] hover:bg-[#f6f7f9] hover:text-[#1677ff]'
                      }`}
                    >
                      <Icon size={17} strokeWidth={1.8} className="shrink-0" />
                      {!isCollapsed && (
                        <>
                          <span className="min-w-0 flex-1 truncate text-left text-sm">{section.label}</span>
                          <ChevronDown
                            size={14}
                            strokeWidth={1.7}
                            className={`shrink-0 text-[#7f8b9c] transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`}
                          />
                        </>
                      )}
                    </button>

                    {!isCollapsed && isExpanded && (
                      <div id={`sidebar-group-${section.id}`}>
                        <ul>
                          {section.children?.map(child => {
                            const active = isChildActive(child, location.pathname);
                            return (
                              <li key={child.to}>
                                <Link
                                  to={child.to}
                                  aria-current={active ? 'page' : undefined}
                                  className={`flex h-12 items-center pl-11 pr-3 text-sm transition-colors ${
                                    active
                                      ? 'font-medium text-[#1677ff]'
                                      : 'text-[#596579] hover:text-[#1677ff]'
                                  }`}
                                >
                                  <span className="truncate">{child.label}</span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <button
        type="button"
        aria-label={isCollapsed ? '展开菜单' : '收起菜单'}
        title={isCollapsed ? '展开菜单' : undefined}
        onClick={() => onCollapsedChange(!isCollapsed)}
        className={`hidden h-14 shrink-0 items-center text-[#8995a6] transition-colors hover:bg-[#f6f7f9] hover:text-[#1677ff] lg:flex ${
          isCollapsed ? 'justify-center' : 'gap-3 px-5'
        }`}
      >
        <ChevronLeft
          size={14}
          strokeWidth={1.7}
          className={`shrink-0 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`}
        />
        {!isCollapsed && <span className="text-sm">收起菜单</span>}
      </button>
    </aside>
  );
}

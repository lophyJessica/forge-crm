import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  ChevronLeft,
  Crown,
  LayoutDashboard,
  TrendingUp,
  Users,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  mobileMenuOpen: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export default function Sidebar({
  isCollapsed,
  mobileMenuOpen,
  onCollapsedChange,
}: SidebarProps) {
  const location = useLocation();

  const menuItems = [
    { label: '控制台首页', to: '/', icon: LayoutDashboard },
    { label: '线索管理', to: '/leads', icon: Users },
    { label: '商机管理', to: '/opportunities', icon: TrendingUp },
    { label: '客户管理', to: '/customers', icon: BarChart3 },
  ];

  const isLinkActive = (to: string) => {
    if (to === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(to);
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-[200px] shrink-0 transform flex-col border-r border-[#edf0f4] bg-white text-[#596579] shadow-[4px_0_18px_rgba(30,64,175,0.05)] transition-[width,transform] duration-200 lg:z-30 lg:translate-x-0 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } ${isCollapsed ? 'lg:w-14' : 'lg:w-[200px]'}`}
    >
      {/* 顶部 Logo 区 */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#edf0f4] px-4">
        <div className="flex items-center gap-2">
          <Crown size={20} className="text-[#1677ff] shrink-0" />
          {!isCollapsed && <span className="font-black text-slate-800 tracking-wider text-sm">Forge CRM</span>}
        </div>
      </div>

      {/* 导航栏 */}
      <nav className="flex-1 overflow-x-hidden overflow-y-auto py-4 px-2">
        <ul className="space-y-1">
          {menuItems.map((item, idx) => {
            const Icon = item.icon;
            const active = isLinkActive(item.to);

            return (
              <li key={idx}>
                <Link
                  to={item.to}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex h-11 items-center rounded-md transition-colors ${
                    isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'
                  } ${
                    active
                      ? 'bg-[#eaf3ff] text-[#1677ff] font-bold'
                      : 'text-[#596579] hover:bg-[#f6f7f9] hover:text-[#1677ff]'
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  {!isCollapsed && <span className="truncate text-xs font-semibold">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 底部的折叠按钮 */}
      <button
        type="button"
        onClick={() => onCollapsedChange(!isCollapsed)}
        className={`hidden h-14 shrink-0 items-center border-t border-[#edf0f4] text-[#8995a6] transition-colors hover:bg-[#f6f7f9] hover:text-[#1677ff] lg:flex ${
          isCollapsed ? 'justify-center' : 'gap-3 px-5'
        }`}
      >
        <ChevronLeft
          size={16}
          className={`shrink-0 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`}
        />
        {!isCollapsed && <span className="text-xs font-semibold">收起菜单</span>}
      </button>
    </aside>
  );
}

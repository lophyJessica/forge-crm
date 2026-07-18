import React from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import LeadsList from './pages/LeadsList';
import LeadForm from './pages/LeadForm';
import LeadDetail from './pages/LeadDetail';
import OpportunitiesList from './pages/OpportunitiesList';
import CustomersList from './pages/CustomersList';
import AppShell from './components/layout/AppShell';
import Sidebar from './components/layout/Sidebar';
import TopNav from './components/layout/TopNav';
import { Bell, Menu, User } from 'lucide-react';

const getBreadcrumbs = (path: string): [string, string] => {
  if (path === '/') return ['主工作台', '控制台首页'];
  if (path === '/leads') return ['线索管理', '线索列表'];
  if (path === '/leads/new') return ['线索管理', '新建线索'];
  if (/\/leads\/[^/]+\/edit/.test(path)) return ['线索管理', '编辑线索'];
  if (/\/leads\/[^/]+/.test(path)) return ['线索管理', '线索详情'];
  if (path === '/opportunities') return ['商机管理', '商机列表'];
  if (path === '/customers') return ['客户管理', '客户列表'];
  return ['主工作台', '控制台首页'];
};

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
              className="fixed inset-y-0 left-[200px] right-0 z-40 bg-slate-900/30 lg:hidden"
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
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 lg:hidden"
            >
              <Menu size={16} />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-500">
              {(() => {
                const [group, name] = getBreadcrumbs(location.pathname);
                return (
                  <>
                    <span className="truncate">{group}</span>
                    <span className="shrink-0 text-slate-300">/</span>
                    <span className="truncate font-black text-slate-800">{name}</span>
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
              className="relative rounded-full p-1.5 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <Bell size={16} />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2 text-xs">
              <User size={15} className="text-[#1677ff]" />
              <span className="hidden font-bold text-slate-700 sm:inline">CrmScheduler</span>
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
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/leads" element={<LeadsList />} />
          <Route path="/leads/new" element={<LeadForm />} />
          <Route path="/leads/:id/edit" element={<LeadForm />} />
          <Route path="/leads/:id" element={<LeadDetail />} />
          <Route path="/opportunities" element={<OpportunitiesList />} />
          <Route path="/customers" element={<CustomersList />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

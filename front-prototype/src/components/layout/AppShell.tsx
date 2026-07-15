import React from 'react';

interface AppShellProps {
  sidebar: React.ReactNode;
  topNav: React.ReactNode;
  sidebarCollapsed: boolean;
  children: React.ReactNode;
}

/** Shared desktop shell for dense Forge WMS work pages. */
export default function AppShell({ sidebar, topNav, sidebarCollapsed, children }: AppShellProps) {
  return (
    <div className="flex h-screen min-h-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      {sidebar}
      <div className={`flex min-w-0 flex-1 flex-col transition-[padding] duration-200 ${sidebarCollapsed ? 'lg:pl-14' : 'lg:pl-[200px]'}`}>
        {topNav}
        <main className="forge-main min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-slate-50/50 p-3 sm:p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

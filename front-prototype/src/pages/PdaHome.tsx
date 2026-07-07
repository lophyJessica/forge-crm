import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, ClipboardCheck, PackageCheck, Signal, UserRound, Warehouse } from 'lucide-react';

export function PdaShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-900 flex justify-center">
      <div className="w-full max-w-[375px] min-h-[812px] bg-slate-100 shadow-2xl flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export function PdaHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="bg-slate-900 text-white px-5 pt-5 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black tracking-wide">{title}</h1>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className="w-11 h-11 rounded-md bg-blue-600 flex items-center justify-center font-black text-lg">
          PDA
        </div>
      </div>
    </header>
  );
}

export function PdaOfflineBar() {
  const [offline, setOffline] = useState(false);

  return (
    <div className="px-5 py-4 bg-white border-t border-slate-200 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`w-3 h-3 rounded-full ${offline ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
        <span className="text-sm font-bold text-slate-700">{offline ? '离线模拟' : '在线模拟'}</span>
      </div>
      <button
        type="button"
        onClick={() => setOffline(prev => !prev)}
        className={`w-16 h-9 rounded-full p-1 transition-colors ${offline ? 'bg-amber-200' : 'bg-emerald-200'}`}
      >
        <span className={`block w-7 h-7 rounded-full bg-white shadow transition-transform ${offline ? 'translate-x-7' : ''}`}></span>
      </button>
    </div>
  );
}

export default function PdaHome() {
  const menus = [
    { title: '收货上架', desc: 'RCV 入库归位', path: '/pda/inbound', icon: PackageCheck, color: 'bg-blue-600' },
    { title: '拣货出库', desc: 'WAVE 拣货', path: '/pda/picking', icon: Archive, color: 'bg-emerald-600' },
    { title: '盘点', desc: '货位实盘', path: '/pda/check', icon: ClipboardCheck, color: 'bg-violet-600' },
  ];

  return (
    <PdaShell>
      <PdaHeader title="移动作业台" subtitle="强盛科技 WMS 手持端" />
      <main className="flex-1 p-5 space-y-5">
        <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-md bg-slate-900 text-white flex items-center justify-center">
              <UserRound size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base font-black text-slate-900">WmsOperator01</div>
              <div className="flex items-center gap-1.5 text-sm text-slate-500 font-bold mt-0.5">
                <Warehouse size={15} />
                <span>北京主仓 WH001</span>
              </div>
            </div>
            <Signal size={20} className="text-emerald-500" />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4">
          {menus.map(item => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-md ${item.color} text-white flex items-center justify-center`}>
                    <Icon size={32} />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900">{item.title}</div>
                    <div className="text-sm font-bold text-slate-500 mt-1">{item.desc}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      </main>
      <PdaOfflineBar />
    </PdaShell>
  );
}

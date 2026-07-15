import React from 'react';

export type StatusTabTone = 'slate' | 'blue' | 'sky' | 'amber' | 'emerald' | 'rose' | 'violet';

export interface StatusTabItem {
  key: string;
  label: React.ReactNode;
  count?: React.ReactNode;
  tone?: StatusTabTone;
  disabled?: boolean;
}

interface StatusTabsProps {
  items: StatusTabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  ariaLabel?: string;
  className?: string;
}

const toneClasses: Record<StatusTabTone, { active: string; badge: string; hover: string }> = {
  slate: { active: 'border-slate-900 bg-slate-700 text-white', badge: 'bg-white/20 text-white', hover: 'hover:bg-slate-100 hover:text-slate-900' },
  blue: { active: 'border-blue-800 bg-blue-600 text-white', badge: 'bg-white/20 text-white', hover: 'hover:bg-blue-50 hover:text-blue-700' },
  sky: { active: 'border-sky-800 bg-sky-600 text-white', badge: 'bg-white/20 text-white', hover: 'hover:bg-sky-50 hover:text-sky-700' },
  amber: { active: 'border-amber-700 bg-amber-500 text-amber-950', badge: 'bg-amber-950/15 text-amber-950', hover: 'hover:bg-amber-50 hover:text-amber-700' },
  emerald: { active: 'border-emerald-800 bg-emerald-600 text-white', badge: 'bg-white/20 text-white', hover: 'hover:bg-emerald-50 hover:text-emerald-700' },
  rose: { active: 'border-rose-800 bg-rose-600 text-white', badge: 'bg-white/20 text-white', hover: 'hover:bg-rose-50 hover:text-rose-700' },
  violet: { active: 'border-violet-800 bg-violet-600 text-white', badge: 'bg-white/20 text-white', hover: 'hover:bg-violet-50 hover:text-violet-700' },
};

export function getStatusTabTone(status: string): StatusTabTone {
  const key = status.toUpperCase();

  if (['VOIDED', 'TERMINATED', 'REJECTED', 'EXCEPTION', 'MINIMUM_LOW', 'UNREAD', 'CANCELLED'].includes(key)) return 'rose';
  if (['EXPIRED', 'SAFETY_LOW', 'UNSETTLED', 'QUOTING'].includes(key) || key.includes('PENDING')) return 'amber';
  if (key === 'PARTIAL' || key.startsWith('PARTIAL_')) return 'sky';
  if (['CONFIRMED', 'COMPLETED', 'APPROVED', 'SETTLED', 'AWARDED', 'PACKED', 'PICKED', 'CHECKED', 'SHIPPED', 'INBOUND', 'READ'].includes(key)) return 'emerald';
  if (['ACTIVE', 'RECEIVING', 'COUNTING', 'PICKING', 'PUTAWAYING', 'OUTBOUND', 'PROCESSING'].includes(key) || key.endsWith('ING')) return 'blue';
  if (['FROZEN', 'LOCKED'].includes(key)) return 'violet';
  if (key === 'DRAFT' || key === 'NOT_STARTED') return 'slate';
  return key === 'ALL' ? 'blue' : 'slate';
}

export default function StatusTabs({ items, activeKey, onChange, ariaLabel = '状态筛选', className = '' }: StatusTabsProps) {
  return (
    <div className={`forge-status-tabs overflow-x-auto border-b border-slate-200 bg-white ${className}`}>
      <div role="tablist" aria-label={ariaLabel} className="flex min-w-max items-stretch px-2">
        {items.map(item => {
          const active = item.key === activeKey;
          const classes = toneClasses[item.tone ?? getStatusTabTone(item.key)];
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={item.disabled}
              onClick={() => onChange(item.key)}
              className={`inline-flex h-12 shrink-0 items-center gap-1.5 border-b-2 px-4 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${active ? `${classes.active} font-bold shadow-sm` : `border-transparent text-slate-500 ${classes.hover}`}`}
            >
              <span>{item.label}</span>
              {item.count !== undefined && (
                <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold ${active ? classes.badge : 'bg-slate-100 text-slate-400'}`}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

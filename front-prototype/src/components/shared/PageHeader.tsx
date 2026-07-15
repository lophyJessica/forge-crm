import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, description, onBack, backLabel = '返回上一页', meta, actions }: PageHeaderProps) {
  return (
    <div className="forge-page-header flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        {onBack && (
          <button
            type="button"
            aria-label={backLabel}
            title={backLabel}
            onClick={onBack}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="flex flex-wrap break-words items-center gap-2 text-xl font-bold leading-7 text-slate-900">{title}</h1>
          {description && <p className="mt-1 break-words text-xs leading-5 text-slate-500">{description}</p>}
        </div>
      </div>
      {(meta || actions) && (
        <div className="flex w-full min-w-0 flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
          {meta && <div className="w-full text-left text-xs sm:w-auto sm:text-right">{meta}</div>}
          {actions && <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">{actions}</div>}
        </div>
      )}
    </div>
  );
}

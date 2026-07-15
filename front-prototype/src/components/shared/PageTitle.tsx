import React from 'react';

interface PageTitleProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export default function PageTitle({ title, description, eyebrow, actions, compact = false, className = '' }: PageTitleProps) {
  const content = (
    <div className="min-w-0">
      {eyebrow && <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{eyebrow}</p>}
      <h1 className="break-words text-xl font-bold leading-7 text-slate-900">{title}</h1>
      {description && <p className="mt-1 break-words text-xs leading-5 text-slate-500">{description}</p>}
    </div>
  );

  if (compact && !actions) return <div className={className}>{content}</div>;

  return (
    <div className={`flex flex-wrap items-start justify-between gap-4 ${className}`}>
      {content}
      {actions && <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">{actions}</div>}
    </div>
  );
}

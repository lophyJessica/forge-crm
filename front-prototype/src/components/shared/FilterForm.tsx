import React from 'react';

interface FilterFormProps {
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export default function FilterForm({ onSubmit, children, footer, className = '' }: FilterFormProps) {
  return (
    <form onSubmit={onSubmit} role="search" aria-label="列表筛选" className={`space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      {children}
      {footer && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">{footer}</div>}
    </form>
  );
}

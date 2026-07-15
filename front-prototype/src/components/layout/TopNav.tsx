import React from 'react';

export default function TopNav({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <header className={`flex min-w-0 h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200/85 bg-white px-4 shadow-sm lg:px-8 ${className}`}>{children}</header>;
}

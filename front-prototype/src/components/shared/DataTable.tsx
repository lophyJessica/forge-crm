import React from 'react';

interface DataTableProps {
  children: React.ReactNode;
  minWidth?: string;
}

export default function DataTable({ children, minWidth = '1180px' }: DataTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="forge-data-table w-full border-collapse text-left" style={{ minWidth }}>
          {children}
        </table>
      </div>
    </div>
  );
}

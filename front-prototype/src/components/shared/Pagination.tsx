import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export default function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const pages = total === 0
    ? []
    : Array.from({ length: pageCount }, (_, index) => index + 1).slice(
      Math.max(0, page - 3),
      Math.min(pageCount, page + 2),
    );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-slate-500">
      <span>显示 {start}-{end} 条，共 {total} 条</span>
      <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
        <label className="flex items-center gap-2">
          每页
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            aria-label="每页条数"
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value={20}>20条</option>
            <option value={50}>50条</option>
            <option value={10}>10条</option>
          </select>
        </label>
        <button
          type="button"
          aria-label="上一页"
          title="上一页"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={total === 0 || page === 1}
        >
          <ChevronLeft size={14} />
        </button>
        {pages.map((item) => (
          <button
            type="button"
            key={item}
            onClick={() => onPageChange(item)}
            aria-current={item === page ? 'page' : undefined}
            aria-label={`第 ${item} 页`}
            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 font-medium transition ${item === page ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-600'}`}
          >
            {item}
          </button>
        ))}
        <button
          type="button"
          aria-label="下一页"
          title="下一页"
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={total === 0 || page === pageCount}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

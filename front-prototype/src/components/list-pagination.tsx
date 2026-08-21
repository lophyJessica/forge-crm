import { Button } from '@/components/ui/button';

type ListPaginationProps = {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export function ListPagination({ total, page, pageSize, onPageChange, onPageSizeChange }: ListPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  return (
    <div className="flex justify-between items-center px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
      <div className="flex items-center gap-3">
        <span>共 {total} 条记录</span>
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="h-8 px-2 text-xs bg-white border border-slate-200 rounded text-slate-700 focus:outline-none"
          aria-label="每页条数"
        >
          <option value={20}>20 条/页</option>
          <option value={50}>50 条/页</option>
          <option value={100}>100 条/页</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage === 1}
          className="h-8 px-3 text-xs"
        >
          上一页
        </Button>
        <span className="font-mono text-slate-600">{safePage} / {totalPages}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage === totalPages}
          className="h-8 px-3 text-xs"
        >
          下一页
        </Button>
      </div>
    </div>
  );
}

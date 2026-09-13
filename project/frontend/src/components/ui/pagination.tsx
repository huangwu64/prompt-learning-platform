import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

/** 计算要展示的页码，超过 7 页时用省略号折叠 */
function pageItems(current: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const items: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  if (start > 2) items.push("…");
  for (let p = start; p <= end; p += 1) items.push(p);
  if (end < totalPages - 1) items.push("…");
  items.push(totalPages);
  return items;
}

export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  onChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
}: Props) {
  if (total === 0) return null;

  const items = pageItems(page, Math.max(1, totalPages));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-app-t4 tabular-nums">
        共 {total} 条 · 第 {page}/{Math.max(1, totalPages)} 页
      </p>

      <div className="flex items-center gap-1.5">
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="每页条数"
            className="wb-input h-8 w-auto pr-6 text-xs"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                每页 {n} 条
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="上一页"
          className="wb-btn h-8 w-8 p-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {items.map((item, idx) =>
          item === "…" ? (
            <span key={`gap-${idx}`} className="px-1 text-xs text-app-t4">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item)}
              aria-current={item === page ? "page" : undefined}
              className={`h-8 min-w-8 px-2 rounded-md text-xs tabular-nums transition ${
                item === page
                  ? "bg-blue-600 text-white"
                  : "text-app-t2 hover:bg-app-chrome"
              }`}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="下一页"
          className="wb-btn h-8 w-8 p-0"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

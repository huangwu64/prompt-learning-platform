import type { ReactNode } from "react";

/**
 * 通用数据表格。
 *
 * 项目原先没有任何表格组件（唯一的 <table> 在 markdown 渲染里），
 * 管理后台的列表统一用这个。
 */

export interface Column<T> {
  key: string;
  title: string;
  width?: string;
  align?: "left" | "right" | "center";
  className?: string;
  render: (row: T) => ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string | null;
  empty?: ReactNode;
  /** 加载态渲染的骨架行数，保持与常见页大小一致以免布局跳动 */
  skeletonRows?: number;
}

const ALIGN: Record<string, string> = {
  left: "text-left",
  right: "text-right tabular-nums",
  center: "text-center",
};

export function Table<T>({
  columns,
  data,
  rowKey,
  loading = false,
  error = null,
  empty = "暂无数据",
  skeletonRows = 5,
}: Props<T>) {
  return (
    <div className="rounded-xl border border-app-border bg-app-surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-app-chrome/60">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  style={col.width ? { width: col.width } : undefined}
                  className={`px-4 py-3 text-[11px] font-medium tracking-[0.14em] text-app-t4 whitespace-nowrap ${
                    ALIGN[col.align ?? "left"]
                  }`}
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-[13px] text-red-600">
                  {error}
                </td>
              </tr>
            ) : loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-t border-app-border">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3.5">
                      <span className="block h-3.5 rounded bg-app-chrome animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-[13px] text-app-t4">
                  {empty}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="border-t border-app-border transition-colors duration-150 hover:bg-app-chrome/50"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3.5 align-middle text-app-t2 ${
                        ALIGN[col.align ?? "left"]
                      } ${col.className ?? ""}`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

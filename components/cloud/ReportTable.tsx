import type { Report } from "@/lib/cloud/templates";

interface ReportTableProps {
  columns: Report["columns"];
  rows: Report["rows"];
  footer: Report["footer"];
  /** Show only the first rows (a preview). */
  limit?: number;
  caption?: string;
}

const isNumeric = (text: string) => /^-?\d+(\.\d+)?$/.test(text);

/** A report as a table. Used for the preview in the export flow and on the shared-link page. */
export function ReportTable({ columns, rows, footer, limit, caption }: ReportTableProps) {
  const shown = limit ? rows.slice(0, limit) : rows;
  const hidden = rows.length - shown.length;
  // A column is right-aligned when every cell in it is a number.
  const numeric = columns.map((_, i) => rows.length > 0 && rows.every((r) => isNumeric(r[i]) || r[i] === ""));

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              {columns.map((c, i) => (
                <th key={c} scope="col" className={`whitespace-nowrap px-3 py-2 font-medium ${numeric[i] ? "text-right" : ""}`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.map((row, r) => {
              const isSubtotal = row.some((cell) => cell.startsWith("Subtotal "));
              return (
                <tr key={r} className={isSubtotal ? "bg-slate-50 font-medium" : ""}>
                  {row.map((cell, i) => (
                    <td
                      key={i}
                      dir="auto"
                      className={`max-w-[14rem] truncate px-3 py-2 text-slate-800 ${numeric[i] ? "text-right tabular-nums" : ""}`}
                      title={cell}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
          {footer && !hidden && (
            <tfoot>
              <tr className="border-t border-slate-300 bg-slate-50 font-semibold">
                {footer.map((cell, i) => (
                  <td key={i} className={`px-3 py-2 text-slate-900 ${numeric[i] ? "text-right tabular-nums" : ""}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {hidden > 0 && (
        <p className="mt-1.5 text-xs text-slate-500">
          + {hidden} more row{hidden === 1 ? "" : "s"} not shown here. The full report includes them
          {footer ? " and a totals row" : ""}.
        </p>
      )}
    </div>
  );
}

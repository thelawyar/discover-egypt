/** Small helpers to export admin tables as CSV or a printable PDF report. */

export type Row = (string | number)[];

export type ReportTable = {
  title: string;
  headers: string[];
  rows: Row[];
};

function escapeCell(v: string | number) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Builds a UTF-8 CSV (with BOM so Excel reads Arabic correctly). */
export function buildCsv(tables: ReportTable[]) {
  const lines: string[] = [];
  for (const t of tables) {
    lines.push(t.title);
    lines.push(t.headers.map(escapeCell).join(","));
    for (const r of t.rows) lines.push(r.map(escapeCell).join(","));
    lines.push("");
  }
  return `\uFEFF${lines.join("\n")}`;
}

export function downloadCsv(fileName: string, tables: ReportTable[]) {
  if (typeof window === "undefined") return;
  const blob = new Blob([buildCsv(tables)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith(".csv") ? fileName : `${fileName}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHtml(v: string | number) {
  return String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] as string,
  );
}

/**
 * Opens a print-ready RTL document; the browser's print dialog saves it as PDF.
 * Avoids shipping a heavy PDF library that would also break Arabic shaping.
 */
export function printReport(opts: {
  title: string;
  subtitle?: string;
  tables: ReportTable[];
}) {
  if (typeof window === "undefined") return false;
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return false;

  const body = opts.tables
    .map(
      (t) => `
      <section>
        <h2>${escapeHtml(t.title)}</h2>
        <table>
          <thead><tr>${t.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
          <tbody>${t.rows
            .map(
              (r) =>
                `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`,
            )
            .join("")}</tbody>
        </table>
      </section>`,
    )
    .join("");

  win.document.write(`<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8" />
<title>${escapeHtml(opts.title)}</title>
<style>
  body{font-family:"Cairo","Segoe UI",Tahoma,sans-serif;margin:32px;color:#111}
  h1{font-size:20px;margin:0 0 4px}
  p.sub{margin:0 0 20px;color:#666;font-size:12px}
  h2{font-size:14px;margin:22px 0 8px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{border:1px solid #ddd;padding:6px 8px;text-align:right}
  thead{background:#f4f4f5}
  section{page-break-inside:avoid}
  @media print{body{margin:12mm}}
</style></head>
<body>
  <h1>${escapeHtml(opts.title)}</h1>
  <p class="sub">${escapeHtml(opts.subtitle ?? "")}</p>
  ${body}
  <script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script>
</body></html>`);
  win.document.close();
  return true;
}

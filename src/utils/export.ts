type ExportCell = string | number | boolean | null | undefined;

function escapeDelimitedCell(value: ExportCell, delimiter: string) {
  const text = value == null ? "" : String(value);
  if (text.includes('"') || text.includes("\n") || text.includes("\r") || text.includes(delimiter)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function rowsToDelimited(rows: ExportCell[][], delimiter = ",") {
  return rows.map((row) => row.map((cell) => escapeDelimitedCell(cell, delimiter)).join(delimiter)).join("\n");
}

export function downloadTextFile(filename: string, content: string, mimeType: string) {
  if (typeof document === "undefined") return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportCsv(filenameBase: string, rows: ExportCell[][]) {
  downloadTextFile(`${filenameBase}.csv`, rowsToDelimited(rows, ","), "text/csv;charset=utf-8;");
}

export function exportExcel(filenameBase: string, rows: ExportCell[][]) {
  downloadTextFile(`${filenameBase}.xls`, rowsToDelimited(rows, "\t"), "application/vnd.ms-excel;charset=utf-8;");
}

/**
 * CSV helpers (RFC 4180-ish) with UTF-8 BOM for Excel compatibility.
 */

/** Escape a single CSV cell; quotes when needed. */
export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export type CsvRow = Record<string, string | number | null | undefined>;

/**
 * Build a CSV string from headers + row objects.
 * Values are looked up by header key; missing keys become empty cells.
 * Includes UTF-8 BOM so Excel opens Indonesian text correctly.
 */
export function buildCsv(
  headers: string[],
  rows: CsvRow[],
  options?: { bom?: boolean },
): string {
  const bom = options?.bom !== false ? "\uFEFF" : "";
  const lines: string[] = [];

  lines.push(headers.map(escapeCsvCell).join(","));

  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvCell(row[h])).join(","));
  }

  // CRLF is friendlier for Excel on Windows
  return bom + lines.join("\r\n") + (rows.length > 0 || headers.length > 0 ? "\r\n" : "");
}

/** Build CSV from explicit 2D matrix (first row typically headers). */
export function buildCsvFromMatrix(
  matrix: Array<Array<string | number | null | undefined>>,
  options?: { bom?: boolean },
): string {
  const bom = options?.bom !== false ? "\uFEFF" : "";
  const lines = matrix.map((row) => row.map(escapeCsvCell).join(","));
  return bom + lines.join("\r\n") + (matrix.length > 0 ? "\r\n" : "");
}

/** Trigger a browser download of a CSV string. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/** Content-Type for CSV responses served to Excel-friendly clients. */
export const CSV_CONTENT_TYPE = "text/csv; charset=utf-8";

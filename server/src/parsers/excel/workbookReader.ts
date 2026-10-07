import pkg from "xlsx";
import { normalizeCell } from "./cellNormalizer.js";

const XLSX = (pkg as any).readFile ? pkg : (pkg as any).default || pkg;

export interface SheetRows {
  sheetName: string;
  rows: unknown[][];
}

function cellValueToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

export async function readWorkbook(buffer: Buffer): Promise<SheetRows[]> {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheets: SheetRows[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
    const rows = rawRows
      .map((row) => row.map((cell) => cellValueToText(cell)))
      .filter((row) => row.some((cell) => normalizeCell(cell)));

    if (rows.length > 0) {
      sheets.push({ sheetName, rows });
    }
  }

  return sheets;
}

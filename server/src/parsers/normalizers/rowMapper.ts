import type { CanonicalColumn } from "../excel/headerDetector.js";

export function pickCell(
  row: unknown[],
  columns: Partial<Record<CanonicalColumn, number>>,
  key: CanonicalColumn
) {
  const index = columns[key];
  return index === undefined ? undefined : row[index];
}

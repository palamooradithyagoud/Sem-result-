export function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

export function normalizeHeader(value: unknown): string {
  return normalizeCell(value)
    .toLowerCase()
    .replace(/[%]/g, " percentage ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const normalized = normalizeCell(value).replace(/,/g, "");
  if (!normalized) {
    return undefined;
  }

  const match = normalized.match(/-?\d+(\.\d+)?/);
  if (!match) {
    return undefined;
  }

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizeRollNumber(value: unknown): string {
  return normalizeCell(value).toUpperCase().replace(/\s+/g, "");
}

export function normalizePlate(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

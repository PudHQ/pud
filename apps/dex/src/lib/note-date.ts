const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });

export function parseNoteDate(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  const date = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date.startsWith("0000-")) return;

  const parsed = new Date(date);
  // Round-trip the value to catch dates that roll into the following month.
  if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date) return date;
}

export function formatNoteDate(date: string) {
  return dateFormat.format(new Date(date));
}

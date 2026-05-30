let counter = 0;

/** Generates a process-unique id with a readable prefix (e.g. "match-l9k2-3"). */
export function genId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

/** Current timestamp as an ISO date string (YYYY-MM-DD). */
export function nowDate(): string {
  return new Date().toISOString().split('T')[0]!;
}

/** Current timestamp as a full ISO string. */
export function nowIso(): string {
  return new Date().toISOString();
}

export const supporterIssue = 17;
export const repository = "PudHQ/pud";
export const signupUrl = `https://github.com/${repository}/issues/${supporterIssue}`;
export const rosterPath = "apps/www/public/supporters.json";

// Array position is the permanent supporter number, starting at one.
// A null login reserves the number after someone's last public comment disappears.
export type Supporter = { id: number; login: string | null; commentId?: string };

export function isLogin(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]+$/.test(value);
}

function isCommentId(value: unknown): value is string {
  return typeof value === "string" && /^[1-9]\d*$/.test(value);
}

export function parseRoster(text: string): Supporter[] {
  const entries: unknown = JSON.parse(text);
  if (!Array.isArray(entries)) throw new Error("Expected an array of supporters.");
  const seen = new Set<number>();
  for (const entry of entries) {
    if (!entry || !Number.isSafeInteger(entry.id) || entry.id < 1 || seen.has(entry.id)
      || !(entry.login === null || isLogin(entry.login))
      || (entry.commentId !== undefined && !isCommentId(entry.commentId))) {
      throw new Error("Invalid supporter roster.");
    }
    seen.add(entry.id);
  }
  return entries;
}

export function visibleSupporters(roster: Supporter[]) {
  return roster.flatMap(({ id, login, commentId }, index) => {
    if (login === null) return [];
    // Reconciliation can read an older roster and backfill its missing comment IDs.
    if (!isCommentId(commentId)) throw new Error("Missing signup comment for @" + login);
    return [{ id, login, number: index + 1, href: `${signupUrl}#issuecomment-${commentId}` }];
  });
}

export function numberLabel(number: number) {
  return `#${String(number).padStart(4, "0")}`;
}

export function avatarUrl(id: number, size = 96) {
  return `https://avatars.githubusercontent.com/u/${id}?s=${size}&v=4`;
}

/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { reconcile, renderReadme, syncSupporters } from "../../../scripts/sync-supporters.ts";
import { numberLabel, parseRoster, rosterPath, visibleSupporters } from "../features/supporters/roster.ts";

const readme = "Before\n<!-- supporters:start -->\n<!-- supporters:end -->\nAfter\n";
const repo = { owner: "PudHQ", repo: "pud" };

function comment(sequence: number, id: number, login: string) {
  return { fullDatabaseId: String(sequence), isMinimized: false, author: { __typename: "User", databaseId: id, login } };
}

describe("permanent supporter numbers", () => {
  test("assigns numbers in first-comment order, even for duplicate or out-of-order deliveries", () => {
    const comments = [comment(4, 12, "twelve"), comment(2, 80, "eighty"), comment(3, 34, "thirty-four"), comment(1, 12, "twelve")];
    const initial = reconcile([], comments);
    expect(initial.map(s => s.id)).toEqual([12, 80, 34]);
    expect(initial.map(s => s.commentId)).toEqual(["1", "2", "3"]);
    expect(reconcile(initial, comments.toReversed())).toEqual(initial);
  });

  test("keeps numbers through renames, hidden comments, departures, and returns", () => {
    const initial = [{ id: 12, login: "first" }, { id: 22, login: "second" }];
    const hidden = { ...comment(1, 12, "first"), isMinimized: true };
    const active = [comment(2, 22, "renamed"), comment(3, 33, "third")];
    const next = reconcile(initial, [hidden, ...active]);
    expect(next).toEqual([{ id: 12, login: null }, { id: 22, login: "renamed", commentId: "2" }, { id: 33, login: "third", commentId: "3" }]);
    expect(renderReadme(readme, next)).not.toContain("#0001");
    expect(reconcile(next, [...active, comment(4, 12, "first")])[0]).toEqual({ ...initial[0], commentId: "4" });
    expect(reconcile(next, [])).toEqual(next.map(({ id }) => ({ id, login: null })));
  });

  test("ignores bots, missing authors, deleted accounts and minimized comments", () => {
    const sample = comment(1, 3, "sample");
    expect(reconcile([], [
      { ...sample, author: null }, { ...sample, isMinimized: true },
      { ...sample, author: { ...sample.author, __typename: "Bot" } }, comment(2, 10, "ghost"),
    ])).toEqual([]);
  });

  test("backfills older rosters and follows the next visible comment when the first is hidden or deleted", () => {
    const old = parseRoster('[{"id":5,"login":null},{"id":92,"login":"pud-sample"}]');
    const first = comment(7219194602, 92, "pud-sample");
    const second = comment(7219194603, 92, "pud-sample");
    const initial = reconcile(old, [second, first]);
    expect(visibleSupporters(initial)).toEqual([{
      id: 92, login: "pud-sample", number: 2, href: "https://github.com/PudHQ/pud/issues/17#issuecomment-7219194602",
    }]);
    const hidden = reconcile(initial, [{ ...first, isMinimized: true }, second]);
    expect(visibleSupporters(hidden)[0]?.href).toBe("https://github.com/PudHQ/pud/issues/17#issuecomment-7219194603");
    expect(reconcile(initial, [second])).toEqual(hidden);
  });

  test("renders numbered comment links and ID-based avatars inside exactly one pair of markers", () => {
    const output = renderReadme(readme, [{ id: 15, login: null }, { id: 92, login: "pud-sample", commentId: "7219194602" }]);
    expect(output).toContain('href="https://github.com/PudHQ/pud/issues/17#issuecomment-7219194602"');
    expect(output).toContain('src="https://avatars.githubusercontent.com/u/92?s=96&amp;v=4"');
    expect(output).toContain("<strong>@pud-sample</strong>");
    expect(output).toContain("<sub>#0002</sub>");
    expect(output.startsWith("Before\n")).toBe(true);
    expect(output.endsWith("\nAfter\n")).toBe(true);
    expect(renderReadme(output, [])).toBe(readme);
    expect(() => renderReadme("No markers", [])).toThrow();
    expect(() => renderReadme(readme + readme, [])).toThrow();
    expect(numberLabel(10000)).toBe("#10000");
  });

  test("rejects damaged rosters before assigning or rendering numbers", () => {
    for (const data of [null, [{ id: 0, login: "first" }], [{ id: 3, login: "a/b" }], [{ id: 3, login: "first", commentId: "invalid" }],
      [{ id: 1, login: null }, { id: 1, login: "again" }]]) {
      expect(() => parseRoster(JSON.stringify(data))).toThrow();
    }
  });
});

function blob(text: string) {
  return { object: { text, isTruncated: false } };
}

test("reads every comment page and republishes against a concurrent README and roster update", async () => {
  let oid = "initial";
  let saved = "[]\n";
  let currentReadme = readme;
  const reads: (string | null)[] = [];
  let writes = 0;
  async function graphql<T>(query: string, variables: Record<string, unknown>) {
    if (query.includes("ref(qualifiedName:")) {
      return { repository: { ref: { target: { oid, readme: blob(currentReadme), roster: blob(saved) } } } } as T;
    }
    if (query.includes("comments(first:")) {
      reads.push(variables.after as string | null);
      const first = !variables.after;
      const nodes = first ? [comment(2, 20, "twenty")] : [comment(3, 30, "thirty")];
      return { repository: { issue: { comments: { nodes, pageInfo: { hasNextPage: first, endCursor: first ? "next" : null } } } } } as T;
    }
    const input = variables.input as { expectedHeadOid: string; fileChanges: { additions: { path: string; contents: string }[] } };
    expect(input.expectedHeadOid).toBe(oid);
    if (++writes === 1) {
      oid = "new-head";
      currentReadme = "Concurrent edit\n" + readme;
      saved = JSON.stringify([{ id: 10, login: "ten" }]);
      throw new Error("Branch head changed");
    }
    const files = Object.fromEntries(input.fileChanges.additions.map(({ path, contents }) => [path, Buffer.from(contents, "base64").toString()]));
    currentReadme = files["README.md"];
    saved = files[rosterPath];
    expect(currentReadme).toStartWith("Concurrent edit\n");
    expect(currentReadme).toContain("<sub>#0003</sub>");
    expect(parseRoster(saved)).toEqual([{ id: 10, login: null }, { id: 20, login: "twenty", commentId: "2" }, { id: 30, login: "thirty", commentId: "3" }]);
    return { createCommitOnBranch: { commit: { url: "updated" } } } as T;
  }
  expect(await syncSupporters(graphql, repo, "main")).toBe("updated");
  expect(reads).toEqual([null, "next", null, "next"]);
  expect(await syncSupporters(graphql, repo, "main")).toBe("The supporter roll is up to date.");
  expect(writes).toBe(2);
});

test("a failed comment page never publishes a partial roll", async () => {
  async function graphql<T>(query: string, { after }: Record<string, unknown>) {
    if (query.includes("ref(qualifiedName:")) {
      return { repository: { ref: { target: { oid: "head", readme: blob(readme), roster: blob("[]\n") } } } } as T;
    }
    if (after) throw new Error("Page unavailable");
    expect(query).toContain("comments(first:");
    return { repository: { issue: { comments: {
      nodes: [comment(1, 1, "first")], pageInfo: { hasNextPage: true, endCursor: "next" },
    } } } } as T;
  }
  await expect(syncSupporters(graphql, repo, "main")).rejects.toThrow("Page unavailable");
});

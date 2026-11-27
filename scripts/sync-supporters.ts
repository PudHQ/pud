import { Buffer } from "node:buffer";
import { avatarUrl, isLogin, numberLabel, parseRoster, rosterPath, supporterIssue, type Supporter, visibleSupporters } from "../apps/www/features/supporters/roster.ts";

type Comment = {
  fullDatabaseId: string;
  isMinimized: boolean;
  author: { __typename: string; login: string; databaseId?: number } | null;
};

export function reconcile(previous: Supporter[], comments: Comment[]): Supporter[] {
  const accounts = new Map<number, Supporter>();
  // Comment IDs put signups in order even when they share a timestamp.
  const ordered = comments.toSorted((a, b) => Number(BigInt(a.fullDatabaseId) - BigInt(b.fullDatabaseId)));
  for (const { author, fullDatabaseId, isMinimized } of ordered) {
    if (isMinimized || author?.__typename !== "User" || author.login === "ghost") continue;
    const id = author.databaseId;
    if (id === undefined || !Number.isSafeInteger(id) || id < 1 || !isLogin(author.login)) {
      throw new Error("GitHub returned an invalid supporter account.");
    }
    if (!accounts.has(id)) accounts.set(id, { id, login: author.login, commentId: fullDatabaseId });
  }
  const next = previous.map(({ id }) => {
    const supporter = accounts.get(id) ?? { id, login: null };
    accounts.delete(id);
    return supporter;
  });
  return [...next, ...accounts.values()];
}

const startMarker = "<!-- supporters:start -->";
const endMarker = "<!-- supporters:end -->";

export function renderReadme(readme: string, roster: Supporter[]) {
  const start = readme.indexOf(startMarker);
  const end = readme.indexOf(endMarker);
  if (start < 0 || end < start || start !== readme.lastIndexOf(startMarker) || end !== readme.lastIndexOf(endMarker)) {
    throw new Error("Expected one pair of supporter markers in README.md.");
  }
  const links = visibleSupporters(roster).map(({ id, login, number, href }) =>
    `<a href="${href}"><img src="${avatarUrl(id).replace("&", "&amp;")}" width="48" height="48" alt=""> <strong>@${login}</strong> <sub>${numberLabel(number)}</sub></a>`);
  const roll = links.length ? `\n\n${links.join("\n")}\n\n` : "\n";
  return readme.slice(0, start + startMarker.length) + roll + readme.slice(end);
}

type GraphQL = <T>(query: string, variables: Record<string, unknown>) => Promise<T>;
type Repo = { owner: string; repo: string };
type BlobFile = { object: { text: string | null; isTruncated: boolean } } | null;
type Head = { oid: string; readme: BlobFile; roster: BlobFile };

const headQuery = `query($owner: String!, $repo: String!, $ref: String!, $path: String!) {
  repository(owner: $owner, name: $repo) {
    ref(qualifiedName: $ref) { target { ... on Commit { oid
      readme: file(path: "README.md") { object { ... on Blob { text isTruncated } } }
      roster: file(path: $path) { object { ... on Blob { text isTruncated } } }
    } } }
  }
}`;

function fileText(file: BlobFile, path: string) {
  if (typeof file?.object.text !== "string" || file.object.isTruncated) throw new Error(`Cannot read the full ${path}.`);
  return file.object.text;
}

const commentsQuery = `query($owner: String!, $repo: String!, $issue: Int!, $after: String) {
  repository(owner: $owner, name: $repo) {
    issue(number: $issue) { comments(first: 100, after: $after) {
      nodes { fullDatabaseId isMinimized author { __typename login ... on User { databaseId } } }
      pageInfo { hasNextPage endCursor }
    } }
  }
}`;

async function readComments(graphql: GraphQL, repo: Repo) {
  type Page = { nodes: Comment[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
  const comments: Comment[] = [];
  let after: string | null = null;
  for (;;) {
    const result: { repository: { issue: { comments: Page } } } = await graphql(commentsQuery, { ...repo, issue: supporterIssue, after });
    const { nodes, pageInfo } = result.repository.issue.comments;
    comments.push(...nodes);
    if (!pageInfo.hasNextPage) return comments;
    if (!pageInfo.endCursor || pageInfo.endCursor === after) throw new Error("GitHub returned an incomplete comment page.");
    after = pageInfo.endCursor;
  }
}

const commitMutation = `mutation($input: CreateCommitOnBranchInput!) {
  createCommitOnBranch(input: $input) { commit { url } }
}`;

export async function syncSupporters(graphql: GraphQL, repo: Repo, branch: string) {
  async function readHead() {
    const result = await graphql<{ repository: { ref: { target: Head } } }>(headQuery, {
      ...repo, ref: `refs/heads/${branch}`, path: rosterPath,
    });
    return result.repository.ref.target;
  }
  let head = await readHead();
  for (let attempt = 1; ; attempt++) {
    const readme = fileText(head.readme, "README.md");
    const saved = fileText(head.roster, rosterPath);
    const next = reconcile(parseRoster(saved), await readComments(graphql, repo));
    const changes = [
      { path: "README.md", before: readme, after: renderReadme(readme, next) },
      { path: rosterPath, before: saved, after: JSON.stringify(next, null, 2) + "\n" },
    ].filter(file => file.before !== file.after);
    if (!changes.length) return "The supporter roll is up to date.";

    try {
      const result = await graphql<{ createCommitOnBranch: { commit: { url: string } } }>(commitMutation, {
        input: {
          branch: { repositoryNameWithOwner: `${repo.owner}/${repo.repo}`, branchName: branch },
          expectedHeadOid: head.oid,
          message: { headline: "Update the Pud supporter roll" },
          fileChanges: { additions: changes.map(({ path, after }) => ({ path, contents: Buffer.from(after).toString("base64") })) },
        },
      });
      return result.createCommitOnBranch.commit.url;
    } catch (error) {
      if (attempt >= 3) throw error;
      const latest = await readHead();
      if (latest.oid === head.oid) throw error;
      head = latest;
    }
  }
}

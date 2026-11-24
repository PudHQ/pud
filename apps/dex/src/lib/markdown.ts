import MarkdownIt, { type Token } from "markdown-it";
import footnote from "markdown-it-footnote";
import { parse as parseYaml } from "yaml";
import { parseNoteDate } from "./note-date";

export const markdown = new MarkdownIt({ html: false, linkify: true }).use(footnote);

markdown.core.ruler.after("block", "warning_callout", ({ tokens }) => {
  const levels = new Set<number>();
  for (const [index, token] of tokens.entries()) {
    if (token.type === "blockquote_close" && levels.delete(token.level)) token.type = "warning_callout_close";
    if (token.type !== "blockquote_open" || tokens[index + 1]?.type !== "paragraph_open") continue;

    const paragraph = tokens[index + 2];
    const marker = /^\[!WARNING\][ \t]*(?:\n|$)/i.exec(paragraph.content);
    if (!marker) continue;

    token.type = "warning_callout_open";
    levels.add(token.level);
    paragraph.content = paragraph.content.slice(marker[0].length);
    if (!paragraph.content) tokens.splice(index + 1, 3);
  }
});

markdown.renderer.rules.warning_callout_open = () =>
  '<aside class="callout-warning" aria-label="Warning">\n'
  + '<div class="callout-title" aria-hidden="true"><span>!</span>Warning</div>\n'
  + '<div class="callout-body"><img class="callout-mascot" src="/pud-robot.png" width="64" height="64" alt="">\n'
  + '<div class="callout-content">\n';
markdown.renderer.rules.warning_callout_close = () => "</div></div>\n</aside>\n";

function footnoteIds(token: Token) {
  const { id, subId = 0 } = token.meta as { id: number; subId?: number };
  const number = id + 1;
  const reference = subId + 1;
  // Colons keep footnote fragments distinct from heading slugs.
  return { number, reference, noteId: `fn:${number}`, referenceId: `fnref:${number}:${reference}` };
}

markdown.renderer.rules.footnote_ref = (tokens, index) => {
  const { number, noteId, referenceId } = footnoteIds(tokens[index]);
  return `<sup class="footnote-ref"><a href="#${noteId}" id="${referenceId}" aria-label="Footnote ${number}">[${number}]</a></sup>`;
};
markdown.renderer.rules.footnote_block_open = () =>
  '<section class="footnotes" aria-label="Footnotes">\n<ol>\n';
markdown.renderer.rules.footnote_open = (tokens, index) => {
  const { noteId } = footnoteIds(tokens[index]);
  return `<li id="${noteId}" class="footnote-item" tabindex="-1">`;
};
markdown.renderer.rules.footnote_anchor = (tokens, index) => {
  const { number, reference, referenceId } = footnoteIds(tokens[index]);
  return ` <a href="#${referenceId}" class="footnote-backref" aria-label="Back to reference ${reference} for footnote ${number}">↩\uFE0E</a>`;
};

// A parser rule keeps brackets in code, escaped text and fenced blocks literal.
markdown.inline.ruler.before("link", "wikilink", (state, silent) => {
  const start = state.pos;
  const embed = state.src.startsWith("![[", start);
  if (!embed && !state.src.startsWith("[[", start)) return false;
  const offset = start + (embed ? 3 : 2);
  const end = state.src.indexOf("]]", offset);
  if (end < 0 || end + 2 > state.posMax) return false;
  const value = state.src.slice(offset, end);
  if (!value || /[\n[]/.test(value)) return false;
  if (!silent) {
    const pipe = value.indexOf("|");
    const target = (pipe < 0 ? value : value.slice(0, pipe)).trim();
    const label = (pipe < 0 ? target.split("/").at(-1)! : value.slice(pipe + 1)).trim();
    const token = state.push("wiki", "", 0);
    token.content = label;
    token.meta = { target, embed };
  }
  state.pos = end + 2;
  return true;
});

export function plain(tokens: Token[]): string {
  return tokens.map(token => {
    if (token.children) return plain(token.children);
    if (token.type === "softbreak" || token.type === "hardbreak") return " ";
    return token.content;
  }).join("");
}

export function slug(text: string) {
  const normalized = text.normalize("NFKC").toLowerCase();
  return normalized.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "")
    || Array.from(normalized, char => char.codePointAt(0)!.toString(16)).join("-");
}

export function parseNote(source: string, filename: string) {
  const text = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const front = /^---[ \t]*\n([\s\S]*?)^---[ \t]*(?:\n|$)/m.exec(text);
  const hasFront = front?.index === 0;
  const meta = hasFront ? parseYaml(front[1]) ?? {} : {};
  const tokens = markdown.parse(hasFront ? text.slice(front[0].length) : text, {});
  const titleTokens = tokens[0]?.type === "heading_open" && tokens[0].tag === "h1"
    ? tokens[1].children ?? [] : [];
  const titleLine = plain(titleTokens);
  const titleFootnotes = titleLine
    ? markdown.renderer.renderInline(titleTokens.filter(token => token.type === "footnote_ref"), markdown.options, {})
    : "";
  if (titleLine) tokens.splice(0, 3);
  const title = typeof meta.title === "string" && meta.title.trim() ? meta.title.trim() : titleLine || filename;
  let calloutDepth = 0;
  const firstBlock = tokens.findIndex(token => {
    if (token.type === "warning_callout_open") calloutDepth++;
    if (token.type === "warning_callout_close") calloutDepth--;
    return calloutDepth === 0 && (token.type === "paragraph_open" || token.type === "footnote_block_open");
  });
  const intro = tokens[firstBlock]?.type === "paragraph_open" ? plain(tokens[firstBlock + 1].children ?? []) : "";
  const summary = typeof meta.summary === "string" ? meta.summary : intro.length > 160 ? intro.slice(0, 157).trimEnd() + "…" : intro;
  const headingId = slug(titleLine || title);
  const headings = new Set([headingId]);
  tokens.forEach((token, index) => {
    if (token.type !== "heading_open") return;
    const base = slug(plain(tokens[index + 1].children ?? []));
    let id = base;
    for (let n = 2; headings.has(id); n++) id = base + "-" + n;
    headings.add(id);
    token.attrSet("id", id);
  });
  const strings = (value: unknown): string[] =>
    typeof value === "string" ? [value] : Array.isArray(value) ? value.filter(item => typeof item === "string") : [];
  const author = typeof meta.author === "string" ? meta.author.trim() || undefined : undefined;
  const date = parseNoteDate(meta.date);
  const updatedAt = parseNoteDate(meta["updated-at"]);
  return { title, titleFootnotes, headingId, summary, tokens, author, date, updatedAt, aliases: strings(meta.aliases), tags: strings(meta.tags), url: meta.url };
}

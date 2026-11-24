import path from "node:path/posix";
import { markdown, parseNote, plain, slug } from "./markdown";
import { httpUrl, outboundAttributes } from "./web-links";
import type { Token } from "markdown-it";

export interface Note {
  file: string;
  id: string;
  href: string;
  folder: string;
  title: string;
  titleFootnotes: string;
  headingId: string;
  summary: string;
  author?: string;
  date?: string;
  updatedAt?: string;
  tags: string[];
  aliases: string[];
  url?: string;
  html: string;
  backlinks: Note[];
}

export interface SavedLink { href: string; title: string; host: string; sources: Note[] }
export interface Folder { name: string; path: string; id: string; href: string; notes: Note[]; children: Folder[] }

const byTitle = (a: { title: string }, b: { title: string }) => a.title.localeCompare(b.title, "en", { numeric: true });
const slugPath = (file: string) => file.split("/").map(slug).join("/");
const key = (file: string) => file.normalize("NFC").toLowerCase();
const visible = (file: string) => !file.split("/").some(part => part.startsWith("."));

export function buildVault(files: Record<string, string>, assets: Record<string, string> = {}) {
  const notes: Note[] = [];
  const pages = new Map<Note, Token[]>();
  const paths = new Map<string, Note>();
  const names = new Map<string, Set<Note>>();
  const folders = new Map<string, Folder>();
  const roots: Folder[] = [];
  const links = new Map<string, SavedLink>();
  const routes = new Map<string, string>();

  function claim(route: string, file: string) {
    const existing = routes.get(route);
    if (existing && existing !== file) throw new Error('Both "' + existing + '" and "' + file + '" map to ' + route);
    routes.set(route, file);
  }

  for (const [file, source] of Object.entries(files).filter(([name]) => visible(name))) {
    const stem = file.replace(/\.md$/i, "");
    const filename = path.basename(stem);
    const parsed = parseNote(source, filename);
    const folder = path.dirname(stem) === "." ? "" : path.dirname(stem);
    const id = slugPath(stem);
    const note: Note = {
      file, folder, id, href: "/notes/" + id + "/", title: parsed.title,
      titleFootnotes: parsed.titleFootnotes, headingId: parsed.headingId,
      summary: parsed.summary, author: parsed.author, date: parsed.date, updatedAt: parsed.updatedAt,
      aliases: parsed.aliases, tags: parsed.tags,
      url: httpUrl(parsed.url)?.href, html: "", backlinks: [],
    };
    claim(note.href, file);
    notes.push(note);
    pages.set(note, parsed.tokens);
    paths.set(key(stem), note);
    for (const label of [filename, note.title, ...note.aliases]) {
      const matches = names.get(key(label)) ?? new Set<Note>();
      matches.add(note);
      names.set(key(label), matches);
    }
    let parent = "";
    let siblings = roots;
    for (const name of folder.split("/").filter(Boolean)) {
      parent = path.join(parent, name);
      const folderId = slugPath(parent);
      const href = "/folders/" + folderId + "/";
      claim(href, parent);
      let group = folders.get(parent);
      if (!group) {
        group = { name, id: folderId, path: parent, href, notes: [], children: [] };
        folders.set(parent, group);
        siblings.push(group);
      }
      group.notes.push(note);
      siblings = group.children;
    }
  }

  function saveLink(url: URL, label: string, source: Note) {
    const link = links.get(url.href) ?? { href: url.href, title: label || url.hostname, host: url.hostname, sources: [] };
    if (!link.sources.includes(source)) link.sources.push(source);
    links.set(url.href, link);
  }

  const assetPaths = new Map(Object.entries(assets).filter(([file]) => visible(file)).map(([file, url]) => [key(file), url]));
  const assetNames = new Map<string, string[]>();
  for (const [file, url] of assetPaths) {
    const basename = path.basename(file);
    assetNames.set(basename, [...(assetNames.get(basename) ?? []), url]);
  }

  // Full vault paths and relative paths disambiguate notes that share a filename.
  function resolve(raw: string, from: Note, wiki: boolean) {
    let value: string;
    try { value = decodeURIComponent(raw); } catch { value = raw; }
    const [file, ...headings] = value.split("#");
    const fragment = headings.length ? "#" + slug(headings.at(-1)!) : "";
    if (!file) return { href: fragment || from.href };
    const local = path.join(from.folder, file);
    const absolute = path.normalize(file.replace(/^\/+/, ""));
    const explicit = file.startsWith("/") || (wiki && file.includes("/") && !file.startsWith("."));
    const candidates = file.startsWith("/") ? [absolute] : explicit ? [absolute, local] : [local, absolute];
    for (const candidate of candidates) {
      const target = paths.get(key(candidate.replace(/\.md$/i, "")));
      if (target) return { href: target.href + fragment, target };
      const asset = assetPaths.get(key(candidate));
      if (asset) return { href: asset, asset: true };
    }
    if (!file.includes("/")) {
      const matches = names.get(key(file.replace(/\.md$/i, "")));
      const nearby = matches && [...matches].filter(note => note.folder === from.folder);
      const target = nearby?.length === 1 ? nearby[0] : matches?.size === 1 ? [...matches][0] : undefined;
      if (target) return { href: target.href + fragment, target };
      const images = assetNames.get(key(file));
      if (images?.length === 1) return { href: images[0], asset: true };
    }
  }

  for (const [note, tokens] of pages) {
    const bookmark = httpUrl(note.url);
    if (bookmark) saveLink(bookmark, note.title, note);
    for (const block of tokens) {
      const inline = block.children ?? [];
      for (const [i, token] of inline.entries()) {
        const wiki = token.type === "wiki";
        if (!wiki && token.type !== "link_open" && token.type !== "image") continue;
        const attr = token.type === "image" ? "src" : "href";
        const raw = String((wiki ? token.meta?.target : token.attrGet(attr)) ?? "");
        const url = httpUrl(raw);
        if (!wiki && url) {
          if (token.type === "link_open") {
            for (const [name, value] of Object.entries(outboundAttributes(url))) token.attrSet(name, value);
            const end = inline.findIndex((item, j) => j > i && item.type === "link_close");
            saveLink(url, plain(inline.slice(i + 1, end)), note);
          }
          continue;
        }
        if (!wiki && /^(?:[a-z][\w+.-]*:|\/\/)/i.test(raw)) continue;
        const link = resolve(raw, note, wiki);
        if (link?.target && link.target !== note && !link.target.backlinks.includes(note)) link.target.backlinks.push(note);
        if (wiki) {
          const esc = markdown.utils.escapeHtml;
          const label = esc(token.content);
          token.type = "html_inline";
          if (!link) token.content = '<span class="unresolved" title="Unresolved vault link">' + label + "</span>";
          else if (token.meta?.embed && link.asset) token.content = '<img src="' + esc(link.href) + '" alt="' + label + '">';
          else token.content = '<a href="' + esc(link.href) + '">' + label + "</a>";
        } else if (link) {
          token.attrSet(attr, link.href);
        }
      }
    }
    note.html = markdown.renderer.render(tokens, markdown.options, {});
  }
  for (const note of notes) note.backlinks.sort(byTitle);
  const byFolder = (a: Folder, b: Folder) => a.name.localeCompare(b.name, "en", { numeric: true });
  for (const folder of folders.values()) {
    folder.notes.sort(byTitle);
    folder.children.sort(byFolder);
  }
  for (const link of links.values()) link.sources.sort(byTitle);
  notes.sort(byTitle);
  roots.sort(byFolder);
  return {
    notes, roots,
    folders: [...folders.values()].sort((a, b) => a.path.localeCompare(b.path, "en")),
    links: [...links.values()].sort(byTitle),
  };
}

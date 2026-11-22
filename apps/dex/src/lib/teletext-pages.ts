import { authors } from "./authors";
import { vault } from "./content";

export const teletextPages = [
  { href: "/", title: "Index" },
  ...vault.folders.map(folder => ({ href: folder.href, title: folder.name })),
  ...vault.notes,
  ...Array.from(authors.values(), author => ({ href: author.href, title: author.name })),
  { href: "/links/", title: "Link index" },
].map(({ href, title }, index) => ({ href, title, number: 100 + index + Number(index >= 304) }));

export const teletextNumbers = new Map(teletextPages.map(({ href, number }) => [href, number]));

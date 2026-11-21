import { buildVault } from "./vault";

const files = import.meta.glob<string>("../../content/**/*.md", { eager: true, import: "default", query: "?raw" });
const images = import.meta.glob<string>("../../content/**/*.{png,jpg,jpeg,gif,webp,avif}", { eager: true, import: "default", query: "?url&no-inline" });

function fromVault(entries: Record<string, string>) {
  return Object.fromEntries(Object.entries(entries).map(([path, value]) => [path.slice("../../content/".length), value]));
}

export const vault = buildVault(fromVault(files), fromVault(images));

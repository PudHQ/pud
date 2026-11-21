import { createHash } from "node:crypto";

export const pudHome = "https://pud.dev";
export const dexHost = "dex.pud.dev";

export function httpUrl(value: unknown): URL | undefined {
  if (typeof value !== "string" || !/^(?:https?:)?\/\//i.test(value)) return;
  try { return new URL(value.startsWith("//") ? "https:" + value : value); }
  catch { return; }
}

// A fixed-length filename also works for IPv6, IDNs and long hostnames.
export function faviconId(host: string) {
  return createHash("sha256").update(host).digest("hex").slice(0, 24);
}

export function outboundAttributes(href: unknown): Record<string, string> {
  const url = href instanceof URL ? href : httpUrl(href);
  if (!url || url.hostname === dexHost) return {};
  return {
    target: "_blank",
    rel: "noopener noreferrer",
    style: `--site-icon: url(/favicons/${faviconId(url.hostname)}.png)`,
  };
}

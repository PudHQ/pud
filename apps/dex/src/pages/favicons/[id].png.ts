import type { APIRoute } from "astro";
import { vault } from "../../lib/content";
import { faviconForHost } from "../../lib/favicons";
import { dexHost, faviconId, pudHome } from "../../lib/web-links";

export function getStaticPaths() {
  const hosts = new Set([new URL(pudHome).hostname, ...vault.links.map(link => link.host)]);
  hosts.delete(dexHost);
  return [...hosts].map(host => ({ params: { id: faviconId(host) }, props: { host } }));
}

export const GET: APIRoute = async ({ props }) => {
  const icon = await faviconForHost(props.host);
  return new Response(new Uint8Array(icon), { headers: { "Content-Type": "image/png" } });
};

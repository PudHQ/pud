import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://dex.pud.dev",
  trailingSlash: "always",
  server: { port: 4902 },
  vite: { server: { strictPort: true }, preview: { port: 4902, strictPort: true } },
  devToolbar: { enabled: false },
});

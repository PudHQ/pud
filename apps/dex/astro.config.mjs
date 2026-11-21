import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://dex.pud.dev",
  trailingSlash: "always",
  server: { port: 4902 },
  vite: {
    plugins: [tailwindcss()],
    server: { strictPort: true },
    preview: { port: 4902, strictPort: true },
  },
  devToolbar: { enabled: false },
});

import { defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  accountId: "8715fe32117162efcdfaf18fac4ce28d",
  worker: defineWorker({
    name: "pud-dex",
    compatibilityDate: "2026-11-21",
    previewUrls: true,
    domains: ["dex.pud.dev"],
    assets: { notFoundHandling: "404-page" },
  }),
});

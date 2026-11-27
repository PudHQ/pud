import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig(({ isPreview, mode }) => ({
  accountId: "8715fe32117162efcdfaf18fac4ce28d",
  worker: defineWorker({
    name: "pud-www",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-11-18",
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    domains: [
      "pud.dev",
      "www.pud.dev"
    ],
    env: {
      ASSETS: bindings.assets(),
      // cf addresses local D1 migrations by UUID. Cloud deployments resolve databases by name.
      ALPHA_DB: bindings.d1(
        isPreview
          ? { name: "pud-alpha-preview" }
          : mode === "development"
            ? { id: "00000000-0000-4000-8000-000000004901" }
            : { name: "pud-alpha" },
      ),
    },
  }),
}));

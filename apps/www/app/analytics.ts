import { initAnalytics } from "@pud/analytics";

export const analytics = typeof window === "undefined"
  ? undefined
  : initAnalytics(window.location.hostname, "pud.dev", "www.pud.dev");

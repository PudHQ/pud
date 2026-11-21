import posthog from "posthog-js/dist/module.slim";

// Keep local development and forks out of the live project's analytics.
const isLiveSite = typeof window !== "undefined" &&
  (window.location.hostname === "pud.dev" || window.location.hostname === "www.pud.dev");

export const analytics = isLiveSite ? posthog.init("phc_wvLapEmc5yQortS66ksjT879GGvQpYv3hiZjwAtfMehm", {
  api_host: "https://us.i.posthog.com",
  defaults: "2026-08-30",
  autocapture: false,
  capture_pageview: false,
  capture_pageleave: false,
  disable_external_dependency_loading: true,
  disable_session_recording: true,
  person_profiles: "never",
  persistence: "memory",
}) : undefined;

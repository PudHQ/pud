"use client";

import type { MouseEvent } from "react";
import { NavAction } from "@/components/nav-action";
import { analytics } from "@/lib/analytics";

function focusSignup(event: MouseEvent<HTMLAnchorElement>) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  analytics?.capture("alpha_signup_cta_clicked");
  // Allow native fragment navigation to scroll before focusing the field.
  requestAnimationFrame(() => document.getElementById("alpha-entry")?.focus({ preventScroll: true }));
}

export function JoinWaitlistLink() {
  return <NavAction href="/#waitlist" tone="muted" onClick={focusSignup}>Join waitlist</NavAction>;
}

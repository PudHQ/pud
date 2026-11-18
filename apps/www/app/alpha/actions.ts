"use server";

import { env } from "cloudflare:workers";

export type SignupState = {
  status: "idle" | "invalid" | "unavailable" | "joined";
  email?: string;
};

export async function joinAlpha(_previous: SignupState, data: FormData): Promise<SignupState> {
  const rawEmail = data.get("email");
  const email = typeof rawEmail === "string" ? rawEmail.trim() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "invalid", email: email.slice(0, 254) };
  }

  try {
    await env.ALPHA_DB.prepare(
      "INSERT INTO alpha_signups (email) VALUES (?) ON CONFLICT(email) DO NOTHING",
    ).bind(email.toLowerCase()).run();
  } catch {
    console.error("Could not save an alpha signup to D1");
    return { status: "unavailable", email };
  }
  return { status: "joined" };
}

"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { analytics } from "@/lib/analytics";
import { joinAlpha, type SignupState } from "./actions";

const initialState: SignupState = { status: "idle" };

export function WaitlistSignup() {
  const [serverState, nativeAction] = useActionState(joinAlpha, initialState, "/#waitlist");
  const [clientState, setClientState] = useState<SignupState | null>(null);
  const [pending, startTransition] = useTransition();
  const state = clientState ?? serverState;
  const email = useRef<HTMLInputElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const reportedState = useRef<SignupState>(initialState);

  // The form action also works before hydration. Once hydrated, keep the input on network errors.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    analytics?.capture("alpha_signup_submitted");
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        setClientState(await joinAlpha(initialState, data));
      } catch {
        setClientState({ status: "unavailable" });
      }
    });
  }

  useEffect(() => {
    if (state.status === "joined") feedback.current?.focus({ preventScroll: true });
    if (state.status === "invalid") email.current?.focus();
    if (state.status !== "idle" && reportedState.current !== state) {
      reportedState.current = state;
      analytics?.capture("alpha_signup_result", { outcome: state.status });
    }
  }, [state]);

  return (
    <div className="mt-6 w-full max-w-lg" data-status={state.status}>
      {state.status !== "joined" && (
        <form
          className="grid grid-cols-signup items-start gap-x-2"
          action={nativeAction}
          onSubmit={submit}
          onInvalid={() => analytics?.capture("alpha_signup_result", { outcome: "invalid" })}
          aria-labelledby="waitlist-title"
          aria-busy={pending}
        >
          <label className="col-span-2 mb-2 text-signup-label leading-4 font-interface" htmlFor="alpha-entry">Email address</label>
          <input
            className="min-h-12 w-full min-w-0 scroll-my-16 rounded-xl border border-neutral-300 bg-white px-3 text-ink
              placeholder:text-neutral-500 aria-invalid:border-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            ref={email}
            id="alpha-entry"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            placeholder="you@example.com"
            required
            defaultValue={state.email}
            aria-invalid={state.status === "invalid"}
            aria-describedby={state.status === "invalid" ? "email-error" : "waitlist-help"}
          />
          <button
            className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-ink px-4 text-sm font-bold whitespace-nowrap text-white
              enabled:hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-progress disabled:opacity-75"
            type="submit"
            disabled={pending}
          >
            {pending ? "Joining…" : "Notify me"} <span aria-hidden="true" className="text-lg leading-none">→</span>
          </button>
          {state.status === "invalid" && (
            <small id="email-error" className="col-span-2 mt-2 text-sm text-red-700">Enter a valid email address.</small>
          )}
        </form>
      )}
      <div
        ref={feedback}
        id={state.status === "joined" ? "alpha-entry" : undefined}
        className="scroll-my-16 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ink"
        role="status"
        aria-atomic="true"
        tabIndex={-1}
      >
        {state.status === "joined" && (
          <>
            <p className="text-signup-status leading-signup-feedback font-interface">
              <span className="text-teal-700" aria-hidden="true">✓</span> You’re on the waitlist.
            </p>
            <p className="mt-1 text-signup-help text-neutral-600">We’ll email you when the Pud alpha is ready.</p>
          </>
        )}
        {state.status === "unavailable" && <p className="mt-3 leading-signup-feedback">We couldn’t save your signup. Please try again.</p>}
      </div>
    </div>
  );
}

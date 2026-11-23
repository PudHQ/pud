"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type FormEvent, type MouseEvent } from "react";
import { analytics } from "../analytics";
import { joinAlpha, type SignupState } from "./actions";

const initialState: SignupState = { status: "idle" };

export function JoinWaitlistLink() {
  function focusSignup(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    analytics?.capture("alpha_signup_cta_clicked");
    // Let the fragment scroll to the full section before moving focus to the email field.
    requestAnimationFrame(() => document.getElementById("alpha-entry")?.focus({ preventScroll: true }));
  }

  return (
    // biome-ignore lint/a11y/useValidAnchor: The fragment link scrolls to the form before hydration too.
    <a
      href="#waitlist"
      onClick={focusSignup}
      className="relative isolate inline-block min-h-11 min-w-11 py-3.5 ps-signup-link-start pe-gutter whitespace-nowrap text-ink
        before:absolute before:inset-0 before:-z-10 before:bg-cyan before:clip-signup
        hover:before:bg-paper focus-visible:outline-2 focus-visible:-outline-offset-5 focus-visible:outline-ink focus-visible:before:bg-paper
        phone:ps-4.5 phone:pe-4 small-phone:ps-3.75 small-phone:pe-3 small-phone:text-xs"
    >
      Join the waitlist
    </a>
  );
}

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
          className="grid grid-cols-signup items-start"
          action={nativeAction}
          onSubmit={submit}
          onInvalid={() => analytics?.capture("alpha_signup_result", { outcome: "invalid" })}
          aria-labelledby="waitlist-title"
          aria-busy={pending}
        >
          <label className="col-span-2 mb-2 text-signup-label leading-4 font-interface" htmlFor="alpha-entry">Email address</label>
          <input
            className="min-h-13 w-full min-w-0 scroll-my-16 border-2 border-transparent bg-paper px-3 py-2.25 text-ink
              placeholder:text-ink/60 aria-invalid:border-error-border focus-visible:z-10 focus-visible:outline-2
              focus-visible:-outline-offset-4 focus-visible:outline-ink"
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
            className="inline-flex min-h-13 cursor-pointer items-center justify-between gap-3 bg-cyan px-4 text-sm font-bold whitespace-nowrap text-ink
              enabled:hover:bg-cyan/85 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ink disabled:cursor-progress disabled:opacity-75"
            type="submit"
            disabled={pending}
          >
            {pending ? "Joining…" : "Notify me"} <span aria-hidden="true" className="text-lg leading-none">→</span>
          </button>
          {state.status === "invalid" && (
            <small id="email-error" className="col-span-2 mt-2 text-signup-error leading-signup-feedback text-error">Enter a valid email address.</small>
          )}
        </form>
      )}
      <div
        ref={feedback}
        id={state.status === "joined" ? "alpha-entry" : undefined}
        className="scroll-my-16 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-cyan"
        role="status"
        aria-atomic="true"
        tabIndex={-1}
      >
        {state.status === "joined" && (
          <>
            <p className="text-signup-status leading-signup-feedback font-interface">
              <span className="text-cyan" aria-hidden="true">✓</span> You’re on the waitlist.
            </p>
            <p className="mt-1 text-signup-help text-paper/85">We’ll email you when the Pud Alpha is ready.</p>
          </>
        )}
        {state.status === "unavailable" && <p className="mt-3 leading-signup-feedback">We couldn’t save your signup. Please try again.</p>}
      </div>
    </div>
  );
}

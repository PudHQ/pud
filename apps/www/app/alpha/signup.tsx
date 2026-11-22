"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type FormEvent, type MouseEvent } from "react";
import { analytics } from "../analytics";
import { joinAlpha, type SignupState } from "./actions";

const initialState: SignupState = { status: "idle" };

export function JoinAlphaLink() {
  function focusSignup(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    analytics?.capture("alpha_signup_cta_clicked");
    const target = document.getElementById("alpha-entry");
    target?.focus({ preventScroll: true });
    if (target instanceof HTMLInputElement && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      target.animate(
        [0, -4, 4, -2, 2, 0].map(x => ({ transform: `translateX(${x}px)` })),
        { duration: 320, easing: "ease-out" },
      );
    }
  }

  return (
    // biome-ignore lint/a11y/useValidAnchor: The fragment link scrolls to the form before hydration too.
    <a
      href="#alpha-entry"
      onClick={focusSignup}
      className="relative isolate inline-block min-h-11 min-w-11 py-3.5 ps-signup-link-start pe-gutter whitespace-nowrap text-ink
        before:absolute before:inset-0 before:-z-10 before:bg-cyan before:clip-signup
        hover:before:bg-paper focus-visible:outline-2 focus-visible:-outline-offset-5 focus-visible:outline-ink focus-visible:before:bg-paper
        phone:ps-4.5 phone:pe-4 small-phone:ps-3.75 small-phone:pe-3"
    >
      Join the alpha
    </a>
  );
}

export function AlphaSignup() {
  const [serverState, nativeAction] = useActionState(joinAlpha, initialState, "/#alpha");
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
    <div className="w-full max-w-176" data-status={state.status}>
      {state.status !== "joined" && (
        <form
          className="grid grid-cols-signup items-start gap-3 phone:grid-cols-1"
          action={nativeAction}
          onSubmit={submit}
          onInvalid={() => analytics?.capture("alpha_signup_result", { outcome: "invalid" })}
          aria-labelledby="alpha-title"
          aria-busy={pending}
        >
          <div className="grid gap-1.5">
            <label className="text-signup-label leading-4 font-interface" htmlFor="alpha-entry">Email</label>
            <input
              className="min-h-12 w-full scroll-my-16 rounded-xs border-2 border-transparent bg-paper px-3 py-2.25 text-ink
                aria-invalid:border-error-border focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-cyan"
              ref={email}
              id="alpha-entry"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              defaultValue={state.email}
              aria-invalid={state.status === "invalid"}
              aria-describedby={state.status === "invalid" ? "email-error" : "alpha-help"}
            />
            {state.status === "invalid" && (
              <small id="email-error" className="text-signup-error leading-signup-feedback text-error">Enter an email address we can send an invite to.</small>
            )}
          </div>
          <button
            className="mt-5.5 min-h-12 cursor-pointer rounded-xs border-2 border-transparent bg-cyan px-4.75 font-bold text-ink
              enabled:hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-cyan disabled:cursor-progress disabled:opacity-75 phone:mt-1.5"
            type="submit"
            disabled={pending}
          >
            {pending ? "Joining…" : "Request invite"}
          </button>
        </form>
      )}
      <div
        ref={feedback}
        id={state.status === "joined" ? "alpha-entry" : undefined}
        className="scroll-my-16"
        role="status"
        aria-atomic="true"
        tabIndex={-1}
      >
        {state.status === "joined" && (
          <p className="text-signup-status leading-signup-feedback font-interface">
            <span className="text-cyan" aria-hidden="true">✓</span> You’re on the alpha list.
          </p>
        )}
        {state.status === "unavailable" && <p className="mt-3 leading-signup-feedback">We couldn’t save your signup. Please try again.</p>}
      </div>
    </div>
  );
}

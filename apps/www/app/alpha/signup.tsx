"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type FormEvent, type MouseEvent } from "react";
import { joinAlpha, type SignupState } from "./actions";

const initialState: SignupState = { status: "idle" };

export function JoinAlphaLink() {
  function focusSignup(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
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
    <a href="#alpha-entry" onClick={focusSignup} className="alpha-link">
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

  // The form action also works before hydration. Once hydrated, keep the input on network errors.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
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
  }, [state]);

  return (
    <div className="signup">
      {state.status !== "joined" && (
        <form action={nativeAction} onSubmit={submit} aria-labelledby="alpha-title" aria-busy={pending}>
          <div className="signup-field">
            <label htmlFor="alpha-entry">Email</label>
            <input
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
            {state.status === "invalid" && <small id="email-error">Enter an email address we can send an invite to.</small>}
          </div>
          <button className="signup-submit" type="submit" disabled={pending}>
            {pending ? "Joining…" : "Request invite"}
          </button>
        </form>
      )}
      <div
        ref={feedback}
        id={state.status === "joined" ? "alpha-entry" : undefined}
        className="signup-feedback"
        role="status"
        aria-atomic="true"
        tabIndex={-1}
      >
        {state.status === "joined" && <p className="signup-success"><span aria-hidden="true">✓</span> You’re on the alpha list.</p>}
        {state.status === "unavailable" && <p>We couldn’t save your signup. Please try again.</p>}
      </div>
    </div>
  );
}

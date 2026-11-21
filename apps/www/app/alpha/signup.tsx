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
    <a
      href="#alpha-entry"
      onClick={focusSignup}
      className="relative isolate inline-block min-h-11 py-[0.9rem] ps-[clamp(1.35rem,2.5vw,3rem)] pe-gutter whitespace-nowrap text-ink
        before:absolute before:inset-0 before:-z-10 before:bg-cyan before:[clip-path:polygon(0.6rem_0,100%_0,100%_100%,0_100%)]
        hover:before:bg-paper focus-visible:outline-2 focus-visible:-outline-offset-5 focus-visible:outline-ink focus-visible:before:bg-paper
        phone:ps-[1.15rem] phone:pe-4 small-phone:ps-[0.95rem] small-phone:pe-3"
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
    <div className="w-full max-w-[44rem]" data-status={state.status}>
      {state.status !== "joined" && (
        <form
          className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 phone:grid-cols-1"
          action={nativeAction}
          onSubmit={submit}
          onInvalid={() => analytics?.capture("alpha_signup_result", { outcome: "invalid" })}
          aria-labelledby="alpha-title"
          aria-busy={pending}
        >
          <div className="grid gap-[0.4rem]">
            <label className="text-[0.84rem] leading-4 font-[650]" htmlFor="alpha-entry">Email</label>
            <input
              className="min-h-12 w-full scroll-my-16 rounded-[2px] border-2 border-transparent bg-paper px-3 py-[0.55rem] text-ink
                aria-invalid:border-[#ff907f] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-cyan"
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
              <small id="email-error" className="text-[length:smaller] leading-[1.4] text-[#ffb4a5]">Enter an email address we can send an invite to.</small>
            )}
          </div>
          <button
            className="mt-[1.4rem] min-h-12 cursor-pointer rounded-[2px] border-2 border-transparent bg-cyan px-[1.2rem] font-bold text-ink
              enabled:hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-cyan disabled:cursor-progress disabled:opacity-75 phone:mt-[0.35rem]"
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
          <p className="text-[clamp(1.2rem,2vw,1.75rem)] leading-[1.4] font-[650]">
            <span className="text-cyan" aria-hidden="true">✓</span> You’re on the alpha list.
          </p>
        )}
        {state.status === "unavailable" && <p className="mt-3 leading-[1.4]">We couldn’t save your signup. Please try again.</p>}
      </div>
    </div>
  );
}

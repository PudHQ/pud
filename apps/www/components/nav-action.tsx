import type { ComponentProps } from "react";

type NavActionProps = ComponentProps<"a"> & { tone: "black" | "muted" };

export function NavAction({ tone, className = "", children, ...anchor }: NavActionProps) {
  const surface = tone === "black"
    ? "bg-black text-white"
    : "bg-neutral-100 px-4 text-neutral-600 inset-ring-1 inset-ring-neutral-200 hover:bg-neutral-200 hover:text-ink phone:px-3 small-phone:px-2.5";

  return (
    <a {...anchor} className={`relative inline-flex min-h-11 shrink-0 items-center justify-center rounded-full
      text-sm leading-none font-interface whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-3
      focus-visible:outline-ink phone:text-xs ${surface} ${className}`}>{children}</a>
  );
}

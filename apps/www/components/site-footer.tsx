import { pudDexUrl, pudLog } from "@/lib/links";

const footerLink = "inline-flex min-h-11 items-center gap-1 rounded-sm hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export function SiteFooter() {
  return (
    <footer className="mx-gutter flex flex-wrap items-center justify-between gap-x-6 border-t border-neutral-200 py-3 font-mono text-credit text-neutral-600">
      <nav aria-label="More from Pud" className="flex flex-wrap gap-x-5">
        <a target="_blank" rel="noopener" className={footerLink} href={pudDexUrl}>PudDex <span aria-hidden="true">↗</span></a>
        <a target="_blank" rel="noopener" className={footerLink} href={pudLog}>The Pud Log <span aria-hidden="true">↗</span></a>
        <a className={footerLink} href="mailto:pud@rorz.io">pud@rorz.io</a>
      </nav>
      <a className={footerLink} href="https://rorz.io">by Rory McMeekin</a>
    </footer>
  );
}

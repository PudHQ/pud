import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./styles.css";

export const metadata: Metadata = {
  title: "Pud.dev by Rory McMeekin",
  description: "The proof-running toolchain for TypeScript",
  icons: { icon: "/pud.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="scroll-pt-nav-height bg-white font-sans leading-normal text-ink">
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}

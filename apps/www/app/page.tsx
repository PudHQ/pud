import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Hero } from "@/features/home/hero";
import { UpdatesSection } from "@/features/home/updates-section";
import { DexSection } from "@/features/puddex/dex-section";
import { SupporterSection } from "@/features/supporters/supporter-section";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <UpdatesSection />
        <DexSection />
        <SupporterSection />
      </main>
      <SiteFooter />
    </>
  );
}

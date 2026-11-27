import { Hero } from "@/features/home/hero";
import { UpdatesSection } from "@/features/home/updates-section";
import { DexSection } from "@/features/puddex/dex-section";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <UpdatesSection />
      <DexSection />
    </main>
  );
}

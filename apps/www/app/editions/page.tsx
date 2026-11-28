import type { Metadata } from "next";
import { EditionGallery } from "@/features/editions/gallery";

export const metadata: Metadata = {
  title: "Pud Editions",
  description: "Browse the interactive landing editions for Pud, the TypeScript proof runner.",
};

type Props = { searchParams: Promise<{ round?: string }> };

export default async function EditionsPage({ searchParams }: Props) {
  const { round } = await searchParams;
  return <EditionGallery round={round === "1" ? 1 : round === "2" ? 2 : round === "3" ? 3 : 4} />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { roundEditions, thirdRound, type RoundEdition } from "@/features/editions/catalog";
import { Wobble } from "@/features/editions/round-three/wobble";
import { Flyposter, Lenticular, PinWall } from "@/features/editions/round-three/material";
import { Feedback, JogWheel, Keybed } from "@/features/editions/round-three/sound";
import { PressureType, Ripcord, SplitFlap } from "@/features/editions/round-three/type";
import { Cartridge, Observatory, Workbench } from "@/features/editions/instruments";
import { TestKitchen } from "@/features/editions/kitchen";
import { Comic, FieldGuide, Gazette } from "@/features/editions/print";
import { Desktop, Factory, Theatre } from "@/features/editions/worlds";
import { EditionSwitcher } from "@/features/editions/switcher";

import { CrashTest } from "@/features/editions/remix/crash-test";
import { Flipbook, LabelMaker, Errata, Rulebook, CarbonCopy, MarginCall } from "@/features/editions/remix/stories";
import { NightShift, LastSeat, Switchyard, ReturnDesk, MailRoom, PartsCounter } from "@/features/editions/remix/places";
import { FrameAdvance, Breakpoint, BitPress, TapeSplice, PatchPanel, TwoKeys } from "@/features/editions/remix/machines";
import { SmallChange } from "@/features/editions/remix/small-change";
import { LoopLoom } from "@/features/editions/remix/loop-loom";
import { OddJobs } from "@/features/editions/remix/odd-jobs";
import { SignShop } from "@/features/editions/remix/sign-shop";
import { ColdStorage } from "@/features/editions/remix/cold-storage";
import { PressCheck } from "@/features/editions/remix/press-check";

const pages = {
  wobble: Wobble,
  flyposter: Flyposter,
  lenticular: Lenticular,
  "pin-wall": PinWall,
  "jog-wheel": JogWheel,
  feedback: Feedback,
  keybed: Keybed,
  ripcord: Ripcord,
  "pressure-type": PressureType,
  "split-flap": SplitFlap,
  "crash-test": CrashTest,
  "flipbook": Flipbook,
  "night-shift": NightShift,
  "frame-advance": FrameAdvance,
  "small-change": SmallChange,
  "loop-loom": LoopLoom,
  "label-maker": LabelMaker,
  "last-seat": LastSeat,
  "breakpoint": Breakpoint,
  "odd-jobs": OddJobs,
  "errata": Errata,
  "switchyard": Switchyard,
  "bit-press": BitPress,
  "sign-shop": SignShop,
  "rulebook": Rulebook,
  "return-desk": ReturnDesk,
  "tape-splice": TapeSplice,
  "cold-storage": ColdStorage,
  "carbon-copy": CarbonCopy,
  "mail-room": MailRoom,
  "patch-panel": PatchPanel,
  "press-check": PressCheck,
  "margin-call": MarginCall,
  "parts-counter": PartsCounter,
  "two-keys": TwoKeys,

  "test-kitchen": TestKitchen,
  workbench: Workbench,
  gazette: Gazette,
  desktop: Desktop,
  "field-guide": FieldGuide,
  cartridge: Cartridge,
  factory: Factory,
  observatory: Observatory,
  "sunday-strip": Comic,
  theatre: Theatre,
} satisfies Record<RoundEdition["slug"], React.ComponentType>;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const edition = roundEditions.find(item => item.slug === slug);
  return { title: edition ? `${edition.title} · Pud Editions` : "Pud Editions", description: edition?.description };
}

export default async function EditionPage({ params }: Props) {
  const { slug } = await params;
  const edition = roundEditions.find(item => item.slug === slug);
  if (!edition) notFound();
  const Page = pages[edition.slug];
  const current = thirdRound.some(item => item.slug === edition.slug);
  return <div className={current ? "" : "[&>main]:min-h-svh [&>main]:pb-20"}><Page /><EditionSwitcher edition={edition} /></div>;
}

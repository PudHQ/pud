import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";

const sampleSeconds = 0.85;
const frameBudget = 1 / 60;
const minPixelRatio = 0.75;

function emptySample() {
  return { elapsed: 0, frames: 0, late: 0, fastWindows: 0 };
}

export function RenderBudget({ active, ratio, ceiling, onChange }: {
  active: boolean;
  ratio: number;
  ceiling: number;
  onChange: (ratio: number) => void;
}) {
  const sample = useRef(emptySample());
  useEffect(() => { sample.current = emptySample(); }, [active, ceiling, ratio]);

  useFrame((_, delta) => {
    if (!active || delta <= 0 || delta > 0.25) return;
    const current = sample.current;
    current.elapsed += delta;
    current.frames++;
    if (delta > frameBudget * 1.2) current.late++;
    if (current.elapsed < sampleSeconds) return;

    const average = current.elapsed / current.frames;
    const slow = average > frameBudget * 1.025 && current.late > current.frames * 0.16;
    const fast = average < 1 / 67 && current.late <= 1;
    const fastWindows = fast ? current.fastWindows + 1 : 0;
    sample.current = { ...emptySample(), fastWindows };

    // Change the backing resolution in steps and wait for sustained headroom before raising it.
    const floor = Math.min(ceiling, minPixelRatio);
    if (slow && ratio > floor) onChange(Math.max(floor, ratio * 0.87));
    else if (fastWindows >= 5 && ratio < ceiling) onChange(Math.min(ceiling, ratio + 0.12));
  });

  return null;
}

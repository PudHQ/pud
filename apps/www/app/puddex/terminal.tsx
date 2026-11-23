"use client";

import { lazy, useEffect, useMemo, useRef, useState } from "react";
import { SceneViewport, useReducedMotion } from "../scenes/scene-viewport";
import { CrtGlass } from "./crt-glass";
import type { ScreenControls } from "./desk-layout";
import { diskDurations, finishDiskStep, initialPower, machineStatus, moveDisk, switchPower, type Power } from "./machine";

const DexScene = lazy(() => import("./dex-scene"));

const machineControl = "absolute z-20 h-11 min-w-11 -translate-1/2 cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-paper aria-disabled:cursor-wait";

function DesktopArtwork() {
  return (
    <>
      <img src="/pud-factory.webp" alt="" width="1536" height="1024" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover opacity-45" />
      <div className="absolute top-1/8 left-1/4 h-7/12 w-1/2 rounded-2xl bg-linear-to-b from-stone-200 via-stone-300 to-stone-500 ring-1 ring-stone-500 phone:left-1/16 phone:w-7/8" />
      <div className="absolute top-7/10 left-1/4 h-1/10 w-1/2 rounded-md bg-linear-to-b from-stone-300 to-stone-500 ring-1 ring-stone-500 phone:left-1/16 phone:w-7/8">
        <div className="absolute top-1/3 right-1/4 h-1 w-1/4 rounded-full bg-black" />
        <div className="absolute top-3/5 right-1/16 size-2 rounded-full bg-stone-700" />
      </div>
      <div className="absolute top-5/6 left-3/10 h-1/12 w-2/5 rounded-md bg-linear-to-b from-stone-300 to-stone-500 shadow-lg phone:left-1/8 phone:w-3/4" />
    </>
  );
}

function BootScreen({ disk }: Pick<Power, "disk">) {
  return (
    <div className="absolute inset-0 flex flex-col justify-start overflow-hidden bg-radial from-emerald-950 to-black p-9 font-mono text-sm text-emerald-200 sm:p-12 sm:text-base" aria-hidden="true">
      <div className="relative">
        <p>{disk === "booting" ? "A:\\> PUDDEX.EXE" : "A:\\>"}<span className="ms-1 text-emerald-300 motion-safe:animate-pulse">▌</span></p>
        {disk === "ejected" && <p className="mt-2 text-emerald-200/75">Insert system disk</p>}
      </div>
    </div>
  );
}

export function DexTerminal({ iframeUrl, address }: { iframeUrl: string; address: string }) {
  const terminal = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const eject = useRef<HTMLButtonElement>(null);
  const powerSwitch = useRef<HTMLButtonElement>(null);
  const controls = useMemo<ScreenControls>(() => ({ screen, eject, powerSwitch }), []);
  const hasStarted = useRef(false);
  const [power, setPower] = useState(initialPower);
  const reduced = useReducedMotion();
  const { on, disk, started } = power;
  const duration = diskDurations[disk];

  useEffect(() => {
    if (hasStarted.current || !terminal.current) return;

    function boot() {
      if (hasStarted.current) return;
      hasStarted.current = true;
      setPower({ on: true, disk: reduced ? "loaded" : "inserting", started: performance.now() });
    }

    if (!window.IntersectionObserver) {
      boot();
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio >= 0.35) {
        boot();
        observer.disconnect();
      }
    }, { threshold: 0.35 });
    observer.observe(terminal.current);
    return () => observer.disconnect();
  }, [reduced]);

  useEffect(() => {
    if (!duration) return;
    const remaining = Math.max(0, duration - (performance.now() - started));
    const timer = window.setTimeout(() => {
      const now = performance.now();
      setPower(current => current.disk === disk && current.started === started ? finishDiskStep(current, now) : current);
    }, reduced ? 0 : remaining);
    return () => window.clearTimeout(timer);
  }, [disk, duration, started, reduced]);

  function toggleDisk() {
    hasStarted.current = true;
    const now = performance.now();
    setPower(current => moveDisk(current, reduced, now));
  }

  function togglePower() {
    hasStarted.current = true;
    const now = performance.now();
    setPower(current => switchPower(current, reduced, now));
  }

  const artwork = <DesktopArtwork />;
  const driveLabel = disk === "loaded" || disk === "booting" || disk === "ejecting" ? "Eject PudDex disk" : "Insert PudDex disk";
  const booted = on && disk === "loaded";

  return (
    <div ref={terminal} className="relative isolate h-svh min-h-132 w-full overflow-hidden bg-neutral-950">
      <SceneViewport artwork={artwork}>
        {animate => <DexScene controls={controls} animate={animate} power={power} fallback={artwork} />}
      </SceneViewport>
      <button ref={eject} className={`${machineControl} top-3/4 left-3/5`}
        type="button" onClick={toggleDisk} aria-controls="puddex-crt" aria-disabled={disk === "inserting" || disk === "ejecting"} aria-label={driveLabel} title={driveLabel}
      />
      <button ref={powerSwitch} className={`${machineControl} top-19/25 left-7/10 phone:left-4/5`}
        type="button" onClick={togglePower} aria-controls="puddex-crt" aria-label="PudDex power" aria-pressed={on} title={on ? "Turn PudDex off" : "Turn PudDex on"}
      />
      <div ref={screen} className="absolute top-1/6 left-7/25 z-10 h-1/2 w-11/25 origin-top-left phone:left-1/10 phone:w-4/5">
        <CrtGlass lit={on} src={booted ? iframeUrl : undefined} address={address}>
          {on && !booted && <BootScreen disk={disk} />}
          <noscript><a href={address} target="_blank" rel="noopener" className="pointer-events-auto absolute bottom-4 left-4 text-sm text-paper underline">Open PudDex ↗</a></noscript>
        </CrtGlass>
      </div>
      <p role="status" className="sr-only">{machineStatus(power)}</p>
    </div>
  );
}

"use client";

import { lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SceneViewport, useReducedMotion } from "@/components/scenes/scene-viewport";
import { CrtGlass } from "./crt-glass";
import type { ScreenControls } from "../scene/office/desk-layout";
import { DexLoader, loaderBloomDuration } from "./loader";
import { diskDurations, finishDiskStep, initialPower, machineStatus, moveDisk, switchPower, type Power } from "./machine";

const DexScene = lazy(() => import("../scene/dex-scene"));

const machineControl = "absolute z-20 h-11 min-w-11 -translate-1/2 cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-paper aria-disabled:cursor-wait";

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
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const [presented, setPresented] = useState(false);
  const reportProgress = useCallback((value: number) => setProgress(current => Math.max(current, value)), []);
  const sceneFailed = useCallback(() => setFailed(true), []);
  const reduced = useReducedMotion();
  const { on, disk, started } = power;
  const duration = diskDurations[disk];
  const ready = progress === 100 && started > 0;

  useEffect(() => {
    if (!ready || failed) return;
    const finish = window.setTimeout(() => setPresented(true), reduced ? 0 : loaderBloomDuration);
    return () => window.clearTimeout(finish);
  }, [failed, ready, reduced]);

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

  const driveLabel = disk === "loaded" || disk === "booting" || disk === "ejecting" ? "Eject PudDex disk" : "Insert PudDex disk";
  const booted = on && disk === "loaded";
  const loadPage = progress === 100 && on && (disk === "booting" || disk === "loaded" || disk === "ejecting");

  return (
    <div ref={terminal} className="relative isolate h-svh min-h-132 w-full overflow-hidden bg-neutral-950">
      <SceneViewport artwork={null} onError={sceneFailed}>
        {animate => <DexScene controls={controls} animate={animate} power={power} presented={presented} onProgress={reportProgress} />}
      </SceneViewport>
      <div className={presented && !failed ? undefined : "invisible"}>
        <button ref={eject} className={`${machineControl} top-3/4 left-3/5`}
          type="button" onClick={toggleDisk} aria-controls="puddex-crt" aria-disabled={disk === "inserting" || disk === "ejecting"} aria-label={driveLabel} title={driveLabel}
        />
        <button ref={powerSwitch} className={`${machineControl} top-19/25 left-7/10 phone:left-4/5`}
          type="button" onClick={togglePower} aria-controls="puddex-crt" aria-label="PudDex power" aria-pressed={on} title={on ? "Turn PudDex off" : "Turn PudDex on"}
        />
        <div ref={screen} className="absolute top-1/6 left-7/25 z-10 h-1/2 w-11/25 origin-top-left will-change-transform phone:left-1/10 phone:w-4/5">
          <CrtGlass lit={on} src={loadPage ? iframeUrl : undefined} showPage={booted} address={address}>
            {on && !booted && <BootScreen disk={disk} />}
          </CrtGlass>
        </div>
        <p role="status" className="sr-only">{machineStatus(power)}</p>
      </div>
      {(!presented || failed) && <DexLoader progress={ready ? 100 : Math.min(progress, 94)} failed={failed} address={address} />}
    </div>
  );
}

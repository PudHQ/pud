export type DiskPhase = "ejected" | "inserting" | "booting" | "loaded" | "ejecting";
export type Power = { on: boolean; disk: DiskPhase; started: number };

export const initialPower: Power = { on: false, disk: "ejected", started: 0 };

export const diskDurations: Record<DiskPhase, number> = {
  ejected: 0,
  inserting: 450,
  booting: 570,
  loaded: 0,
  ejecting: 430,
};

export function moveDisk(power: Power, instant: boolean, now: number): Power {
  switch (power.disk) {
    case "ejected": return { ...power, disk: instant ? "loaded" : "inserting", started: now };
    case "loaded":
    case "booting": return { ...power, disk: instant ? "ejected" : "ejecting", started: now };
    default: return power;
  }
}

export function switchPower(power: Power, instant: boolean, now: number): Power {
  const on = !power.on;
  if (on && power.disk === "loaded" && !instant) return { on, disk: "booting", started: now };
  if (!on && power.disk === "booting") return { on, disk: "loaded", started: now };
  return { ...power, on };
}

export function finishDiskStep(power: Power, now: number): Power {
  switch (power.disk) {
    case "inserting": return { ...power, disk: power.on ? "booting" : "loaded", started: now };
    case "booting": return { ...power, disk: "loaded", started: now };
    case "ejecting": return { ...power, disk: "ejected", started: now };
    default: return power;
  }
}

export function machineStatus({ on, disk }: Power) {
  if (disk === "inserting") return "Inserting disk…";
  if (disk === "ejecting") return "Ejecting disk…";
  if (!on) return "PudDex is off";
  if (disk === "booting") return "Booting PudDex…";
  return disk === "loaded" ? "PudDex is running" : "Insert PudDex disk to boot";
}

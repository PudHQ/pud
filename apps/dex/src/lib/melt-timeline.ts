import { clamp } from "./wallpaper-paint";

export const meltDuration = 2650;
const accelerationTime = 140;
const brakingStart = 900;
const brakingTime = meltDuration - brakingStart;
const maxTravel = brakingStart - accelerationTime / 2 + brakingTime / 2;

const ramp = (t: number) => t * t * (3 - 2 * t);
// Integrating the speed ramp keeps the page moving continuously as it slows.
const rampTravel = (t: number) => t ** 3 * (1 - t / 2);

export function meltFrame(elapsed: number) {
  const launch = clamp(elapsed / accelerationTime);
  const brake = clamp((elapsed - brakingStart) / brakingTime);
  const reveal = ramp(brake);
  const speed = ramp(launch) * (1 - reveal);
  const sceneTime = accelerationTime * rampTravel(launch)
    + clamp(elapsed - accelerationTime, 0, brakingStart - accelerationTime)
    + brakingTime * (brake - rampTravel(brake));

  return { travel: sceneTime / maxTravel, sceneTime, reveal, speed };
}

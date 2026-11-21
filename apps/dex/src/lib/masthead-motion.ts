export const trackingRate = 21;
export const restingRate = 14;

interface MotionAxis { value: number; velocity: number }

export function motionAxis(value = 0): MotionAxis {
  return { value, velocity: 0 };
}

// Exact step for a critically damped spring. Changing the target preserves the current velocity.
export function dampAxis(axis: MotionAxis, target: number, rate: number, seconds: number, precision: number) {
  const distance = axis.value - target;
  const slope = axis.velocity + rate * distance;
  const decay = Math.exp(-rate * seconds);
  const offset = (distance + slope * seconds) * decay;
  const velocity = (axis.velocity - rate * slope * seconds) * decay;
  const settled = Math.abs(offset) <= precision && Math.abs(velocity) <= precision * rate;
  axis.value = settled ? target : target + offset;
  axis.velocity = settled ? 0 : velocity;
  return !settled;
}

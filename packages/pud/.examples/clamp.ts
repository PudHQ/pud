export const clamp = (value: bigint, lower: bigint, upper: bigint): bigint =>
  value < lower ? lower : value > upper ? upper : value;

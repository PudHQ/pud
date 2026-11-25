// Adapted from LemmaScript's bigintBits.ts. See lemmascript-license.txt.
export function shiftWide(value: bigint): bigint {
  return value << 70n;
}

export function low64(value: bigint): bigint {
  return value & 0xffffffffffffffffn;
}

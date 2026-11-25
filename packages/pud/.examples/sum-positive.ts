export function sumPositive(values: readonly bigint[]): bigint {
  let total = 0n;
  // Doesn't work
  for (let i = 0; i <= values.length; i++) {
    const value = values[i]
    if (value && value > 0n) {
      total += value
    }
  }
  // Works
  // for (const value of values) {
  //   if (value > 0n) {
  //     total += value
  //   }
  //   // total += value > 0n ? value : 0n;
  // }
  return total;
}

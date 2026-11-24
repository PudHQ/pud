export function debit(balance: bigint, amount: bigint): bigint {
  let remaining = balance;
  if (amount > 0n && amount <= remaining) {
    remaining -= amount;
  }
  return remaining;
}

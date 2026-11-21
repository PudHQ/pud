// Run with bun experiments/alpha-design/study.ts. This enumerates two finite
// domains directly in TypeScript, independently of any Pud implementation.
type Cart = { pro: boolean; net: bigint };
type Quote = { shipping: bigint; tax: bigint };
type Price = (cart: Cart) => Quote;

// One market and one currency. Tax depends on net merchandise only.
const oldPrice: Price = ({ net }) => ({ shipping: 600n, tax: net * 7n / 100n });
const newPrice: Price = cart => ({
  ...oldPrice(cart),
  shipping: cart.pro && cart.net >= 10_000n ? 0n : 600n,
});

const revisions: Record<string, Price> = {
  intended: newPrice,
  unchanged: oldPrice,
  offByOne: cart => ({
    ...oldPrice(cart),
    shipping: cart.pro && cart.net > 10_000n ? 0n : 600n,
  }),
  allFree: cart => ({ ...oldPrice(cart), shipping: 0n }),
  unrelatedTax: cart => ({ ...newPrice(cart), tax: oldPrice(cart).tax + 1n }),
};

function* carts(): Generator<Cart> {
  for (let net = 0n; net <= 20_000n; net++) {
    for (const pro of [false, true]) yield { pro, net };
  }
}

function qualifies(cart: Cart) {
  return cart.pro && cart.net >= 10_000n;
}

function report(name: string, result: object) {
  console.log(name, JSON.stringify(result, (_, value) =>
    typeof value === "bigint" ? Number(value) : value));
}

for (const [name, price] of Object.entries(revisions)) {
  let eligible = 0, outside = 0, shippingFailures = 0, taxFailures = 0, failures = 0;
  let first;
  for (const cart of carts()) {
    const before = oldPrice(cart);
    const after = price(cart);
    const eligibleForDiscount = qualifies(cart);
    if (eligibleForDiscount) eligible++;
    else outside++;
    const expected = { shipping: eligibleForDiscount ? 0n : before.shipping, tax: before.tax };
    const wrongShipping = after.shipping !== expected.shipping;
    const wrongTax = after.tax !== expected.tax;
    if (wrongShipping) shippingFailures++;
    if (wrongTax) taxFailures++;
    if (wrongShipping || wrongTax) {
      failures++;
      first ??= { cart, expected, observed: after };
    }
  }
  report(name, { eligible, outside, failures, shippingFailures, taxFailures, first: first ?? null });
}

// On a later PR only the durable promise is in force. The other fields could
// legitimately have changed since launch. No old or reference quote is read.
const restoredFee: Price = ({ net }) => ({ shipping: 600n, tax: net * 7n / 100n });
let durableFailures = 0;
let firstDurable;
for (const cart of carts()) {
  const observed = restoredFee(cart).shipping;
  if (qualifies(cart) && observed !== 0n) {
    durableFailures++;
    firstDurable ??= { cart, expected: 0n, observed };
  }
}
report("restored fee on revision 3", { failures: durableFailures, first: firstDurable });

// Two recipients, integer cents. The example table deliberately covers even totals.
type Shares = readonly [bigint, bigint];
const equalSplit = (total: bigint): Shares => [total - total / 2n, total / 2n];
const alternative = (total: bigint): Shares =>
  total % 2n === 0n ? [total / 2n, total / 2n] : [total, 0n];
const examples = new Map<bigint, Shares>([[2n, [1n, 1n]], [10n, [5n, 5n]]]);

function weakRule(total: bigint, [a, b]: Shares) {
  const example = examples.get(total);
  return a >= 0n && b >= 0n && a + b === total &&
    (!example || (a === example[0] && b === example[1]));
}

// The owner adds this fairness rule. Either recipient may get the spare cent.
function withinOneCent([a, b]: Shares) {
  return a - b <= 1n && b - a <= 1n;
}

for (const [name, split] of Object.entries({ equalSplit, alternative })) {
  let weakFailures = 0, fairnessFailures = 0, first;
  for (let total = 0n; total <= 10_000n; total++) {
    const observed = split(total);
    if (!weakRule(total, observed)) weakFailures++;
    if (!withinOneCent(observed)) {
      fairnessFailures++;
      first ??= { total, observed, reference: equalSplit(total) };
    }
  }
  report(name, { totals: 10_001, weakFailures, fairnessFailures, first: first ?? null });
}

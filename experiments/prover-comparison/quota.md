# Verifying an export quota with LemmaScript and Pud

A grandfathered account may export a positive batch when its current usage plus the batch is at most 16. The real TypeScript reads its limit from a module-level `bigint` constant. The reviewed rule names 16 independently, so changing the constant can break it.

LemmaScript 0.6.10 verified the original and its algebraic rewrite with Dafny 4.11.0. Both incorrect edits failed the postcondition. The Pud working tree based on `bc1304b` returned `unsupported` at the constant reference in each file. It included uncommitted verifier changes. Inlining the constant's value let Pud prove the same rule. This makes upstream extraction worth trying before adding support for module constants to Pud. The comparison covers one pure function.

| Implementation | Expected under the business rule | LemmaScript + Dafny | Pud | Wrong answers / 68 |
| --- | --- | --- | --- | ---: |
| `batch <= LEGACY_QUOTA - used` | Meets rule | Proved | Unsupported | 0 |
| `used + batch <= LEGACY_QUOTA` | Meets rule | Proved | Unsupported | 0 |
| Strict `<` | Denies exact fits | Unproved | Unsupported | 4 |
| Constant changed to `15n` | Denies exact fits | Unproved | Unsupported | 4 |
| Always refuse, with contradictory preconditions | Denies valid exports | Proved vacuously | Proved vacuously | 58 |
| Original with `16n` inlined | Meets rule | Proved | Proved | 0 |

The 68 real calls cover usage 0–16 and batch size 1–4. At usage 12, both broken edits refuse a batch of four. Bun supplies that witness. The ordinary LemmaScript check reports a generated Dafny postcondition location. The nonvacuous rule asks about every nonnegative `bigint` usage and positive `bigint` batch. The contradictory control admits zero inputs, so its successful proof gives the product owner no assurance.

## Historical reproduction

Start from the earlier [Pud revision](https://github.com/PudHQ/pud/tree/bc1304b) with its Bun dependencies installed, Python 3, Node and Dafny 4.11.0. The recorded Pud run also included working-tree changes. Set `DAFNY` to its absolute executable path if it is outside `PATH`. The trial used Node 22.21.1 and Bun 1.4.2. [Upstream guide at the published package revision](https://github.com/midspiral/LemmaScript/blob/93283ec6f8c7094f0281b7c5f144e619b1f85aea/GETTING_STARTED.md)

```sh
set -e
pud_root=$(git rev-parse --show-toplevel)
export DAFNY="${DAFNY:-$(command -v dafny)}"
export PATH="$(dirname "$DAFNY"):$PATH"
trial=$(mktemp -d "${TMPDIR:-/tmp}/pud-quota.XXXXXX")
cd "$trial"
npm install --cache "$trial/npm-cache" --ignore-scripts --no-audit --no-fund --save-exact lemmascript@0.6.10

python3 - <<'PY'
from pathlib import Path
original = r'''const LEGACY_QUOTA = 16n;
export function admit(used: bigint, batch: bigint): boolean {
  //@ verify
  //@ requires used >= 0n && batch > 0n
  //@ ensures \result === (used + batch <= 16n)
  return batch <= LEGACY_QUOTA - used;
}
'''
sidecar = '''import { proof } from "@pud/cli";
import { admit } from "./quota";
export default proof(admit, "admit exactly the legacy quota",
  (used, batch, allowed) => used < 0n || batch <= 0n || allowed === (used + batch <= 16n));
'''
body = 'batch <= LEGACY_QUOTA - used'
versions = {
    'original': original,
    'equivalent': original.replace(body, 'used + batch <= LEGACY_QUOTA'),
    'strict': original.replace(body, 'batch < LEGACY_QUOTA - used'),
    'constant': original.replace('QUOTA = 16n', 'QUOTA = 15n'),
    'vacuous': original.replace('batch > 0n', 'batch > 0n && batch <= 0n').replace(body, 'false'),
    'inline': original.replace(body, 'batch <= 16n - used'),
}
for name, source in versions.items():
    path = Path(name)
    path.mkdir()
    (path / 'quota.ts').write_text(source)
    rule = sidecar.replace('batch <= 0n || allowed', 'batch <= 0n || batch > 0n || allowed') if name == 'vacuous' else sidecar
    (path / 'quota.proof.ts').write_text(rule)
PY

for version in original equivalent strict constant vacuous inline; do (
  cd "$version"
  ../node_modules/.bin/lsc gen --backend=dafny quota.ts
  ../node_modules/.bin/lsc check --backend=dafny quota.ts || echo "lsc exit $?"
  cmp quota.dfy.gen quota.dfy
  bun "$pud_root/packages/cli/src/cli.ts" check quota.proof.ts --json || echo "pud exit $?"
  bun -e 'import { admit } from "./quota.ts";
    let wrong = 0;
    for (let u = 0n; u <= 16n; u++) for (let b = 1n; b <= 4n; b++) {
      if (admit(u, b) !== (u + b <= 16n)) wrong++;
    }
    console.log({ wrong, atBoundary: admit(12n, 4n) });'
); done
```

Generation succeeded even for both wrong edits. Verification returned `2 verified, 0 errors` on each green LemmaScript run and `1 verified, 1 error` on each red run. No handwritten Dafny additions were needed. In a separate edit loop, `lsc regen --backend=dafny quota.ts` merged the equivalent rewrite and verified it, then rejected the strict comparison. Integration effort, replay support on other constructs and performance remain unmeasured.

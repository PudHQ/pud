"""Replay the same scalar maximum property through Rocq and Dafny."""

import os
import shutil
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory


ROCQ = os.environ.get("ROCQ", "rocq")
DAFNY = os.environ.get("DAFNY", "dafny")
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
DEMO = ROOT / "packages" / "cli" / "demo"
CASES = {
    # Left and right of <, then the values returned on true and false.
    "baseline": ("a", "b", "b", "a"),
    "equivalent": ("b", "a", "a", "b"),
    "broken": ("a", "b", "a", "b"),
}
PROPERTY = "r >= a && r >= b && (r === a || r === b)"


def check(command, directory, rejection):
    result = subprocess.run(command, cwd=directory, capture_output=True, text=True, timeout=30)
    output = result.stdout + result.stderr
    if result.returncode == 0:
        return "proved"
    if rejection in output:
        return "unproved"
    raise RuntimeError(output or f"{command[0]} exited {result.returncode}")


def run_case(directory, variant, proof):
    left, right, yes, no = CASES[variant]
    original = (DEMO / "bounds.ts").read_text()
    baseline = "a < b ? b : a"
    if original.count(baseline) != 1:
        raise ValueError("The demo baseline has changed. Review the Dafny translation.")
    (directory / "bounds.ts").write_text(original.replace(baseline, f"{left} < {right} ? {yes} : {no}"))
    manifest = directory / "bounds.proof.ts"
    shutil.copyfile(DEMO / manifest.name, manifest)
    if f"=> {PROPERTY}," not in manifest.read_text():
        raise ValueError("The reviewed demo predicate has changed. Review the Dafny translation.")

    emitted = subprocess.run(
        ["bun", "run", "--silent", "verify", "--emit", str(manifest), "max"],
        cwd=ROOT, check=True, capture_output=True, text=True, timeout=30,
    )
    (directory / "Subject.v").write_text(emitted.stdout)
    shutil.copyfile(HERE / proof, directory / "Proof.v")
    compile_rocq = [ROCQ, "compile", "-q", "-Q", ".", "Pud"]
    subprocess.run([*compile_rocq, "Subject.v"], cwd=directory, check=True, timeout=30)
    rocq_status = check([*compile_rocq, "Proof.v"], directory, "Cannot find witness")

    dafny = directory / "Case.dfy"
    dafny.write_text(f"""method Max(a: int, b: int) returns (r: int)
  ensures {PROPERTY.replace("===", "==")}
{{
  r := if {left} < {right} then {yes} else {no};
}}
""")
    dafny_status = check([DAFNY, "verify", dafny.name], directory, "postcondition could not be proved")
    return rocq_status, dafny_status


def main():
    for binary in [ROCQ, DAFNY]:
        subprocess.run([binary, "--version"], check=True, timeout=30)
    trials = [
        ("original proofs", "baseline", "OriginalProof.v", ("proved", "proved")),
        ("original proofs", "equivalent", "OriginalProof.v", ("unproved", "proved")),
        ("after one repair", "equivalent", "Proof.v", ("proved", "proved")),
        ("original proofs", "broken", "OriginalProof.v", ("unproved", "unproved")),
        ("final proofs", "broken", "Proof.v", ("unproved", "unproved")),
    ]
    print("case / proof                  Rocq       Dafny", flush=True)
    for label, variant, proof, expected in trials:
        with TemporaryDirectory(prefix="pud-provers-") as temp:
            actual = run_case(Path(temp), variant, proof)
        print(f"{variant + ' / ' + label:29} {actual[0]:10} {actual[1]}", flush=True)
        if actual != expected:
            raise SystemExit(f"Expected {expected}, observed {actual}")


if __name__ == "__main__":
    main()

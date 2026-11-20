# Repository instructions

At the start of every run, read the [skills index](skills/README.md) and every Markdown guide under `skills/` in full. Run this command before planning or editing, then apply the guidance relevant to the task.

```sh
find "$(git rev-parse --show-toplevel)/skills" -type f -name '*.md' -print -exec cat {} \;
```

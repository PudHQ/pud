# Repository instructions

At the start of every run, read the [skills index](skills/README.md) and determine which skill files are relevant (including tangentially relevant) and READ THESE FILES IN FULL. Do this before planning or editing, then apply any of the discovered guidance relevant to the task.

```sh
find "$(git rev-parse --show-toplevel)/skills" -type f -name '*.md' -print -exec cat {} \;
```

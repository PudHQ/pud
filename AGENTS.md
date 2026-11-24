# Repository instructions

At the start of every run, read the [skills index](skills/README.md) and determine which skill files are relevant (including tangentially relevant) and READ THESE FILES IN FULL. Do this before planning or editing, then apply any of the discovered guidance relevant to the task.

```sh
find "$(git rev-parse --show-toplevel)/skills" -type f -name '*.md' -print -exec cat {} \;
```

Use the [PudDex reference skill](skills/puddex-reference/SKILL.md) whenever existing project context could inform the task. Before finishing, use the [PudDex notes skill](skills/puddex-notes/SKILL.md) to record useful findings or findings that took substantive work to establish.

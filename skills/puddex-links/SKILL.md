---
name: puddex-links
description: Link to local PudDex notes, sections, and folders in agent replies. Open PudDex pages in the Codex webview when showing them to the user.
---

# Link to PudDex

Always use clickable links to `http://localhost:4902` when sharing PudDex documentation in chat. Use the rendered `/notes/<slug-path>/` or `/folders/<slug-path>/` route. For a specific section, append its rendered heading ID. Verify the route in the running site or its build output.

[Why keep tests](http://localhost:4902/notes/first-mate-s-log/verification/lean/pud-vs-vitest-workshop-booking/#why-keep-tests) links straight to a section in the booking note.

When opening a PudDex page for the user, use `open_in_codex` with `target.type` set to `browser` and `target.url` set to the same local URL. Use vault wikilinks in PudDex content.

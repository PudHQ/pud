# Monorepo rules, conditions, and guidelines

We want our monorepo to be like a top-1% Factorio layout, not a zoo for pet rocks. How do we do this? Namely:

1. Extreme levels of standardisation.
2. DRY-based thinking.
3. Regular attention to maintenance.

It's surprising just how great you can make a codebase by holding those three principles as imperative focal points for any piece of work that alters the shape or structure of a monorepo.

## Standardisation

UNLESS OTHERWISE CAVEATED -- Things that you must standardise:

- Package manager (always bun).
- Deployment platform, and the tools and processes (exact CLI tool for example, or whether we use GH actions) used to deploy to the deployment platform.
- Naming strategies for all files and folders (lowercase, hyphenated)
- Centralisation of `bun` workspace commands (i.e. centralised `package.json` top level commands, using the same naming for everything in each sub-package)
- Proper structuring of workspace packages -- i.e. is it an app or a package, or a lib? What do we name it? (Not sure? Ask a human!)
- Same web technologies for all apps unless otherwise reasoned (i.e. Next or Vinext or Astro or Vite or whatever!)
- Same documentation style, testing tools, linting tools, and methodologies for every package.
- Maintaining documentation in a centralised area for most things.
- Same README style for each package with strong integrity between packages (i.e. hyperlinks in READMEs)
- Always modularising, and always introducing and managing modularity in the same way.

## DRY-based thinking

Principles to always hold true:

- Cataloging every single dependency the proper way.
- Extracting shared code into monorepo-standard acceptable (see above section) packages wherever possible.
- Thinking at the meta-space level... I.e. I can modularise my application code... Can I modularise my transpilation configs... or my linting configs? (The answer is almost always yes).
- Always thinking about "the abstract valhalla way" to do things and writing custom scripts (in a standardised, extremely cohesive and integral script cupboard) whenever you need to do something that could conceivably be DRY.
- Devoting more time to _thinking_ and _planning_ a particular task _before_ working on it.

## Regular attention to maintenance

At the end of each day, or task in an LLM-driven, turn-based environment -- you _must_ ask yourself:

"Have any of our monorepo principles been violated today?"

If the answer is YES -- you MUST fix them to the absolute highest, elite-level standards... And then come back to the same question again.

If the answer is NO -- you MUST take at least a few moments to think about:

"Can we make our monorepo better today?"

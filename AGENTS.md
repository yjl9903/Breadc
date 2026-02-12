# Repository Guidelines

## Project Structure & Module Organization

Breadc is a command-line application framework with fully strong TypeScript support.

Breadc is a pnpm/turbo monorepo. Core libraries live under `packages/*`. `packages/core` is the working-in-progress framework runtime code, while `packages/breadc` is the legacy framework code which is planned to be deprecated. Other CLI utilities sit in sibling packages like `complete`, `death`, and `tui`.

Related CLI toolchains reside in `apps/*`, which is also working-in-progess.

Documentation is maintained in `docs/` (VitePress), demos in `examples/`.

Shared configuration stays at the root (`tsconfig.json`, `turbo.json`, `pnpm-workspace.yaml`) with package-specific overrides inside each workspace.

## Build, Test, and Development Commands

Install dependencies with `pnpm install`.

Run `pnpm build` to execute every package’s `build` task through Turbo (tsup/unbuild under the hood).

Unit test is powered by Vitest. Execute unit tests for the full monorepo using `pnpm test:ci`. Run per-package non-iteractive unit tests should use `pnpm -C packages/xxx test:ci`.

Keep TypeScript sound with `pnpm typecheck`, and tidy formatting through `pnpm format`.

Launch docs locally with `pnpm docs:dev`, or build them via `pnpm docs:build`.

## Coding Style & Naming Conventions

TypeScript ESM is the default. Prefer named exports and colocate CLI handlers in `command.ts` modules. Prettier 3 (two-space indent, trailing commas where valid) governs formatting; run `pnpm format` before committing. File names stay lowercase with short descriptive stems (`command.ts`, `parser/lexer.ts`), and tests mirror their subjects. Place shared types under `types/`, avoid default exports for public APIs, and keep package entry points lean (delegate to `/src`).

## Testing Guidelines

Vitest powers the test suite. Store spec files in `test/` with `.test.ts` suffixes that reflect their target (`command.test.ts`). Type assertion tests belong in `.test-d.ts`, while opt-in benchmarks use `.bench.ts`. Maintain or improve the existing coverage in `coverage/` and run `pnpm -C packages/core test` when iterating locally. Snapshot tests are acceptable only when deterministic and stable across platforms.

## Commit & Pull Request Guidelines

Adopt conventional commits as seen in history (`feat(core):`, `chore:`). Scope changes to the affected package (`feat(core):`) or domain (`docs:`). Before pushing, run `pnpm build` and `pnpm test:ci` to catch regressions. Pull requests should summarize intent, link issues, call out doc updates, and add CLI output or screenshots when UX shifts. Request review once CI succeeds and any release notes or changelog updates are ready.

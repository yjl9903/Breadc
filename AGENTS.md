# Repository Guidelines

## Project Overview

Breadc is a command-line application framework with strong TypeScript support, organized as a pnpm/Turbo monorepo.

`@breadc/core` provides command definitions, parsing, validation, and execution. `breadc` builds on it with built-in help/version, localized output, and CLI utilities.

The repository also includes CLI toolchains under development and VitePress documentation.

## Documentation-First Workflow

Start with the [user requirements](docs/features/README.md): architecture decisions and implementations must serve the user's original intent. Then read the [architecture specs](docs/architecture/README.md), implementation, and tests before changing behavior.

Keep three layers aligned: user intent in features, design and specifications in architecture, and their realization in source code and tests. Feature documents use public usage examples, not framework implementation details. Never rewrite a requirement merely to justify existing code.

Update affected requirements, architecture, code, tests, and user documentation according to the change. Follow the [development workflow](docs/documentation.md) for document boundaries, change order, and completion criteria.

## Build, Test, and Development Commands

Install dependencies with `pnpm install`.

Run `pnpm build` through Turbo. Libraries and CLI applications use tsdown; documentation uses VitePress.

Run non-interactive Vitest tests with `pnpm test:ci`, or `pnpm -C packages/xxx test:ci` for a single package.

Keep TypeScript sound with `pnpm typecheck`, and tidy formatting through `pnpm format`.

Launch docs locally with `pnpm docs:dev`, or build them via `pnpm docs:build`.

## Coding Style & Naming Conventions

Follow [the code style guide](docs/code-style.md) when changing source code or tests.

Use TypeScript ESM, prefer named exports, and keep public entry points lean. Use short, descriptive lowercase file names. Prettier 3 governs formatting: two-space indentation, single quotes, semicolons, no trailing commas, and a 120-character print width. Run `pnpm format` before committing.

## Testing Guidelines

Follow [the testing guide](docs/testing.md) for behavior coverage and verification commands.

Name tests after their subjects: `.test.ts` for unit tests, `.test-d.ts` for type assertions, and `.bench.ts` for opt-in benchmarks. Maintain or improve coverage and run `pnpm -C packages/core test` when iterating on core locally. Snapshot tests must be deterministic and stable across platforms.

For changes to `@breadc/core`, run `pnpm -C packages/core test:coverage` and review test coverage, not just test results.

## Commit & Pull Request Guidelines

Adopt conventional commits as seen in history (`feat(core):`, `chore:`). Scope changes to the affected package (`feat(core):`) or domain (`docs:`). Before pushing, run `pnpm build` and `pnpm test:ci` to catch regressions. Pull requests should summarize intent, link issues, call out doc updates, and add CLI output or screenshots when UX shifts. Request review once CI succeeds and any release notes or changelog updates are ready.

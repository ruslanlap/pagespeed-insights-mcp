# Repository Guidelines

## Project Structure & Module Organization

This is a TypeScript MCP server for Google PageSpeed Insights, Chrome UX Report, and Lighthouse. Production code is in `src/`: `index.ts` starts the server, `tool-definitions.ts` registers MCP tools, and `pagespeed-client.ts` owns API calls. Keep shared Zod schemas in `schemas.ts`, types in `types.ts`, and feature logic in focused modules such as `cache.ts` or `recommendations.ts`.

Tests live beside the codebase in `src/tests/` (for example, `cache.test.ts`). Documentation is in `docs/`, with site configuration in `mkdocs.yml`; images belong in `assets/` or `docs/assets/`. Docker files support local container runs. Do not edit generated `dist/` output.

## Build, Test, and Development Commands

Run these from the repository root:

```bash
npm run dev           # run src/index.ts through tsx
npm run build         # compile TypeScript into dist/
npm run typecheck     # validate types without writing output
npm test              # run the Vitest suite
npm run test:coverage # generate text, JSON, and HTML coverage
npm run lint          # check TypeScript with ESLint
npm run format        # format source files with Prettier
```

Before publishing, run `npm run lint && npm run typecheck && npm test && npm run build`. For a real API smoke test, set `GOOGLE_API_KEY` and run `node dist/index.js` after building.

## Coding Style & Naming Conventions

Use TypeScript, two-space indentation, semicolons, and single quotes, matching existing source. Prefer `camelCase` for variables and functions, `PascalCase` for types, and kebab-case MCP tool names such as `pagespeed_analyze_page`. Keep input validation at the boundary with Zod. Tool definitions need clear descriptions, actionable errors, and MCP annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`) where applicable. Use `_` prefixes for intentionally unused values.

## Testing Guidelines

Write Vitest tests as `src/tests/<module>.test.ts`. Mock HTTP with `nock`; tests must not require a live Google API key. Cover normal output, validation failures, and API-error handling for changed behavior. Run the focused test during development, then `npm test` before opening a PR.

## Commit & Pull Request Guidelines

Use Conventional Commit messages, e.g. `fix(cache): unref cleanup timer` or `chore(deps): bump vitest`. Keep commits scoped and avoid unrelated formatting. PRs should state the user-visible change, testing performed, and linked issue when available. Update `README.md`, `TESTING.md`, and `CHANGELOG.md` for public tool or signature changes; include screenshots only for documentation or visual changes.

## Security & Releases

Never commit `GOOGLE_API_KEY` or other credentials. Preserve release integrity checks and assets in CI; do not commit a `package.json` version below the latest release.

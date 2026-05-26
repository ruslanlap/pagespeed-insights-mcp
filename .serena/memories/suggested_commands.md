# Suggested Commands

- Install deps: `npm ci`.
- Dev entrypoint: `npm run dev`.
- Build: `npm run build`.
- Lint: `npm run lint`; autofix: `npm run lint:fix`.
- Typecheck only: `npm run typecheck`.
- Tests: `npm run test -- --run` for non-watch CI-style Vitest; `npm test` starts Vitest default mode.
- Coverage: `npm run test:coverage`.
- Production audit used by CI: `npm audit --omit=dev --audit-level=high`.
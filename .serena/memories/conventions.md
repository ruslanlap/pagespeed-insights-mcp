# Conventions

- ESM imports use `.js` extensions for local TypeScript modules so emitted Node ESM resolves correctly.
- Keep source under `src/`; `tsconfig.json` excludes `src/tests` from production build.
- Test files live in `src/tests/*.test.ts`; prefer nock-based API mocks and avoid real Google API calls.
- Environment access is centralized through `src/env.ts`; tests mock env when they need deterministic values.
- Public handler outputs commonly return MCP content arrays with text payloads; tests often parse JSON text for structured handlers.
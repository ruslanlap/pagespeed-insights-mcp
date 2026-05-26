# Tech Stack

- Node.js package, ESM (`"type": "module"`), Node engine `>=20`.
- TypeScript 5.x; `tsc` emits ESM to `dist/`, declarations and source maps enabled.
- Runtime deps include `@modelcontextprotocol/sdk`, `node-fetch`, `p-limit`, `p-retry`, `pino`, `pino-pretty`, `zod`.
- Tests use Vitest 4 with Node environment; HTTP mocking uses `nock`.
- Linting uses ESLint 8 with `@typescript-eslint` 6; formatting uses Prettier 3.
- Dependency lockfile is `package-lock.json`; use npm commands, not yarn/pnpm.
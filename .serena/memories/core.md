# Core

- TypeScript MCP server for Google PageSpeed Insights; source under `src/`, tests under `src/tests/`, generated build output under `dist/`.
- Main entrypoint: `src/index.ts`; package bin points to `dist/index.js`.
- API/client logic: `src/pagespeed-client.ts`; schemas: `src/schemas.ts`; cache singleton: `src/cache.ts`; logging: `src/logger.ts`.
- Read `mem:tech_stack` for package/build tooling, `mem:conventions` for style/test patterns, `mem:suggested_commands` for common commands, and `mem:task_completion` before finishing changes.
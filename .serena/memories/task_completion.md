# Task Completion

Run before considering code changes done:

- `npm run lint`
- `npm run typecheck`
- `npm run test -- --run`
- `npm run build`
- `npm audit --omit=dev --audit-level=high`

If workflow YAML changes, at least parse `.github/workflows/*.yml` with an available YAML parser; use `actionlint` if installed.
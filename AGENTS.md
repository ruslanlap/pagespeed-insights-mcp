# Project Rules — pagespeed-insights-mcp (MCP Server)

Цей файл доповнює глобальний `~/.grok/AGENTS.md`. Правила з нього мають вищий пріоритет у цьому репозиторії.

## Специфіка проєкту
- TypeScript + Node.js (>=20) MCP server на базі `@modelcontextprotocol/sdk` + Zod.
- 16 інструментів для Google PageSpeed Insights + Chrome UX Report + Lighthouse.
- Публікація: npm + GitHub Packages (semantic-release).
- Docker + docker-compose для локального запуску.
- Тести: Vitest + nock. Лінтинг: ESLint + Prettier.
- Документація: MkDocs (docs/ + mkdocs.yml).
- `.serena/` вже налаштовано (TypeScript + memories для conventions/tech_stack/task_completion).

## Обов'язкові практики (MCP + TS)
- При додаванні/редагуванні інструментів — слідуй mcp-builder skill (research → Zod schemas + descriptions з прикладами → annotations: readOnlyHint/destructiveHint/idempotentHint → structured output де можливо).
- Кожний tool: чітке ім'я, опис, inputSchema (Zod), actionable error messages.
- Перед публікацією: `npm run lint && npm run typecheck && npm test && npm run build`.
- Зміни в публічному API / tool signatures — оновлюй README, TESTING.md, CHANGELOG (conventional commits).
- Локальний MCP для self-dogfooding: використовуй `npx pagespeed-insights-mcp` або `node dist/index.js` з `GOOGLE_API_KEY`.

## Serena + .serena/
- Використовуй Serena MCP (`serena__*` tools) для семантичного пошуку, рефакторингу, аналізу символів у TS коді.
- Поважай `.serena/memories/*.md` (conventions, tech_stack, task_completion) — вони є джерелом правди для цього проєкту.
- При роботі з великими змінами — спочатку semantic_search / find_symbol, потім безпечні edits.

## Професійні skills тільки
- Дозволені: mcp-builder, implement, design, review, pr-babysit, execute-plan, check, best-of-n, create-skill (та інші high-star з marketplace, які ти особисто перевірив).
- **Заборонено** створювати custom `~/.grok/skills/*/` в цьому сетапі без явного дозволу.

## Команди (завжди з cd + verify)
```bash
cd /home/ubuntuvm/Projects/pagespeed-insights-mcp
npm run build
npm test
npm run lint:fix && npm run format
npx @modelcontextprotocol/inspector node dist/index.js   # для ручного тестування MCP tools
```

## Взаємодія з глобальними правилами
Глобальний AGENTS.md (мова, тон, security, DevOps дисципліна, WSL/PowerShell, todo_write, планування) застосовується повністю. Цей файл лише додає MCP/TS/Serena деталі.

---
Оновлюй цей файл при зміні архітектури MCP сервера або процесів релізу.
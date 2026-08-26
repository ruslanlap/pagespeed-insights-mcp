# Unreleased

### Changed

* **tools:** remove obsolete v1 implementation paths after v2.0.0. The public API remains the six `pagespeed_*` workflow tools.

# [2.0.0](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.7.4...v2.0.0) (2026-08-26)

### Features

* release v2 PageSpeed tool API ([a69eb1c](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/a69eb1cb2f1f2140ffc36e359cb34c67c478c93e))

### BREAKING CHANGES

* The 19 v1 MCP tool names are replaced by six pagespeed_* workflow tools. See the README migration table.

## [1.7.4](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.7.3...v1.7.4) (2026-08-26)

### Bug Fixes

* **docker:** build image from clean checkout ([fdd51fc](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/fdd51fcdc4596fd948c3f661b28f31e90b37c010))

## [1.7.3](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.7.2...v1.7.3) (2026-08-24)


### Bug Fixes

* **release:** restore package.json to 1.7.2 and document release integrity gate ([ceff06a](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/ceff06a4d6ba2742e3f8d85343fb64216a2adff1))

## [1.7.2](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.7.1...v1.7.2) (2026-08-24)


### Bug Fixes

* **tools:** clear_cache openWorldHint false — in-memory cache only ([#92](https://github.com/ruslanlap/pagespeed-insights-mcp/issues/92)) ([06d468a](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/06d468ad27a849804a906364df69fe39f0dfd66e))

## [1.7.1](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.7.0...v1.7.1) (2026-08-24)


### Bug Fixes

* **tools:** complete MCP annotations + usage-guideline descriptions for all 19 tools ([#91](https://github.com/ruslanlap/pagespeed-insights-mcp/issues/91)) ([7afc2f8](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/7afc2f840c20c3327a5bb3a786a1db2149565079))

# [1.7.0](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.6.0...v1.7.0) (2026-08-21)


### Features

* baseline comparison, progress keepalive, weighted findings, strategy both ([ed4e76a](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/ed4e76a876e5ea6597e2fe0e2290650dd756a9b5))

# [1.6.0](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.5.3...v1.6.0) (2026-08-21)


### Features

* median-of-N analysis with replay dedup and lab-vs-field clarity ([348894a](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/348894a6e489da58b7fe4f86840ce33f817f80f8))

## [1.5.3](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.5.2...v1.5.3) (2026-08-21)


### Bug Fixes

* server.json description <=100 chars (registry validation) ([127459a](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/127459a7a6210a54d8c874c04bd8ceb5d7b88a9a))

## [1.5.2](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.5.1...v1.5.2) (2026-08-21)


### Bug Fixes

* **ci:** address Dependabot guard review findings ([#74](https://github.com/ruslanlap/pagespeed-insights-mcp/issues/74)) ([214d34e](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/214d34e9daab43de57b0a2f89991f8c8917d4cee))

## [1.5.1](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.5.0...v1.5.1) (2026-08-12)


### Bug Fixes

* add Lighthouse 13 insight audit fallbacks ([#67](https://github.com/ruslanlap/pagespeed-insights-mcp/issues/67)) ([d129a95](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/d129a95cec337cbe7d6545ebfe1d5d8d7f8876f1)), closes [#66](https://github.com/ruslanlap/pagespeed-insights-mcp/issues/66)

# [1.5.0](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.4.1...v1.5.0) (2026-08-05)


### Bug Fixes

* resolve production dependency vulnerabilities (hono, fast-uri, ip-address) ([7d813e2](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/7d813e2fab3cadbea54307b20a6c04364bedd21f))


### Features

* add get_origin_crux tool for domain-level Chrome UX Report field data ([8e1cb28](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/8e1cb2893e9e977446b6238d4c1c5e7ba8ced92f))

## [1.4.1](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.4.0...v1.4.1) (2026-08-03)


### Bug Fixes

* deduplicate Mermaid classDef statements in performance map ([67d919f](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/67d919f184cde81167b870ee6552d643abce4cdf))
* **deps:** upgrade [@typescript-eslint](https://github.com/typescript-eslint) to v8, nock 14, vitest 4.1, tsx 4.23 ([f65a557](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/f65a557b559fccf15f1889b67044107b074bfe7c)), closes [#60](https://github.com/ruslanlap/pagespeed-insights-mcp/issues/60)

# [1.4.0](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.3.0...v1.4.0) (2026-08-03)


### Features

* add get_performance_map tool with Mermaid visualization ([5eef96d](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/5eef96dec2a70b82fb7eec6fa91b5edc421047bf))

# [1.3.0](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.2.8...v1.3.0) (2026-07-28)


### Features

* add workflow_dispatch for manual trigger ([f4a4283](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/f4a4283f6d8bc15f990b78029d7eab536075b3b4))

## [1.2.8](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.2.7...v1.2.8) (2026-07-28)


### Bug Fixes

* add INP, TTFB, FCP metrics to crux_summary output ([#56](https://github.com/ruslanlap/pagespeed-insights-mcp/issues/56)) ([5fdd78b](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/5fdd78b0a56aa3bf9618d0dbba4c83b9ef1dbf91))

## [1.2.7](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.2.6...v1.2.7) (2026-07-27)


### Bug Fixes

* **security:** resolve fast-uri high-severity vulnerability via npm audit fix ([18a5ed9](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/18a5ed9429168a4bdf6ebd05f9efa05452cf42f1)), closes [hi#severity](https://github.com/hi/issues/severity)

## [1.2.6](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.2.5...v1.2.6) (2026-07-20)


### Bug Fixes

* **ci:** bump release job Node version to 22 for semantic-release compatibility ([b945b86](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/b945b869b04b48dc5b10c63d044a70809d3dd63c))

## [1.2.5](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.2.4...v1.2.5) (2026-07-20)


### Bug Fixes

* **security:** resolve hono high-severity vulnerability via npm audit fix ([62a6d79](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/62a6d79a1366e6a522f6c62ba2bfe515e65f252e))

## [1.2.4](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.2.3...v1.2.4) (2026-06-07)


### Bug Fixes

* **installer:** use public npm package by default ([363dbb3](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/363dbb3c3ef8afdea7457a41325ea9b42d45d8e2))

## [1.2.3](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.2.2...v1.2.3) (2026-05-31)


### Bug Fixes

* **release:** publish antigravity v1.2.3 notes ([1b9b514](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/1b9b514be2fc289a281693105c52b8b2744deba9))

## [1.2.3](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.2.2...v1.2.3) (2026-05-31)


### Documentation

* **antigravity:** add Google Antigravity MCP configuration example and README setup guide ([ed0feea](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/ed0feea8018e6b879e0795e7140cfdb112a81c00))
* **release:** document user-facing release notes in README and patch-release rules for important integration docs

## [1.2.2](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.2.1...v1.2.2) (2026-05-28)


### Bug Fixes

* **docker:** do not ignore dist/ in .dockerignore ([17dd3c8](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/17dd3c89cb1d1f2339465cc8782bea8c347c63f0))

## [1.2.1](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.2.0...v1.2.1) (2026-05-27)


### Bug Fixes

* **entrypoint:** extract helper and add symlink regression tests ([2529ce6](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/2529ce69b0c206fce297ce5cb66c7ab7964beffd))

# [1.2.0](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.1.7...v1.2.0) (2026-05-27)


### Features

* **ci:** add sync-releases utility and workflow to synchronize missing package versions ([e5b4994](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/e5b49944b8c08f267a7ac6d68e3ceed7efeb1255))

## [1.1.7](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.1.6...v1.1.7) (2026-05-27)


### Bug Fixes

* **ci:** fix version_exists helper to avoid false matches on npm view 404 errors ([9eba92a](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/9eba92a7fe3881666877e223e31bf0e9f596ca32))

## [1.1.6](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.1.5...v1.1.6) (2026-05-27)


### Bug Fixes

* **ci:** make publish.sh more robust and verbose ([b584e31](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/b584e31eb1a870f2694d9e4a806980626c568029))

## [1.1.5](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.1.4...v1.1.5) (2026-05-27)


### Bug Fixes

* **ci:** fix dual-publish registry conflict and token management ([c1ca24c](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/c1ca24c427541a3219b2bbfec4d455e22274c760))

## [1.1.4](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.1.3...v1.1.4) (2026-05-26)


### Bug Fixes

* **client:** use dynamic package version in User-Agent header ([a1fc99a](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/a1fc99a3bcd7a875d797927cc461c527bb791464))

## [1.1.3](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.1.2...v1.1.3) (2026-05-26)


### Bug Fixes

* **publish:** repair dual-registry publish so public npm gets new versions ([4d54414](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/4d54414df01a1d8cdb396b81391218733ecec6b8))

## [1.1.2](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.1.1...v1.1.2) (2026-05-26)


### Bug Fixes

* **ci:** make PR checkout and coverage upload reliable ([c9faa56](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/c9faa5665c1fcac9cf26bc32100eab715c6c5637))
* **release:** trigger release after tag lineage repair ([fbf29cd](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/fbf29cd1999217a81673ac337743716dfcec6927))
* **security:** close production npm audit findings and harden inputs ([8f24f9e](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/8f24f9e1b19cb48870194fa461eeb48df1a03320))

## [1.1.1](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.1.0...v1.1.1) (2026-02-24)


### Bug Fixes

* **docs:** publish demo folder to GitHub Pages ([f41cd5e](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/f41cd5ec0d5caa01e15a7c67c6a6fd530cccbc33))

# [1.1.0](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.0.1...v1.1.0) (2026-02-24)


### Features

* add interactive demo page and deploy to GitHub Pages ([3484474](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/348447443f9221699c4957790bb651c87373904e))

## [1.0.1](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.0.0...v1.0.1) (2026-02-24)


### Bug Fixes

* upgrade @modelcontextprotocol/sdk to 1.26.0 to resolve high-severity vulnerabilities ([1624cab](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/1624cabc4cb139fd7d7ac4cb75ba3fc5f9f2fffe))

## [1.0.1](https://github.com/ruslanlap/pagespeed-insights-mcp/compare/v1.0.0...v1.0.1) (2026-02-12)


### Bug Fixes

* upgrade @modelcontextprotocol/sdk to 1.26.0 to resolve high-severity vulnerabilities ([3a9b81a](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/3a9b81a4d564dcfa10f7f11bc321ffe912d410b1))

# 1.0.0 (2025-11-21)


### Bug Fixes

* exclude dev dependencies from audit ([cfdeb13](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/cfdeb13eed494e88b0b68eee09737874683d7f2d))
* redirect logger output to stderr for MCP compatibility ([4ccc292](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/4ccc2926d3b7d4c77f9839c160bd5bc9750ecf89))
* remove resource attachments for Claude Code compatibility ([bdf489f](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/bdf489f22eb52cfe1021f320e89c49f8761ffa14))


### Features

* add 8 new advanced analysis tools (v1.1.0) ([21e922a](https://github.com/ruslanlap/pagespeed-insights-mcp/commit/21e922ae9e2661dab77f836c5b8ead48f219cb7c))

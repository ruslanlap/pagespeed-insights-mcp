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

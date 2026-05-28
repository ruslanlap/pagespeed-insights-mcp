# Publishing Guide

This document explains how to publish the PageSpeed Insights MCP package to both public npm and GitHub Packages.

## Prerequisites

1. **npm token**: An automation token for npm.
2. **GitHub Personal Access Token**: With `repo`, `write:packages`, and `read:packages` scopes.

In CI, these are stored as secrets `NPM_TOKEN` and `GH_TOKEN`.

## Project Configuration

The canonical state of `package.json` uses the scoped name `@ruslanlap/pagespeed-insights-mcp` and points to the GitHub Packages registry. This ensures that by default, the package is associated with its source repository.

## Dual-Publishing

We use a dual-publishing strategy to make the package available to the widest audience:

1. **Public npm**: Published as `pagespeed-insights-mcp` (unscoped).
2. **GitHub Packages**: Published as `@ruslanlap/pagespeed-insights-mcp` (scoped).

### Automated Publishing (Recommended)

The project includes a `scripts/publish.sh` script that automates the dual-publish process. It:
1. Builds the project.
2. Temporarily renames the package to the unscoped name for the npm step.
3. Publishes to npm.
4. Restores the canonical scoped name.
5. Publishes to GitHub Packages.

Usage in CI:
```bash
GITHUB_TOKEN=xxx NPM_TOKEN=xxx ./scripts/publish.sh
```

### Manual Publishing

If you need to publish manually, it's still recommended to use `scripts/publish.sh`. If you must do it step-by-step:

1. **npm**:
   - Change name to `pagespeed-insights-mcp`.
   - Remove `publishConfig`.
   - Run `npm publish --access=public --registry=https://registry.npmjs.org`.

2. **GitHub**:
   - Ensure name is `@ruslanlap/pagespeed-insights-mcp`.
   - Ensure `publishConfig` points to `https://npm.pkg.github.com`.
   - Run `npm publish`.

## CI/CD Workflow

The `.github/workflows/ci.yml` handles automatic publishing on pushes to `master` after a successful build and test run. It uses `semantic-release` to determine the next version and then calls `scripts/publish.sh`.

For manual re-publishes (e.g., if a secret was misconfigured), use the **Manual Publish** workflow in GitHub Actions.

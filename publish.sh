#!/bin/bash
# Dual-publish the package to:
#   1. Public npm   (unscoped name)
#   2. GitHub Packages (scoped name)
#
# Usage: GITHUB_TOKEN=ghp_xxx ./publish.sh
#        (additionally requires `npm login` for the public-npm step)
#
# Assumes package.json's canonical state is the scoped name with
# publishConfig.registry pointing at GitHub Packages. The script
# temporarily swaps the name + publishConfig for the public-npm step
# and ALWAYS restores the original via a trap, even on failure.

set -euo pipefail

PUBLIC_NAME="pagespeed-insights-mcp"
SCOPED_NAME="@ruslanlap/pagespeed-insights-mcp"

# ── Pre-flight ──────────────────────────────────────────────────────────
if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "❌ GITHUB_TOKEN is not set. Required for the GitHub Packages step."
  echo "   Set it with: export GITHUB_TOKEN=your_personal_access_token"
  exit 1
fi

ORIGINAL_NAME=$(node -p "require('./package.json').name")
if [ "$ORIGINAL_NAME" != "$SCOPED_NAME" ]; then
  echo "❌ package.json name is '$ORIGINAL_NAME', expected '$SCOPED_NAME'."
  echo "   This script assumes the canonical name in package.json is the scoped one."
  exit 1
fi

VERSION=$(node -p "require('./package.json').version")
echo "📦 Publishing version $VERSION to both registries"

# ── Build ───────────────────────────────────────────────────────────────
echo "🔨 Building package..."
npm run build

# ── Safety: always restore package.json on exit ─────────────────────────
cp package.json package.json.backup
trap 'mv -f package.json.backup package.json 2>/dev/null || true' EXIT

# ── 1. Public npm (unscoped) ────────────────────────────────────────────
echo "🚀 Publishing $PUBLIC_NAME@$VERSION to public npm..."
# `npm pkg` does proper JSON edits — no sed escaping pitfalls.
npm pkg set "name=$PUBLIC_NAME"
npm pkg delete publishConfig
npm publish --access=public --registry=https://registry.npmjs.org/

# ── 2. GitHub Packages (scoped) ─────────────────────────────────────────
echo "🔄 Restoring canonical package.json for GitHub Packages step..."
mv -f package.json.backup package.json
cp package.json package.json.backup  # re-stash so the trap still has a copy

echo "🚀 Publishing $SCOPED_NAME@$VERSION to GitHub Packages..."
npm publish

# ── Done ────────────────────────────────────────────────────────────────
# Trap restores package.json on exit; nothing more to do here.

echo ""
echo "✅ Successfully published $VERSION to both registries"
echo "📦 npm:    https://www.npmjs.com/package/$PUBLIC_NAME/v/$VERSION"
echo "📦 GitHub: https://github.com/ruslanlap/pagespeed-insights-mcp/pkgs/npm/pagespeed-insights-mcp"
echo ""
echo "📋 Installation:"
echo "   npm:    npm install $PUBLIC_NAME@$VERSION"
echo "   GitHub: npm install $SCOPED_NAME@$VERSION   (requires GitHub authentication)"

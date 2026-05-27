#!/bin/bash
# Dual-publish the package to:
#   1. Public npm   (unscoped name: pagespeed-insights-mcp)
#   2. GitHub Packages (scoped name: @ruslanlap/pagespeed-insights-mcp)

set -euo pipefail

PUBLIC_NAME="pagespeed-insights-mcp"
SCOPED_NAME="@ruslanlap/pagespeed-insights-mcp"
NPM_REGISTRY="https://registry.npmjs.org/"
GHP_REGISTRY="https://npm.pkg.github.com/"

# ── Pre-flight ──────────────────────────────────────────────────────────
if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "❌ GITHUB_TOKEN is not set."
  exit 1
fi

if [ -z "${NPM_TOKEN:-}" ]; then
  echo "❌ NPM_TOKEN is not set."
  exit 1
fi

VERSION=$(node -p "require('./package.json').version")
echo "📦 Preparing to publish version $VERSION"

# ── Build ───────────────────────────────────────────────────────────────
echo "🔨 Building package..."
npm run build

# ── Safety: always restore package.json on exit ─────────────────────────
cp package.json package.json.backup
trap 'mv -f package.json.backup package.json 2>/dev/null || true' EXIT

# Helper to check if a version exists
version_exists() {
  local pkg=$1
  local reg=$2
  # We use --json and check if the result is empty or the version matches
  # This avoids issues with exit codes and pipefail
  npm view "$pkg@$VERSION" version --registry="$reg" --json 2>/dev/null | grep -qF "$VERSION"
}

# ── 1. Public npm (unscoped) ────────────────────────────────────────────
echo "🚀 Step 1: Publishing to public npm (https://registry.npmjs.org/)..."

# Prepare package.json for npm
npm pkg set "name=$PUBLIC_NAME"
npm pkg delete publishConfig

if version_exists "$PUBLIC_NAME" "$NPM_REGISTRY"; then
  echo "⚠️  $PUBLIC_NAME@$VERSION already exists on npm. Skipping."
else
  echo "📤 Uploading $PUBLIC_NAME@$VERSION to npm..."
  # Use --access=public for the first publish of an unscoped package that might have been scoped
  npm publish --access=public --registry="$NPM_REGISTRY" --ignore-scripts --verbose
fi

# ── 2. GitHub Packages (scoped) ─────────────────────────────────────────
echo "🚀 Step 2: Publishing to GitHub Packages..."

# Restore and prepare for GitHub
mv -f package.json.backup package.json
cp package.json package.json.backup 

npm pkg set "name=$SCOPED_NAME"
npm pkg set "publishConfig.registry=$GHP_REGISTRY"

if version_exists "$SCOPED_NAME" "$GHP_REGISTRY"; then
  echo "⚠️  $SCOPED_NAME@$VERSION already exists on GitHub Packages. Skipping."
else
  echo "📤 Uploading $SCOPED_NAME@$VERSION to GitHub Packages..."
  npm publish --registry="$GHP_REGISTRY" --ignore-scripts --verbose
fi

echo "✅ Successfully completed dual-publish for version $VERSION"

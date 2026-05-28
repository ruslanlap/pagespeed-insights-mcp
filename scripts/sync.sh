#!/bin/bash
# Sync all missing git tags to public npm and GitHub Packages registry

set -euo pipefail

PUBLIC_NAME="pagespeed-insights-mcp"
SCOPED_NAME="@ruslanlap/pagespeed-insights-mcp"
NPM_REGISTRY="https://registry.npmjs.org/"
GHP_REGISTRY="https://npm.pkg.github.com/"
DRY_RUN="${DRY_RUN:-false}"

# ── Pre-flight ──────────────────────────────────────────────────────────
if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "❌ GITHUB_TOKEN is not set."
  exit 1
fi

if [ -z "${NPM_TOKEN:-}" ]; then
  echo "❌ NPM_TOKEN is not set."
  exit 1
fi

# Ensure git working tree is clean
if ! git diff-index --quiet HEAD --; then
  echo "❌ Git working directory is not clean. Commit or stash changes first."
  exit 1
fi

# Save current branch/commit to restore later
ORIGINAL_REF=$(git symbolic-ref -q --short HEAD || git rev-parse HEAD)
echo "💾 Saved original ref: $ORIGINAL_REF"

# Helper to check if a version exists
version_exists() {
  local pkg=$1
  local reg=$2
  local ver=$3
  local out
  out=$(npm view "$pkg@$ver" version --registry="$reg" 2>/dev/null || true)
  [ "$out" = "$ver" ]
}

# Restore ref on exit
cleanup() {
  echo "🔄 Returning to original ref $ORIGINAL_REF..."
  git checkout -f "$ORIGINAL_REF"
}
trap cleanup EXIT

# Get all tags matching semver pattern
TAGS=$(git tag -l "v*.*.*" | sort -V)

echo "🔍 Scanning all git tags..."

for TAG in $TAGS; do
  VERSION="${TAG#v}"
  
  # Check if version exists on public NPM
  ON_NPM=false
  if version_exists "$PUBLIC_NAME" "$NPM_REGISTRY" "$VERSION"; then
    ON_NPM=true
  fi
  
  # Check if version exists on GitHub Packages
  ON_GHP=false
  if version_exists "$SCOPED_NAME" "$GHP_REGISTRY" "$VERSION"; then
    ON_GHP=true
  fi
  
  if [ "$ON_NPM" = true ] && [ "$ON_GHP" = true ]; then
    echo "✅ Version $VERSION is already published to both registries."
    continue
  fi
  
  echo "⚠️  Version $VERSION is missing from: $( [ "$ON_NPM" = false ] && echo "NPM " || echo "" )$( [ "$ON_GHP" = false ] && echo "GitHubPackages" || echo "" )"
  
  if [ "$DRY_RUN" = "true" ]; then
    echo "ℹ️  [Dry Run] Would checkout $TAG and publish missing registries."
    continue
  fi
  
  echo "📥 Checking out $TAG..."
  git checkout "$TAG"
  
  # Build package
  echo "🔨 Building version $VERSION..."
  npm ci
  npm run build
  
  # Backup package.json
  cp package.json package.json.backup
  
  # 1. Publish to public NPM if missing
  if [ "$ON_NPM" = false ]; then
    echo "🚀 Publishing $PUBLIC_NAME@$VERSION to public NPM..."
    npm pkg set "name=$PUBLIC_NAME"
    npm pkg delete publishConfig
    
    npm publish --access=public --registry="$NPM_REGISTRY" --ignore-scripts --verbose
    
    # Restore package.json
    cp -f package.json.backup package.json
  fi
  
  # 2. Publish to GitHub Packages if missing
  if [ "$ON_GHP" = false ]; then
    echo "🚀 Publishing $SCOPED_NAME@$VERSION to GitHub Packages..."
    npm pkg set "name=$SCOPED_NAME"
    npm pkg set "publishConfig.registry=$GHP_REGISTRY"
    
    npm publish --registry="$GHP_REGISTRY" --ignore-scripts --verbose
    
    # Restore package.json
    cp -f package.json.backup package.json
  fi
  
  rm -f package.json.backup
done

echo "✅ Finished registry synchronization!"

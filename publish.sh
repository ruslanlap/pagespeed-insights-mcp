#!/bin/bash
set -e

# Check if GITHUB_TOKEN is set
if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ Error: GITHUB_TOKEN environment variable is not set"
  echo "Please set it with: export GITHUB_TOKEN=your_personal_access_token"
  exit 1
fi

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
echo "📦 Publishing version $VERSION"

# Build the package
echo "🔨 Building package..."
npm run build

# Save original package.json
cp package.json package.json.backup

# 1. Publish to npm
echo "🚀 Publishing to npm registry..."
npm publish

# 2. Prepare for GitHub Packages
echo "🔄 Preparing for GitHub Packages..."
sed -i 's/"name": "pagespeed-insights-mcp"/"name": "@ruslanlap\/pagespeed-insights-mcp"/g' package.json
sed -i '/"engines": {/a \  "publishConfig": {\n    "registry": "https:\/\/npm.pkg.github.com"\n  },' package.json

# 3. Publish to GitHub Packages
echo "🚀 Publishing to GitHub Packages..."
npm publish

# 4. Restore original package.json
echo "🔄 Restoring original package.json..."
mv package.json.backup package.json

echo ""
echo "✅ Successfully published to both registries!"
echo "📦 npm: https://www.npmjs.com/package/pagespeed-insights-mcp"
echo "📦 GitHub: https://github.com/ruslanlap/pagespeed-insights-mcp/packages"
echo ""
echo "📋 Installation instructions:"
echo "   npm: npm install pagespeed-insights-mcp@$VERSION"
echo "   GitHub: npm install @ruslanlap/pagespeed-insights-mcp@$VERSION"
echo "          (requires GitHub authentication)"


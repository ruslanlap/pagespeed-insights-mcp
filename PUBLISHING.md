# Publishing Guide

This document explains how to publish the PageSpeed Insights MCP package to both npm and GitHub Packages.

## Prerequisites

1. **npm account**: You need to be logged in to npm (`npm login`)
2. **GitHub Personal Access Token**: With `repo`, `write:packages`, and `read:packages` scopes

## Publishing to npm

```bash
# Ensure package.json has:
# - name: "pagespeed-insights-mcp" (no scope)
# - no publishConfig section

# Update version in package.json
npm version patch  # or minor, or major

# Build and publish
npm run build
npm publish
```

## Publishing to GitHub Packages

```bash
# 1. Temporarily modify package.json
# - Change name to "@ruslanlap/pagespeed-insights-mcp"
# - Add publishConfig section:
#   "publishConfig": {
#     "registry": "https://npm.pkg.github.com"
#   }

# 2. Set GitHub token
export GITHUB_TOKEN=your_personal_access_token

# 3. Publish to GitHub Packages
npm publish

# 4. Revert package.json changes for npm compatibility
```

## Automated Publishing Script

Create a `publish.sh` script for easier publishing:

```bash
#!/bin/bash
set -e

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
echo "Publishing version $VERSION"

# Build the package
npm run build

# 1. Publish to npm
echo "Publishing to npm..."
npm publish

# 2. Prepare for GitHub Packages
echo "Preparing for GitHub Packages..."
sed -i 's/"name": "pagespeed-insights-mcp"/"name": "@ruslanlap\/pagespeed-insights-mcp"/g' package.json
sed -i '/"engines": {/a \  "publishConfig": {\n    "registry": "https:\/\/npm.pkg.github.com"\n  },' package.json

# 3. Publish to GitHub Packages
echo "Publishing to GitHub Packages..."
npm publish

# 4. Revert changes
echo "Reverting package.json changes..."
sed -i 's/"name": "@ruslanlap\/pagespeed-insights-mcp"/"name": "pagespeed-insights-mcp"/g' package.json
sed -i '/  "publishConfig": {/,/  },/d' package.json

echo "✅ Successfully published to both npm and GitHub Packages!"
```

Make the script executable with `chmod +x publish.sh`

## Important Notes

1. **Version numbers**: Both registries will use the same version number
2. **README badges**: Your README currently has an npm badge - you may want to add a GitHub Packages badge too
3. **CI/CD**: For automated publishing, you'll need to set up GitHub Actions with secrets for both npm and GitHub tokens

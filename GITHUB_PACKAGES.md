# Installing from GitHub Packages

This guide explains how to install the PageSpeed Insights MCP package from GitHub Packages.

## Prerequisites

To install packages from GitHub Packages, you need:

1. A GitHub account
2. A Personal Access Token (PAT) with the `read:packages` scope

## Step 1: Create a GitHub Personal Access Token

1. Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name (e.g., "Read GitHub Packages")
4. Select the `read:packages` scope
5. Click "Generate token"
6. **Important**: Copy your token immediately as you won't be able to see it again

## Step 2: Configure npm to use GitHub Packages

Create or edit the `.npmrc` file in your project directory:

```
@ruslanlap:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

Replace `YOUR_GITHUB_TOKEN` with the token you created in Step 1.

## Step 3: Install the Package

```bash
npm install @ruslanlap/pagespeed-insights-mcp
```

Or specify a version:

```bash
npm install @ruslanlap/pagespeed-insights-mcp@1.0.2
```

## Alternative: Global Configuration

To configure npm globally to use GitHub Packages for all projects:

1. Create or edit the `.npmrc` file in your home directory:
   - Windows: `C:\Users\<username>\.npmrc`
   - macOS/Linux: `~/.npmrc`

2. Add the same configuration:
   ```
   @ruslanlap:registry=https://npm.pkg.github.com/
   //npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
   ```

## Troubleshooting

If you encounter a 404 error when installing, check that:

1. You have the correct token with `read:packages` scope
2. Your `.npmrc` file is correctly configured
3. You're using the scoped package name (`@ruslanlap/pagespeed-insights-mcp`)

For more information, see the [GitHub Packages documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry).

# Contributing to PageSpeed Insights MCP

Thank you for your interest in contributing to the PageSpeed Insights MCP server!

## Development Setup

1. **Clone the repository**
```bash
git clone https://github.com/ruslanlap/pagespeed-insights-mcp.git
cd pagespeed-insights-mcp
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment**
```bash
# Create .env file with your Google API key
echo "GOOGLE_API_KEY=your-api-key-here" > .env
```

4. **Build and test**
```bash
npm run build
npm run dev  # For development mode
```

## Project Structure

```
pagespeed-mcp/
├── src/
│   ├── index.ts          # Main MCP server implementation
│   └── types.ts          # TypeScript type definitions
├── examples/             # Configuration examples
├── dist/                 # Compiled JavaScript (generated)
├── install.sh           # Auto-installation script
├── Dockerfile           # Docker container setup
└── docker-compose.yml   # Docker Compose configuration
```

## Making Changes

1. **Create a feature branch**
```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes**
   - Follow the existing code style
   - Add TypeScript types for new functionality
   - Update documentation as needed

3. **Test your changes**
```bash
npm run build
# Test with a local Claude Desktop setup
```

4. **Submit a pull request**
   - Describe your changes clearly
   - Include examples if adding new features
   - Update README.md if necessary

## Guidelines

- **Code Style**: Follow the existing TypeScript/Node.js conventions
- **Error Handling**: All API calls should have proper error handling
- **Documentation**: Update README.md for user-facing changes
- **Backwards Compatibility**: Don't break existing functionality without good reason

## Adding New Features

When adding new tools or functionality:

1. Update `src/types.ts` with new type definitions
2. Add the tool definition in the `ListToolsRequestSchema` handler
3. Implement the tool logic in the `CallToolRequestSchema` handler
4. Add examples to the README.md
5. Test with various PageSpeed Insights API scenarios

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md (if exists)
3. Create a release tag
4. Publish to npm (maintainers only)

## Getting Help

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- Provide detailed information about your environment and steps to reproduce

Thank you for contributing! 🚀
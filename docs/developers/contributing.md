# Contributing Guide

Thank you for your interest in contributing to the PageSpeed Insights MCP Server! We welcome contributions from the community.

## Development Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/ruslanlap/pagespeed-insights-mcp.git
    cd pagespeed-insights-mcp
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment**:
    Create a `.env` file or export the required variables:
    ```bash
    export GOOGLE_API_KEY=your_test_key
    ```

## Development Workflow

### Running Locally
To run the server in development mode with hot-reloading:

```bash
npm run dev
```

This uses `tsx` to run the TypeScript code directly.

### Building
To build the project for production:

```bash
npm run build
```

This compiles the TypeScript code to JavaScript in the `dist/` directory.

## Testing

We use **Vitest** for testing.

*   **Run all tests**:
    ```bash
    npm test
    ```

*   **Run tests with coverage**:
    ```bash
    npm run test:coverage
    ```

Please ensure that any new features or bug fixes are accompanied by appropriate tests.

## Code Style

We use **ESLint** and **Prettier** to maintain code quality.

*   **Lint code**:
    ```bash
    npm run lint
    ```

*   **Fix linting issues**:
    ```bash
    npm run lint:fix
    ```

*   **Format code**:
    ```bash
    npm run format
    ```

## Submitting a Pull Request

1.  Fork the repository.
2.  Create a new branch for your feature or fix: `git checkout -b feature/amazing-feature`.
3.  Commit your changes with clear messages.
4.  Push to your fork.
5.  Open a Pull Request against the `master` branch.

## Release Process

This project uses **Semantic Release** to automate versioning and publishing. Ensure your commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) specification (e.g., `feat: add new tool`, `fix: handle api error`).

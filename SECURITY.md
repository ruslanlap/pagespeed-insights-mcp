# Security Policy

## Supported Versions

Only the latest minor release line receives security updates.

| Version | Supported |
|---------|-----------|
| 1.1.x   | ✅        |
| < 1.1   | ❌        |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security problems.**

If you believe you have found a security vulnerability in `pagespeed-insights-mcp`, report it privately via one of:

- GitHub's [Private Vulnerability Reporting](https://github.com/ruslanlap/pagespeed-insights-mcp/security/advisories/new) for this repository (preferred).
- Email the maintainer listed in `package.json` / GitHub profile.

Please include:

- A clear description of the issue and its impact.
- Steps to reproduce, ideally with a minimal proof of concept.
- The affected version(s).
- Any suggested remediation, if you have one.

### Response timeline

- **Acknowledgement:** within 5 business days.
- **Initial assessment:** within 10 business days.
- **Fix or mitigation plan:** communicated as soon as the severity and scope are understood.

We will credit reporters in the release notes unless anonymity is requested.

## Out of Scope

This project is an MCP server that calls the Google PageSpeed Insights and Chrome UX Report APIs. The following are **not** considered in scope:

- Vulnerabilities in Google's APIs themselves.
- Issues that require attacker-controlled `GOOGLE_API_KEY` to exploit (the key is a secret managed by the operator).
- Denial of service caused by Google API quota exhaustion.
- Findings against the demo HTML page hosted on GitHub Pages.

## Hardening Notes for Operators

- Treat `GOOGLE_API_KEY` as a secret. Never commit it to source control. Use `.env`, your shell, or your MCP client's secret store.
- The server is designed for `stdio` transport; do not expose its standard streams over the network without your own authentication layer.
- Restrict your Google API key to the PageSpeed Insights and Chrome UX Report APIs in the Google Cloud Console.

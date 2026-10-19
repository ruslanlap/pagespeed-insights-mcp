import type { Prompt, PromptMessage } from "@modelcontextprotocol/sdk/types.js";

/** Built-in MCP Prompts surface for PageSpeed Insights workflows. */
export const PROMPTS: Prompt[] = [
  {
    name: "performance-audit",
    title: "Performance Audit & Remediation Plan",
    description: "Deep dive audit of a webpage with Lighthouse lab metrics, CrUX field data, and prioritized remediation actions.",
    arguments: [
      {
        name: "url",
        description: "Public URL to analyze (e.g., https://example.com/checkout)",
        required: true,
      },
      {
        name: "strategy",
        description: "Device profile to analyze: mobile or desktop (default: mobile)",
        required: false,
      },
    ],
  },
  {
    name: "release-comparison",
    title: "Release Performance Comparison (Go / No-Go)",
    description: "Compare production vs staging/preview URL to verify whether recent changes caused Core Web Vitals regressions.",
    arguments: [
      {
        name: "productionUrl",
        description: "Current production URL (baseline)",
        required: true,
      },
      {
        name: "stagingUrl",
        description: "Staging, preview, or PR branch deployment URL to compare against production",
        required: true,
      },
      {
        name: "strategy",
        description: "Device profile: mobile or desktop (default: mobile)",
        required: false,
      },
    ],
  },
  {
    name: "core-web-vitals-deepdive",
    title: "Core Web Vitals Field vs Lab Investigation",
    description: "Analyze Chrome UX Report (CrUX) 28-day real-user field metrics against Lighthouse synthetic lab simulation to diagnose user experience discrepancies.",
    arguments: [
      {
        name: "url",
        description: "Target URL (or bare origin) to inspect real-user Core Web Vitals",
        required: true,
      },
      {
        name: "scope",
        description: "Field data scope: page (specific URL) or origin (domain aggregate). Default: page",
        required: false,
      },
    ],
  },
];

export function getPrompt(
  name: string,
  args?: Record<string, string>
): { description?: string; messages: PromptMessage[] } {
  switch (name) {
    case "performance-audit": {
      const url = args?.url;
      if (!url) throw new Error("Argument 'url' is required for prompt 'performance-audit'");
      const strategy = args?.strategy || "mobile";
      return {
        description: `Performance audit and remediation plan for ${url} (${strategy})`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please conduct a rigorous web performance audit and create a prioritized remediation plan for ${url} (device strategy: ${strategy}).

Follow this structured investigation workflow:
1. **Health Check**: Call \`pagespeed_analyze_page\` with \`url="${url}"\`, \`strategy="${strategy}"\`, \`report="summary"\` to get initial Lighthouse scores and Core Web Vitals.
2. **Real-User Field Experience**: Call \`pagespeed_get_field_data\` with \`url="${url}"\`, \`scope="page"\` to evaluate actual Chrome 28-day user percentiles (p75 LCP, INP, CLS).
3. **Deep Diagnostic**: Based on the weakest CWV metric, invoke \`pagespeed_diagnose_page\` using the most relevant focus (e.g. \`render-blocking\` if LCP/FCP is poor, \`javascript\` if TBT/INP is poor, or \`elements\` if CLS is poor).
4. **Actionable Recommendations**: Call \`pagespeed_analyze_page\` with \`report="recommendations"\` to get concrete code changes with estimated millisecond savings.
5. **Executive Summary & Action Plan**:
   - High-level score summary table (Lighthouse vs CrUX field data)
   - Top 3 critical bottlenecks identified
   - Prioritized engineering remediation checklist (Quick Wins vs Structural Architectural Changes)`,
            },
          },
        ],
      };
    }
    case "release-comparison": {
      const productionUrl = args?.productionUrl;
      const stagingUrl = args?.stagingUrl;
      if (!productionUrl || !stagingUrl) {
        throw new Error(
          "Arguments 'productionUrl' and 'stagingUrl' are required for prompt 'release-comparison'"
        );
      }
      const strategy = args?.strategy || "mobile";
      return {
        description: `Release performance comparison: ${stagingUrl} vs ${productionUrl} (${strategy})`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please perform a pre-release performance regression analysis comparing the new deployment with the current production environment.

Target URLs:
- **Baseline (Production)**: ${productionUrl}
- **Candidate (Staging / PR preview)**: ${stagingUrl}
- **Strategy**: ${strategy}

Execution Plan:
1. Run \`pagespeed_compare_pages\` with \`mode="pages"\`, \`url="${productionUrl}"\`, \`against="${stagingUrl}"\`, \`strategy="${strategy}"\`.
2. Inspect directional differences in Performance Score, LCP, TBT, CLS, FCP, and Speed Index.
3. If regressions are detected, call \`pagespeed_diagnose_page\` on ${stagingUrl} focusing on the regressed area (e.g. \`javascript\` or \`render-blocking\`).
4. Provide a definitive **Release Recommendation (GO / NO-GO)** with a markdown table comparing both environments and highlighting any metric degradations.`,
            },
          },
        ],
      };
    }
    case "core-web-vitals-deepdive": {
      const url = args?.url;
      if (!url) throw new Error("Argument 'url' is required for prompt 'core-web-vitals-deepdive'");
      const scope = args?.scope || "page";
      return {
        description: `Core Web Vitals deep dive for ${url} (scope: ${scope})`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please perform an in-depth Core Web Vitals investigation for ${url} (scope: ${scope}).

Investigation Steps:
1. Retrieve 28-day Chrome User Experience Report (CrUX) metrics using \`pagespeed_get_field_data\` with \`url="${url}"\`, \`scope="${scope}"\`.
2. Retrieve synthetic Lighthouse lab metrics using \`pagespeed_analyze_page\` with \`url="${url}"\`, \`report="summary"\`.
3. Compare Lab vs Field: Explain any divergence between real-user experience and synthetic simulations (e.g. device distribution, network latency variations, or cold-cache vs warm-cache traffic).
4. For any failing metric (LCP > 2.5s, INP > 200ms, CLS > 0.1), identify the root causes:
   - For LCP: run \`pagespeed_diagnose_page\` with \`focus="elements"\` and \`focus="render-blocking"\`.
   - For INP / TBT: run \`pagespeed_diagnose_page\` with \`focus="javascript"\` and \`focus="third-parties"\`.
   - For CLS: run \`pagespeed_diagnose_page\` with \`focus="elements"\`.
5. Deliver a Core Web Vitals scorecard with explicit pass/needs improvement/poor ratings and developer remediation steps.`,
            },
          },
        ],
      };
    }
    default:
      throw new Error(`Unknown prompt '${name}'. Available prompts: ${PROMPTS.map((p) => p.name).join(", ")}`);
  }
}

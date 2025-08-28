export interface PageSpeedInsightsRequest {
  url: string;
  strategy?: 'mobile' | 'desktop';
  category?: ('performance' | 'accessibility' | 'best-practices' | 'seo' | 'pwa')[];
  locale?: string;
}

export interface PageSpeedInsightsResponse {
  captchaResult?: string;
  kind?: string;
  id?: string;
  loadingExperience?: {
    id: string;
    metrics: Record<string, any>;
    overall_category: string;
    initial_url: string;
  };
  originLoadingExperience?: {
    id: string;
    metrics: Record<string, any>;
    overall_category: string;
    initial_url: string;
  };
  lighthouseResult?: {
    requestedUrl: string;
    finalUrl: string;
    lighthouseVersion: string;
    userAgent: string;
    fetchTime: string;
    environment: Record<string, any>;
    runWarnings: string[];
    configSettings: Record<string, any>;
    audits: Record<string, any>;
    categories: Record<string, {
      id: string;
      title: string;
      score: number;
      auditRefs: Array<{
        id: string;
        weight: number;
        group?: string;
      }>;
    }>;
    categoryGroups: Record<string, any>;
    timing: Record<string, number>;
  };
  analysisUTCTimestamp?: string;
}

export interface MCP_Config {
  apiKey?: string;
}
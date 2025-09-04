export interface PageSpeedInsightsRequest {
  url: string;
  strategy?: 'mobile' | 'desktop';
  category?: ('performance' | 'accessibility' | 'best-practices' | 'seo' | 'pwa')[];
  locale?: string;
}

export interface CruxRecord {
  record?: {
    key: {
      url: string;
      formFactor: string;
    };
    metrics: {
      [key: string]: {
        histogram: Array<{
          start: number;
          end?: number;
          density: number;
        }>;
        percentiles: {
          p75: number;
          p50?: number;
          p25?: number;
        };
      };
    };
  };
}

export interface PerformanceBudget {
  lcp?: number;
  fid?: number;
  cls?: number;
  fcp?: number;
  si?: number;
  tbt?: number;
}

export interface ComparisonResult {
  urlA: string;
  urlB: string;
  strategy: string;
  comparison: {
    scores: {
      urlA: number;
      urlB: number;
      difference: number;
    };
    metrics: {
      [key: string]: {
        urlA: string | number;
        urlB: string | number;
        better: 'A' | 'B' | 'tie';
      };
    };
  };
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

export interface AnalyzePageSpeedInput {
  url: string;
  strategy: 'mobile' | 'desktop';
  category?: ('performance' | 'accessibility' | 'best-practices' | 'seo' | 'pwa')[];
  locale: string;
}

export interface CruxSummaryInput {
  url: string;
  formFactor?: 'PHONE' | 'DESKTOP' | 'TABLET';
}

export interface CompareUrlsInput {
  urlA: string;
  urlB: string;
  strategy: 'mobile' | 'desktop';
  categories?: ('performance' | 'accessibility' | 'best-practices' | 'seo' | 'pwa')[];
}
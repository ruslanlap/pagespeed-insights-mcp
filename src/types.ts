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
    audits: Record<string, LighthouseAudit>;
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
    stackPacks?: StackPack[];
  };
  analysisUTCTimestamp?: string;
}

// Detailed Lighthouse Audit structure
export interface LighthouseAudit {
  id: string;
  title: string;
  description: string;
  score: number | null;
  scoreDisplayMode: string;
  displayValue?: string;
  explanation?: string;
  errorMessage?: string;
  warnings?: string[];
  numericValue?: number;
  numericUnit?: string;
  details?: AuditDetails;
}

// Audit Details structures
export interface AuditDetails {
  type: string;
  headings?: TableHeading[];
  items?: any[];
  overallSavingsMs?: number;
  overallSavingsBytes?: number;
  debugData?: any;
  chains?: CriticalRequestChain;
  longestChain?: ChainSummary;
  scale?: number;
  data?: string; // For screenshots (base64)
  timing?: number;
  timestamp?: number;
  nodes?: Record<string, NodeDetails>;
  screenshot?: ScreenshotData;
  filmstrip?: FilmstripFrame[];
}

export interface TableHeading {
  key: string;
  itemType: string;
  text: string;
  displayUnit?: string;
  granularity?: number;
}

// Element/Node structures
export interface ElementNode {
  type: 'node';
  lhId?: string;
  path?: string;
  selector: string;
  boundingRect?: BoundingRect;
  snippet: string;
  nodeLabel?: string;
  explanation?: string;
}

export interface BoundingRect {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

export interface NodeDetails {
  type: string;
  selector: string;
  snippet: string;
  boundingRect?: BoundingRect;
}

// Network/Resource structures
export interface NetworkRequest {
  url: string;
  protocol?: string;
  startTime: number;
  endTime: number;
  finished?: boolean;
  transferSize: number;
  resourceSize: number;
  statusCode: number;
  mimeType: string;
  resourceType: string;
  priority?: string;
  experimentalFromMainFrame?: boolean;
}

export interface ResourceSummaryItem {
  resourceType: string;
  requestCount: number;
  transferSize: number;
}

export interface CriticalRequestChain {
  [key: string]: ChainNode;
}

export interface ChainNode {
  request: {
    url: string;
    startTime: number;
    endTime: number;
    responseReceivedTime?: number;
    transferSize: number;
  };
  children?: CriticalRequestChain;
}

export interface ChainSummary {
  duration: number;
  length: number;
  transferSize: number;
}

// JavaScript Analysis structures
export interface JavaScriptExecutionItem {
  url: string;
  total: number;
  scripting: number;
  scriptParseCompile: number;
}

export interface MainThreadWorkItem {
  group: string;
  groupLabel: string;
  duration: number;
}

export interface UnusedResourceItem {
  url: string;
  totalBytes: number;
  wastedBytes: number;
  wastedPercent: number;
}

export interface DuplicatedJavaScriptItem {
  url: string;
  wastedBytes: number;
  sources?: string[];
}

// Image Optimization structures
export interface ImageOptimizationItem {
  url: string;
  totalBytes: number;
  wastedBytes: number;
  wastedPercent: number;
  node?: ElementNode;
  isCrossOrigin?: boolean;
  wastedWebpBytes?: number;
}

// Third-party structures
export interface ThirdPartySummaryItem {
  entity: string;
  transferSize: number;
  blockingTime: number;
  mainThreadTime: number;
  subItems?: {
    items: ThirdPartyResourceItem[];
  };
}

export interface ThirdPartyResourceItem {
  url: string;
  transferSize: number;
  blockingTime: number;
  mainThreadTime: number;
}

// Screenshot/Visual structures
export interface ScreenshotData {
  data: string; // base64
  width: number;
  height: number;
}

export interface FilmstripFrame {
  timing: number;
  timestamp: number;
  data: string; // base64
}

// Stack Pack structures
export interface StackPack {
  id: string;
  title: string;
  iconDataURL: string;
  descriptions: Record<string, string>;
}

// Vulnerability structures
export interface VulnerableLibrary {
  detectedLib: {
    text: string;
    url: string;
    type: string;
  };
  vulnCount: number;
  highestSeverity: string;
}

// Font structures
export interface FontDisplayItem {
  url: string;
  wastedMs: number;
}

// DOM structures
export interface DomSizeItem {
  statistic: string;
  value: number;
  node?: ElementNode;
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
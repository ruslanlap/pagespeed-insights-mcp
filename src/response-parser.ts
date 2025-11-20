import type {
  PageSpeedInsightsResponse,
  LighthouseAudit,
  ElementNode,
  NetworkRequest,
  JavaScriptExecutionItem,
  MainThreadWorkItem,
  ImageOptimizationItem,
  ThirdPartySummaryItem,
  UnusedResourceItem,
  FilmstripFrame,
  ScreenshotData,
} from "./types.js";

/**
 * Utility class for parsing PageSpeed Insights API responses
 * Safely extracts nested data with fallbacks
 */
export class ResponseParser {
  /**
   * Extract visual analysis data (screenshots, filmstrip)
   */
  static extractVisualData(response: PageSpeedInsightsResponse) {
    const audits = response.lighthouseResult?.audits || {};
    
    const visualData = {
      finalScreenshot: null as ScreenshotData | null,
      filmstrip: [] as FilmstripFrame[],
      fullPageScreenshot: null as { screenshot: ScreenshotData; nodes: Record<string, any> } | null,
    };

    // Final screenshot
    const finalScreenshotAudit = audits['final-screenshot'];
    if (finalScreenshotAudit?.details?.data) {
      const details = finalScreenshotAudit.details as any;
      visualData.finalScreenshot = {
        data: details.data,
        width: details.width || 360,
        height: details.height || 640,
      };
    }

    // Screenshot thumbnails (filmstrip)
    const thumbnailsAudit = audits['screenshot-thumbnails'];
    if (thumbnailsAudit?.details?.items) {
      visualData.filmstrip = thumbnailsAudit.details.items.map((item: any) => ({
        timing: item.timing || 0,
        timestamp: item.timestamp || 0,
        data: item.data || '',
      }));
    }

    // Full page screenshot
    const fullPageAudit = audits['full-page-screenshot'];
    if (fullPageAudit?.details?.screenshot) {
      visualData.fullPageScreenshot = {
        screenshot: {
          data: fullPageAudit.details.screenshot.data,
          width: fullPageAudit.details.screenshot.width,
          height: fullPageAudit.details.screenshot.height,
        },
        nodes: fullPageAudit.details.nodes || {},
      };
    }

    return visualData;
  }

  /**
   * Extract element-level performance data
   */
  static extractElementData(response: PageSpeedInsightsResponse) {
    const audits = response.lighthouseResult?.audits || {};
    
    const elementData = {
      lcpElement: null as ElementNode | null,
      clsElements: [] as Array<{ node: ElementNode; score: number }>,
      lazyLoadedLcp: null as ElementNode | null,
    };

    // LCP element
    const lcpAudit = audits['largest-contentful-paint-element'];
    if (lcpAudit?.details?.items?.[0]?.node) {
      elementData.lcpElement = this.normalizeNode(lcpAudit.details.items[0].node);
    }

    // Layout shift elements
    const layoutShiftAudit = audits['layout-shift-elements'];
    if (layoutShiftAudit?.details?.items) {
      elementData.clsElements = layoutShiftAudit.details.items
        .filter((item: any) => item.node)
        .map((item: any) => ({
          node: this.normalizeNode(item.node),
          score: item.score || 0,
        }));
    }

    // Lazy loaded LCP
    const lazyLcpAudit = audits['lcp-lazy-loaded'];
    if (lazyLcpAudit?.details?.items?.[0]?.node) {
      elementData.lazyLoadedLcp = this.normalizeNode(lazyLcpAudit.details.items[0].node);
    }

    return elementData;
  }

  /**
   * Extract network waterfall and resource data
   */
  static extractNetworkData(response: PageSpeedInsightsResponse) {
    const audits = response.lighthouseResult?.audits || {};
    
    const networkData = {
      requests: [] as NetworkRequest[],
      resourceSummary: [] as Array<{ resourceType: string; count: number; size: number }>,
      totalByteWeight: 0,
      requestCount: 0,
      rtt: null as number | null,
      serverLatency: null as number | null,
    };

    // Network requests
    const networkAudit = audits['network-requests'];
    if (networkAudit?.details?.items) {
      networkData.requests = networkAudit.details.items.map((item: any) => ({
        url: item.url || '',
        protocol: item.protocol,
        startTime: item.startTime || 0,
        endTime: item.endTime || 0,
        finished: item.finished !== false,
        transferSize: item.transferSize || 0,
        resourceSize: item.resourceSize || 0,
        statusCode: item.statusCode || 0,
        mimeType: item.mimeType || '',
        resourceType: item.resourceType || '',
        priority: item.priority,
        experimentalFromMainFrame: item.experimentalFromMainFrame,
      }));
      networkData.requestCount = networkData.requests.length;
    }

    // Resource summary
    const resourceAudit = audits['resource-summary'];
    if (resourceAudit?.details?.items) {
      networkData.resourceSummary = resourceAudit.details.items.map((item: any) => ({
        resourceType: item.resourceType || '',
        count: item.requestCount || 0,
        size: item.transferSize || 0,
      }));
    }

    // Total byte weight
    const byteWeightAudit = audits['total-byte-weight'];
    if (byteWeightAudit?.numericValue) {
      networkData.totalByteWeight = byteWeightAudit.numericValue;
    }

    // Network RTT
    const rttAudit = audits['network-rtt'];
    if (rttAudit?.numericValue !== undefined) {
      networkData.rtt = rttAudit.numericValue;
    }

    // Server latency
    const serverLatencyAudit = audits['network-server-latency'];
    if (serverLatencyAudit?.numericValue !== undefined) {
      networkData.serverLatency = serverLatencyAudit.numericValue;
    }

    return networkData;
  }

  /**
   * Extract JavaScript execution analysis
   */
  static extractJavaScriptData(response: PageSpeedInsightsResponse) {
    const audits = response.lighthouseResult?.audits || {};
    
    const jsData = {
      bootupTime: [] as JavaScriptExecutionItem[],
      mainThreadWork: [] as MainThreadWorkItem[],
      unusedJavaScript: [] as UnusedResourceItem[],
      duplicatedJavaScript: [] as Array<{ source: string; totalBytes: number; wastedBytes: number }>,
      legacyJavaScript: [] as Array<{ url: string; wastedBytes: number; signals: string[] }>,
    };

    // Bootup time
    const bootupAudit = audits['bootup-time'];
    if (bootupAudit?.details?.items) {
      jsData.bootupTime = bootupAudit.details.items.map((item: any) => ({
        url: item.url || '',
        total: item.total || 0,
        scripting: item.scripting || 0,
        scriptParseCompile: item.scriptParseCompile || 0,
      }));
    }

    // Main thread work breakdown
    const mainThreadAudit = audits['mainthread-work-breakdown'];
    if (mainThreadAudit?.details?.items) {
      jsData.mainThreadWork = mainThreadAudit.details.items.map((item: any) => ({
        group: item.group || '',
        groupLabel: item.groupLabel || '',
        duration: item.duration || 0,
      }));
    }

    // Unused JavaScript
    const unusedJsAudit = audits['unused-javascript'];
    if (unusedJsAudit?.details?.items) {
      jsData.unusedJavaScript = unusedJsAudit.details.items.map((item: any) => ({
        url: item.url || '',
        totalBytes: item.totalBytes || 0,
        wastedBytes: item.wastedBytes || 0,
        wastedPercent: item.wastedPercent || 0,
      }));
    }

    // Duplicated JavaScript
    const duplicatedJsAudit = audits['duplicated-javascript'];
    if (duplicatedJsAudit?.details?.items) {
      jsData.duplicatedJavaScript = duplicatedJsAudit.details.items.map((item: any) => ({
        source: item.source || item.url || '',
        totalBytes: item.totalBytes || 0,
        wastedBytes: item.wastedBytes || 0,
      }));
    }

    // Legacy JavaScript
    const legacyJsAudit = audits['legacy-javascript'];
    if (legacyJsAudit?.details?.items) {
      jsData.legacyJavaScript = legacyJsAudit.details.items.map((item: any) => ({
        url: item.url || '',
        wastedBytes: item.wastedBytes || 0,
        signals: item.subItems?.items?.map((subItem: any) => subItem.signal || '') || [],
      }));
    }

    return jsData;
  }

  /**
   * Extract image optimization opportunities
   */
  static extractImageOptimizationData(response: PageSpeedInsightsResponse) {
    const audits = response.lighthouseResult?.audits || {};
    
    const imageData = {
      responsiveImages: [] as ImageOptimizationItem[],
      offscreenImages: [] as ImageOptimizationItem[],
      unoptimizedImages: [] as ImageOptimizationItem[],
      modernFormats: [] as ImageOptimizationItem[],
    };

    // Responsive images
    const responsiveAudit = audits['uses-responsive-images'];
    if (responsiveAudit?.details?.items) {
      imageData.responsiveImages = responsiveAudit.details.items.map((item: any) => ({
        url: item.url || '',
        totalBytes: item.totalBytes || 0,
        wastedBytes: item.wastedBytes || 0,
        wastedPercent: item.wastedPercent || 0,
        node: item.node ? this.normalizeNode(item.node) : undefined,
      }));
    }

    // Offscreen images
    const offscreenAudit = audits['offscreen-images'];
    if (offscreenAudit?.details?.items) {
      imageData.offscreenImages = offscreenAudit.details.items.map((item: any) => ({
        url: item.url || '',
        totalBytes: item.totalBytes || 0,
        wastedBytes: item.wastedBytes || 0,
        wastedPercent: item.wastedPercent || 0,
        node: item.node ? this.normalizeNode(item.node) : undefined,
      }));
    }

    // Unoptimized images
    const unoptimizedAudit = audits['uses-optimized-images'];
    if (unoptimizedAudit?.details?.items) {
      imageData.unoptimizedImages = unoptimizedAudit.details.items.map((item: any) => ({
        url: item.url || '',
        totalBytes: item.totalBytes || 0,
        wastedBytes: item.wastedBytes || 0,
        wastedPercent: item.wastedPercent || 0,
        isCrossOrigin: item.isCrossOrigin,
        wastedWebpBytes: item.wastedWebpBytes,
      }));
    }

    // Modern image formats
    const modernFormatsAudit = audits['modern-image-formats'];
    if (modernFormatsAudit?.details?.items) {
      imageData.modernFormats = modernFormatsAudit.details.items.map((item: any) => ({
        url: item.url || '',
        totalBytes: item.totalBytes || 0,
        wastedBytes: item.wastedBytes || 0,
        wastedPercent: item.wastedPercent || 0,
        wastedWebpBytes: item.wastedWebpBytes,
      }));
    }

    return imageData;
  }

  /**
   * Extract render-blocking resources
   */
  static extractRenderBlockingData(response: PageSpeedInsightsResponse) {
    const audits = response.lighthouseResult?.audits || {};
    
    const renderBlockingData = {
      resources: [] as Array<{ url: string; totalBytes: number; wastedMs: number }>,
      totalWastedMs: 0,
      criticalChains: null as any,
    };

    // Render blocking resources
    const renderBlockingAudit = audits['render-blocking-resources'];
    if (renderBlockingAudit?.details?.items) {
      renderBlockingData.resources = renderBlockingAudit.details.items.map((item: any) => ({
        url: item.url || '',
        totalBytes: item.totalBytes || 0,
        wastedMs: item.wastedMs || 0,
      }));
      renderBlockingData.totalWastedMs = renderBlockingAudit.details.overallSavingsMs || 0;
    }

    // Critical request chains
    const criticalChainsAudit = audits['critical-request-chains'];
    if (criticalChainsAudit?.details) {
      renderBlockingData.criticalChains = criticalChainsAudit.details;
    }

    return renderBlockingData;
  }

  /**
   * Extract third-party impact data
   */
  static extractThirdPartyData(response: PageSpeedInsightsResponse) {
    const audits = response.lighthouseResult?.audits || {};
    
    const thirdPartyData = {
      summary: [] as ThirdPartySummaryItem[],
      totalBlockingTime: 0,
      totalTransferSize: 0,
      facades: [] as Array<{ product: string; transferSize: number; blockingTime: number }>,
    };

    // Third party summary
    const summaryAudit = audits['third-party-summary'];
    if (summaryAudit?.details?.items) {
      thirdPartyData.summary = summaryAudit.details.items.map((item: any) => ({
        entity: item.entity || '',
        transferSize: item.transferSize || 0,
        blockingTime: item.blockingTime || 0,
        mainThreadTime: item.mainThreadTime || 0,
        subItems: item.subItems,
      }));
      
      // Calculate totals
      thirdPartyData.totalTransferSize = thirdPartyData.summary.reduce((sum, item) => sum + item.transferSize, 0);
      thirdPartyData.totalBlockingTime = thirdPartyData.summary.reduce((sum, item) => sum + item.blockingTime, 0);
    }

    // Third party facades
    const facadesAudit = audits['third-party-facades'];
    if (facadesAudit?.details?.items) {
      thirdPartyData.facades = facadesAudit.details.items.map((item: any) => ({
        product: item.product || '',
        transferSize: item.transferSize || 0,
        blockingTime: item.blockingTime || 0,
      }));
    }

    return thirdPartyData;
  }

  /**
   * Extract other category scores and key audits
   */
  static extractOtherCategories(response: PageSpeedInsightsResponse) {
    const categories = response.lighthouseResult?.categories || {};
    const audits = response.lighthouseResult?.audits || {};
    
    const categoryData = {
      accessibility: {
        score: categories.accessibility?.score || null,
        keyAudits: [] as Array<{ id: string; title: string; score: number | null; description?: string }>,
      },
      seo: {
        score: categories.seo?.score || null,
        keyAudits: [] as Array<{ id: string; title: string; score: number | null; description?: string }>,
      },
      bestPractices: {
        score: categories['best-practices']?.score || null,
        keyAudits: [] as Array<{ id: string; title: string; score: number | null; description?: string }>,
      },
      pwa: {
        score: categories.pwa?.score || null,
        keyAudits: [] as Array<{ id: string; title: string; score: number | null; description?: string }>,
      },
    };

    // Extract key failing audits for each category
    Object.entries(categoryData).forEach(([categoryKey, categoryInfo]) => {
      const category = categories[categoryKey === 'bestPractices' ? 'best-practices' : categoryKey];
      if (category?.auditRefs) {
        const failingAudits = category.auditRefs
          .filter(ref => {
            const audit = audits[ref.id];
            return audit && audit.score !== null && audit.score < 1;
          })
          .map(ref => {
            const audit = audits[ref.id];
            return {
              id: ref.id,
              title: audit.title || ref.id,
              score: audit.score,
              description: audit.description,
            };
          })
          .slice(0, 5); // Top 5 failing audits
        
        categoryInfo.keyAudits = failingAudits;
      }
    });

    return categoryData;
  }

  /**
   * Helper to normalize node data
   */
  private static normalizeNode(node: any): ElementNode {
    return {
      type: 'node',
      lhId: node.lhId,
      path: node.path,
      selector: node.selector || '',
      boundingRect: node.boundingRect,
      snippet: node.snippet || '',
      nodeLabel: node.nodeLabel,
      explanation: node.explanation,
    };
  }

  /**
   * Extract all detailed metrics
   */
  static extractDetailedMetrics(response: PageSpeedInsightsResponse) {
    const audits = response.lighthouseResult?.audits || {};
    const metrics = audits.metrics?.details?.items?.[0] || {};
    
    return {
      // Core Web Vitals
      firstContentfulPaint: metrics.firstContentfulPaint || audits['first-contentful-paint']?.numericValue,
      largestContentfulPaint: metrics.largestContentfulPaint || audits['largest-contentful-paint']?.numericValue,
      cumulativeLayoutShift: metrics.cumulativeLayoutShift || audits['cumulative-layout-shift']?.numericValue,
      totalBlockingTime: metrics.totalBlockingTime || audits['total-blocking-time']?.numericValue,
      maxPotentialFID: metrics.maxPotentialFID || audits['max-potential-fid']?.numericValue,
      
      // Other metrics
      speedIndex: metrics.speedIndex || audits['speed-index']?.numericValue,
      timeToInteractive: metrics.interactive || audits['interactive']?.numericValue,
      firstMeaningfulPaint: metrics.firstMeaningfulPaint,
      
      // Observed metrics (field data simulation)
      observedFirstContentfulPaint: metrics.observedFirstContentfulPaint,
      observedLargestContentfulPaint: metrics.observedLargestContentfulPaint,
      observedSpeedIndex: metrics.observedSpeedIndex,
      observedDomContentLoaded: metrics.observedDomContentLoaded,
      observedLoad: metrics.observedLoad,
      
      // Additional timing
      observedNavigationStart: metrics.observedNavigationStart,
      observedTimeOrigin: metrics.observedTimeOrigin,
      observedTraceEnd: metrics.observedTraceEnd,
    };
  }
}
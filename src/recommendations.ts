import type { PageSpeedInsightsResponse } from "./types.js";

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  priority: number; // 1-100 score
  category: 'performance' | 'ux' | 'seo' | 'accessibility';
  potentialSavings?: string;
  howToFix: string[];
  moreInfo?: string;
}

export interface RecommendationReport {
  url: string;
  strategy: string;
  overallScore: number;
  recommendations: Recommendation[];
  quickWins: Recommendation[];
  summary: {
    totalRecommendations: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
    estimatedImpact: string;
  };
}

export class PerformanceRecommendationsEngine {
  private readonly auditMappings = new Map<string, Partial<Recommendation>>([
    // Performance audits
    ['unused-css-rules', {
      title: '🎨 Remove unused CSS',
      impact: 'medium',
      effort: 'medium',
      category: 'performance',
      howToFix: [
        'Use tools like PurgeCSS or UnCSS to remove unused styles',
        'Split CSS by page/component to reduce bundle size',
        'Use critical CSS for above-the-fold content',
        'Consider CSS-in-JS solutions for dynamic styling'
      ],
      moreInfo: 'Removing unused CSS can significantly reduce file sizes and improve loading times'
    }],
    ['unused-javascript', {
      title: '⚡ Remove unused JavaScript',
      impact: 'high',
      effort: 'medium',
      category: 'performance',
      howToFix: [
        'Use tree-shaking with modern bundlers (Webpack, Rollup, Vite)',
        'Split code by routes/pages using dynamic imports',
        'Remove dead code and unused libraries',
        'Use bundle analyzers to identify large unused dependencies'
      ],
      moreInfo: 'JavaScript is the most expensive resource - removing unused code has immediate impact'
    }],
    ['render-blocking-resources', {
      title: '🚫 Eliminate render-blocking resources',
      impact: 'high',
      effort: 'low',
      category: 'performance',
      howToFix: [
        'Inline critical CSS in <head>',
        'Load non-critical CSS asynchronously with rel="preload"',
        'Defer non-critical JavaScript',
        'Use resource hints like dns-prefetch and preconnect'
      ],
      moreInfo: 'Render-blocking resources delay First Contentful Paint'
    }],
    ['unminified-css', {
      title: '🗜️ Minify CSS',
      impact: 'low',
      effort: 'low',
      category: 'performance',
      howToFix: [
        'Use CSS minification tools (cssnano, clean-css)',
        'Enable minification in your build process',
        'Configure your bundler to minify CSS in production',
        'Use automated deployment pipelines with minification'
      ],
      moreInfo: 'CSS minification is a quick win with automated tools'
    }],
    ['unminified-javascript', {
      title: '🗜️ Minify JavaScript',
      impact: 'medium',
      effort: 'low',
      category: 'performance',
      howToFix: [
        'Use JavaScript minification (Terser, UglifyJS)',
        'Enable minification in production builds',
        'Configure bundlers for automatic minification',
        'Use modern compression techniques'
      ],
      moreInfo: 'JavaScript minification reduces file sizes and parsing time'
    }],
    ['efficiently-encode-images', {
      title: '🖼️ Use efficient image formats',
      impact: 'high',
      effort: 'medium',
      category: 'performance',
      howToFix: [
        'Convert images to WebP/AVIF formats',
        'Use responsive images with srcset',
        'Implement lazy loading for images',
        'Optimize image dimensions for actual display size'
      ],
      moreInfo: 'Modern image formats can reduce file sizes by 25-50%'
    }],
    ['uses-text-compression', {
      title: '📦 Enable text compression',
      impact: 'high',
      effort: 'low',
      category: 'performance',
      howToFix: [
        'Enable Gzip/Brotli compression on your server',
        'Configure CDN compression settings',
        'Ensure HTML, CSS, JS, and JSON are compressed',
        'Use compression middleware in your application'
      ],
      moreInfo: 'Text compression can reduce file sizes by 60-80%'
    }],
    ['uses-responsive-images', {
      title: '📱 Use responsive images',
      impact: 'medium',
      effort: 'medium',
      category: 'performance',
      howToFix: [
        'Implement srcset attribute for different screen sizes',
        'Use picture element for art direction',
        'Generate multiple image sizes in build process',
        'Consider using image CDN services'
      ],
      moreInfo: 'Responsive images prevent loading oversized images on small screens'
    }],
    ['offscreen-images', {
      title: '👁️ Defer offscreen images',
      impact: 'medium',
      effort: 'low',
      category: 'performance',
      howToFix: [
        'Implement native lazy loading with loading="lazy"',
        'Use Intersection Observer API for custom lazy loading',
        'Prioritize above-the-fold images',
        'Consider progressive image loading'
      ],
      moreInfo: 'Lazy loading images improves initial page load time'
    }],
    // Accessibility audits
    ['color-contrast', {
      title: '🎨 Ensure sufficient color contrast',
      impact: 'high',
      effort: 'low',
      category: 'accessibility',
      howToFix: [
        'Use contrast checking tools (WebAIM, Stark)',
        'Ensure 4.5:1 ratio for normal text, 3:1 for large text',
        'Test with different color blindness simulators',
        'Create a consistent color palette with good contrast'
      ],
      moreInfo: 'Good contrast helps users with visual impairments'
    }],
    ['image-alt', {
      title: '🖼️ Add alt text to images',
      impact: 'high',
      effort: 'low',
      category: 'accessibility',
      howToFix: [
        'Add descriptive alt attributes to all images',
        'Use empty alt="" for decorative images',
        'Describe image content and context',
        'Avoid redundant phrases like "image of"'
      ],
      moreInfo: 'Alt text is essential for screen readers and SEO'
    }],
    // SEO audits
    ['meta-description', {
      title: '📝 Add meta description',
      impact: 'medium',
      effort: 'low',
      category: 'seo',
      howToFix: [
        'Write unique, descriptive meta descriptions (150-160 chars)',
        'Include target keywords naturally',
        'Make each page description unique',
        'Write compelling copy that encourages clicks'
      ],
      moreInfo: 'Meta descriptions improve click-through rates from search results'
    }],
    ['document-title', {
      title: '📋 Optimize page title',
      impact: 'high',
      effort: 'low',
      category: 'seo',
      howToFix: [
        'Write descriptive, unique titles for each page',
        'Keep titles under 60 characters',
        'Include primary keywords near the beginning',
        'Use consistent title structure across site'
      ],
      moreInfo: 'Page titles are crucial for search rankings and user experience'
    }]
  ]);

  generateRecommendations(data: PageSpeedInsightsResponse): RecommendationReport {
    const lighthouse = data.lighthouseResult;
    if (!lighthouse) {
      throw new Error('No Lighthouse data available');
    }

    const recommendations: Recommendation[] = [];
    const audits = lighthouse.audits || {};
    const performanceScore = lighthouse.categories?.performance?.score || 0;

    // Process failed audits and opportunities
    Object.entries(audits).forEach(([auditId, audit]) => {
      if (!audit || audit.score === 1 || audit.score === null) return;

      const baseRecommendation = this.auditMappings.get(auditId);
      if (!baseRecommendation) return;

      const recommendation: Recommendation = {
        id: auditId,
        title: baseRecommendation.title || audit.title,
        description: audit.description || 'No description available',
        impact: baseRecommendation.impact || 'medium',
        effort: baseRecommendation.effort || 'medium',
        priority: this.calculatePriority(audit, baseRecommendation),
        category: baseRecommendation.category || 'performance',
        potentialSavings: audit.displayValue || undefined,
        howToFix: baseRecommendation.howToFix || ['Check Lighthouse documentation for specific guidance'],
        moreInfo: baseRecommendation.moreInfo
      };

      recommendations.push(recommendation);
    });

    // Sort by priority (highest first)
    recommendations.sort((a, b) => b.priority - a.priority);

    // Identify quick wins (low effort, medium+ impact)
    const quickWins = recommendations.filter(r => 
      r.effort === 'low' && (r.impact === 'high' || r.impact === 'medium')
    );

    const summary = this.generateSummary(recommendations, performanceScore);

    return {
      url: lighthouse.requestedUrl || 'Unknown',
      strategy: lighthouse.configSettings?.formFactor || 'unknown',
      overallScore: Math.round(performanceScore * 100),
      recommendations,
      quickWins,
      summary
    };
  }

  private calculatePriority(audit: any, baseRec: Partial<Recommendation>): number {
    let priority = 50; // Base priority

    // Impact scoring
    switch (baseRec.impact) {
      case 'high': priority += 30; break;
      case 'medium': priority += 20; break;
      case 'low': priority += 10; break;
    }

    // Effort scoring (less effort = higher priority)
    switch (baseRec.effort) {
      case 'low': priority += 20; break;
      case 'medium': priority += 10; break;
      case 'high': priority += 5; break;
    }

    // Audit score impact (lower score = higher priority)
    const score = audit.score || 0;
    priority += (1 - score) * 20;

    // Potential savings bonus
    if (audit.details?.type === 'opportunity') {
      priority += 15;
    }

    return Math.min(Math.max(Math.round(priority), 1), 100);
  }

  private generateSummary(recommendations: Recommendation[], performanceScore: number) {
    const highPriority = recommendations.filter(r => r.priority >= 80).length;
    const mediumPriority = recommendations.filter(r => r.priority >= 50 && r.priority < 80).length;
    const lowPriority = recommendations.filter(r => r.priority < 50).length;

    let estimatedImpact = 'Low';
    if (performanceScore < 0.5 && highPriority > 3) {
      estimatedImpact = 'Very High';
    } else if (performanceScore < 0.7 && highPriority > 1) {
      estimatedImpact = 'High';
    } else if (highPriority > 0 || mediumPriority > 2) {
      estimatedImpact = 'Medium';
    }

    return {
      totalRecommendations: recommendations.length,
      highPriority,
      mediumPriority,
      lowPriority,
      estimatedImpact
    };
  }

  formatRecommendations(report: RecommendationReport): string {
    let output = `# 🚀 Performance Recommendations\n\n`;
    output += `**URL:** ${report.url}\n`;
    output += `**Current Score:** ${report.overallScore}/100\n`;
    output += `**Device:** ${report.strategy}\n\n`;

    // Summary
    output += `## 📊 Summary\n`;
    output += `- **Total Recommendations:** ${report.summary.totalRecommendations}\n`;
    output += `- **High Priority:** ${report.summary.highPriority} 🔴\n`;
    output += `- **Medium Priority:** ${report.summary.mediumPriority} 🟡\n`;
    output += `- **Low Priority:** ${report.summary.lowPriority} 🟢\n`;
    output += `- **Estimated Impact:** ${report.summary.estimatedImpact}\n\n`;

    // Quick wins
    if (report.quickWins.length > 0) {
      output += `## ⚡ Quick Wins (Low Effort, High Impact)\n`;
      report.quickWins.slice(0, 5).forEach((rec, i) => {
        output += `### ${i + 1}. ${rec.title}\n`;
        output += `**Priority Score:** ${rec.priority}/100 | **Impact:** ${rec.impact} | **Effort:** ${rec.effort}\n\n`;
        output += `${rec.description}\n\n`;
        output += `**How to fix:**\n`;
        rec.howToFix.forEach(fix => output += `- ${fix}\n`);
        output += `\n`;
        if (rec.potentialSavings) {
          output += `**Potential Savings:** ${rec.potentialSavings}\n\n`;
        }
      });
    }

    // All recommendations by priority
    output += `## 📋 All Recommendations (Priority Order)\n`;
    report.recommendations.slice(0, 10).forEach((rec, i) => {
      const priorityEmoji = rec.priority >= 80 ? '🔴' : rec.priority >= 50 ? '🟡' : '🟢';
      output += `### ${i + 1}. ${rec.title} ${priorityEmoji}\n`;
      output += `**Score:** ${rec.priority}/100 | **Category:** ${rec.category} | **Impact:** ${rec.impact} | **Effort:** ${rec.effort}\n\n`;
      
      if (rec.potentialSavings) {
        output += `**Potential Savings:** ${rec.potentialSavings}\n\n`;
      }
      
      output += `${rec.description}\n\n`;
      output += `**Action Steps:**\n`;
      rec.howToFix.slice(0, 3).forEach(fix => output += `- ${fix}\n`);
      
      if (rec.moreInfo) {
        output += `\n*💡 ${rec.moreInfo}*\n`;
      }
      output += `\n---\n\n`;
    });

    return output;
  }
}
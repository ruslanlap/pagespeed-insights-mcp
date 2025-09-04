import { describe, it, expect, beforeEach, vi } from 'vitest';
import nock from 'nock';
import { PageSpeedClient } from '../pagespeed-client.js';

// Mock environment
vi.mock('../env.js', () => ({
  getEnv: () => ({
    GOOGLE_API_KEY: 'test-api-key',
    REQUEST_TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    CACHE_TTL: 3600,
    MAX_CONCURRENCY: 3,
    LOG_LEVEL: 'info',
    NODE_ENV: 'test',
  }),
}));

describe('PageSpeedClient', () => {
  let client: PageSpeedClient;

  beforeEach(() => {
    client = new PageSpeedClient();
    nock.cleanAll();
  });

  it('should analyze page speed successfully', async () => {
    const mockResponse = {
      lighthouseResult: {
        categories: {
          performance: {
            score: 0.85,
          },
        },
        audits: {
          'largest-contentful-paint': {
            displayValue: '2.5 s',
            score: 1,
          },
        },
      },
      analysisUTCTimestamp: '2023-01-01T00:00:00.000Z',
    };

    nock('https://www.googleapis.com')
      .get('/pagespeedonline/v5/runPagespeed')
      .query(true)
      .reply(200, mockResponse);

    const result = await client.analyzePageSpeed(
      {
        url: 'https://example.com',
        strategy: 'mobile',
        category: ['performance'],
        locale: 'en',
      },
      'test-correlation-id'
    );

    expect(result).toEqual(mockResponse);
  });

  it('should handle API errors gracefully', async () => {
    nock('https://www.googleapis.com')
      .get('/pagespeedonline/v5/runPagespeed')
      .query(true)
      .reply(400, { error: 'Invalid URL' });

    await expect(
      client.analyzePageSpeed(
        {
          url: 'https://example.com',
          strategy: 'mobile',
          category: ['performance'],
          locale: 'en',
        },
        'test-correlation-id'
      )
    ).rejects.toThrow('PSI API error');
  });

  it('should cache responses', async () => {
    const mockResponse = {
      lighthouseResult: { categories: { performance: { score: 0.85 } } },
    };

    nock('https://www.googleapis.com')
      .get('/pagespeedonline/v5/runPagespeed')
      .query(true)
      .once()
      .reply(200, mockResponse);

    // First request
    const result1 = await client.analyzePageSpeed(
      {
        url: 'https://example.com',
        strategy: 'mobile',
        category: ['performance'],
        locale: 'en',
      },
      'test-correlation-id-1'
    );

    // Second request should use cache (no HTTP call)
    const result2 = await client.analyzePageSpeed(
      {
        url: 'https://example.com',
        strategy: 'mobile',
        category: ['performance'],
        locale: 'en',
      },
      'test-correlation-id-2'
    );

    expect(result1).toEqual(mockResponse);
    expect(result2).toEqual(mockResponse);
    expect(nock.isDone()).toBe(true);
  });
});
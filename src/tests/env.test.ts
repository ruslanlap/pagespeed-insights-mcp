import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const settings = [
  'GOOGLE_API_KEY', 'LOG_LEVEL', 'MAX_CONCURRENCY', 'REQUEST_TIMEOUT',
  'RETRY_ATTEMPTS', 'CACHE_TTL', 'NODE_ENV',
];

beforeEach(() => {
  vi.resetModules();
  for (const name of settings) vi.stubEnv(name, undefined);
  vi.stubEnv('GOOGLE_API_KEY', 'test-only-key');
});
afterEach(() => vi.unstubAllEnvs());

describe('server environment boundary', () => {
  it('starts with documented defaults and never returns unrelated environment secrets', async () => {
    vi.stubEnv('UNRELATED_SECRET', 'must-not-be-returned');
    const { getEnv, validateEnv } = await import('../env.js');
    expect(() => validateEnv()).not.toThrow();
    expect(getEnv()).toEqual({
      GOOGLE_API_KEY: 'test-only-key', LOG_LEVEL: 'info', MAX_CONCURRENCY: 3,
      REQUEST_TIMEOUT: 30000, RETRY_ATTEMPTS: 3, CACHE_TTL: 3600, NODE_ENV: 'development',
    });
  });

  it('coerces configuration strings and caches the validated result', async () => {
    vi.stubEnv('MAX_CONCURRENCY', '1');
    vi.stubEnv('RETRY_ATTEMPTS', '0');
    vi.stubEnv('REQUEST_TIMEOUT', '60000');
    vi.stubEnv('CACHE_TTL', '60');
    vi.stubEnv('LOG_LEVEL', 'warn');
    vi.stubEnv('NODE_ENV', 'production');
    const { getEnv } = await import('../env.js');
    const first = getEnv();
    expect(first).toMatchObject({ MAX_CONCURRENCY: 1, RETRY_ATTEMPTS: 0, REQUEST_TIMEOUT: 60000, CACHE_TTL: 60, LOG_LEVEL: 'warn', NODE_ENV: 'production' });
    vi.stubEnv('CACHE_TTL', '999');
    expect(getEnv()).toBe(first);
  });

  it.each([
    ['GOOGLE_API_KEY', ''], ['LOG_LEVEL', 'verbose'], ['NODE_ENV', 'staging'],
    ['MAX_CONCURRENCY', '0'], ['MAX_CONCURRENCY', '11'], ['MAX_CONCURRENCY', 'nope'],
    ['REQUEST_TIMEOUT', '999'], ['REQUEST_TIMEOUT', '60001'],
    ['RETRY_ATTEMPTS', '-1'], ['RETRY_ATTEMPTS', '6'],
    ['CACHE_TTL', '59'], ['CACHE_TTL', '86401'],
  ])('rejects invalid %s=%s with an actionable field name', async (name, value) => {
    vi.stubEnv(name, value);
    const { getEnv } = await import('../env.js');
    expect(() => getEnv()).toThrow(new RegExp(`Environment validation failed:[\\s\\S]*${name}:`));
  });

  it('does not cache failed validation or print the API key in errors', async () => {
    vi.stubEnv('REQUEST_TIMEOUT', 'invalid');
    const { getEnv } = await import('../env.js');
    try {
      getEnv();
      expect.fail('invalid timeout must fail validation');
    } catch (error) {
      expect(String(error)).not.toContain('test-only-key');
    }
    vi.stubEnv('REQUEST_TIMEOUT', '1000');
    expect(getEnv().REQUEST_TIMEOUT).toBe(1000);
  });
});

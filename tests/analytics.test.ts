import { describe, expect, it } from 'vitest';
import { pageViewsOnly } from '../src/analytics';

describe('analytics data boundary', () => {
  it('redacts query strings and fragments without mutating the original event', () => {
    const event = { type: 'pageview' as const, url: 'https://example.com/?repository=private%2Frepo#private-rule' };
    expect(pageViewsOnly(event)).toEqual({ type: 'pageview', url: 'https://example.com/' });
    expect(event.url).toContain('private%2Frepo');
  });
  it('blocks custom events rather than sending questionnaire context', () => {
    expect(pageViewsOnly({ type: 'event', url: 'https://example.com/' })).toBeNull();
  });
  it('drops malformed URLs', () => {
    expect(pageViewsOnly({ type: 'pageview', url: 'not a URL' })).toBeNull();
  });
});

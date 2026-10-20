import { Analytics, type BeforeSendEvent } from '@vercel/analytics/react';

// Vite supplies only Vercel's public analytics configuration, never credentials.
declare const __VERCEL_ANALYTICS__: { configString?: string } | null;

export function pageViewsOnly(event: BeforeSendEvent): BeforeSendEvent | null {
  if (event.type !== 'pageview') return null;
  try {
    const url = new URL(event.url);
    url.search = '';
    url.hash = '';
    return { type: 'pageview', url: url.href };
  } catch { return null; }
}

export function HostedAnalytics() {
  return __VERCEL_ANALYTICS__
    ? <Analytics {...__VERCEL_ANALYTICS__} mode="production" beforeSend={pageViewsOnly} />
    : null;
}

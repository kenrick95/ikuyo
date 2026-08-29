import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { trackPageView, trackUIInteraction } from '../webmcp/goatcounter';

/**
 * Reduce a route to a fixed category before reporting it. In particular, trip
 * and entity IDs are never sent to GoatCounter.
 */
export function pageCategory(location: string): string {
  const pathname = location.split(/[?#]/, 1)[0] || '/';

  if (pathname === '/trip') return 'trips';
  if (pathname === '/trip/public') return 'trips-public';
  if (pathname === '/trip/new') return 'trip-new';

  const tripRoute = pathname.match(
    /^\/trip\/[^/]+(?:\/(home|list|timetable|map|expenses|comment|tasks))?(?:\/(activity|accommodation|macroplan|task)\/[^/]+)?$/,
  );
  if (tripRoute) {
    const [, section = 'overview', entity] = tripRoute;
    return entity ? `trip-${section}-${entity}` : `trip-${section}`;
  }

  const fixedPages: Record<string, string> = {
    '/': 'landing',
    '/landing': 'landing',
    '/login': 'login',
    '/account/edit': 'account-edit',
    '/account/upgrade': 'account-upgrade',
    '/privacy': 'privacy',
    '/terms': 'terms',
  };
  return fixedPages[pathname] ?? 'other';
}

/**
 * Aggregate-only site telemetry. It reports a sanitized page category and
 * trusted UI interactions; it never inspects targets, labels, form values,
 * IDs, or route query strings.
 */
export function GoatCounterTelemetry() {
  const [location] = useLocation();

  useEffect(() => {
    trackPageView(pageCategory(location));
  }, [location]);

  useEffect(() => {
    const trackClick = (event: MouseEvent) => {
      if (event.isTrusted) trackUIInteraction('click');
    };
    const trackSubmit = (event: SubmitEvent) => {
      if (event.isTrusted) trackUIInteraction('submit');
    };
    document.addEventListener('click', trackClick, true);
    document.addEventListener('submit', trackSubmit, true);
    return () => {
      document.removeEventListener('click', trackClick, true);
      document.removeEventListener('submit', trackSubmit, true);
    };
  }, []);

  return null;
}

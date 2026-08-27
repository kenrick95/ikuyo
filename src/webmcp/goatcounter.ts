const hostname = (process.env.GOATCOUNTER_HOSTNAME ?? '').trim();
const countUrl = hostname ? `https://${hostname}/count` : undefined;

function eventUrl(toolName: string): string {
  const query = new URLSearchParams({
    // Static tool names only; never include inputs, IDs, titles, or locations.
    p: `webmcp/${toolName}`,
    e: 'true',
    // Avoid a cached image preventing a later invocation from being counted.
    rnd: Math.random().toString(36).slice(2),
  });
  return `${countUrl}?${query}`;
}

/**
 * Counts a WebMCP tool invocation without sending its inputs or user data.
 *
 * This calls GoatCounter's remote count endpoint directly instead of loading
 * its general pageview script, so route paths, query strings, and referrers
 * are not submitted. GoatCounter is entirely disabled when
 * GOATCOUNTER_HOSTNAME is unset or empty.
 */
export function trackWebMCPTool(toolName: string): void {
  if (!countUrl || typeof document === 'undefined') return;

  const image = document.createElement('img');
  image.hidden = true;
  image.referrerPolicy = 'no-referrer';
  const remove = () => image.remove();
  image.addEventListener('load', remove, { once: true });
  image.addEventListener('error', remove, { once: true });
  image.src = eventUrl(toolName);
  (document.body ?? document.documentElement).append(image);
}

const hostname = (process.env.GOATCOUNTER_HOSTNAME ?? '').trim();
const countUrl = hostname ? `https://${hostname}/count` : undefined;

function count(path: string, event: boolean): void {
  if (!countUrl || typeof document === 'undefined') return;

  const query = new URLSearchParams({
    // Callers pass only fixed/sanitized paths; never send inputs, IDs, titles,
    // locations, route paths, or query strings.
    p: path,
    // Avoid a cached image preventing a later invocation from being counted.
    rnd: Math.random().toString(36).slice(2),
  });
  if (event) query.set('e', 'true');

  const image = document.createElement('img');
  image.hidden = true;
  image.referrerPolicy = 'no-referrer';
  const remove = () => image.remove();
  image.addEventListener('load', remove, { once: true });
  image.addEventListener('error', remove, { once: true });
  image.src = `${countUrl}?${query}`;
  (document.body ?? document.documentElement).append(image);
}

/**
 * Counts a WebMCP tool invocation without sending its inputs or user data.
 */
export function trackWebMCPTool(toolName: string): void {
  count('webmcp', true);
  count(`webmcp/${toolName}`, true);
}

/** Counts a normal, trusted browser UI interaction without identifying it. */
export function trackUIInteraction(kind: 'click' | 'submit'): void {
  count('ui', true);
  count(`ui/${kind}`, true);
}

/** Counts a privacy-safe page category rather than the actual route. */
export function trackPageView(page: string): void {
  count('page', false);
  count(`page/${page}`, false);
}

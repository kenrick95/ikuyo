import catalog from '../../shared/structured-data.json';
import { pageMeta } from './pageMeta';

export const structuredDataScriptId = 'ikuyo-page-jsonld';

type Entity = Record<string, unknown>;

function absoluteUrls(value: unknown, origin: string): unknown {
  if (Array.isArray(value))
    return value.map((item) => absoluteUrls(item, origin));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        absoluteUrls(item, origin),
      ]),
    );
  }
  return typeof value === 'string' && value.startsWith('/')
    ? origin + value
    : value;
}

export function pageStructuredData(
  origin: string,
  path: string,
  title: string,
  description: string,
  tripId?: string,
): Entity[] {
  const type = (catalog.pageTypes as Record<string, string>)[path];
  if (!type && !tripId) return [];
  const base = origin.replace(/\/$/, '');
  const url = base + path;
  const page: Entity = {
    '@context': 'https://schema.org',
    '@type': type ?? 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: title || 'Ikuyo!',
    description,
    isPartOf: { '@id': `${base}/#website` },
  };
  if (tripId) page.mainEntity = { '@id': tripId };
  else if (path === '/' || path === '/landing') {
    page.mainEntity = { '@id': `${base}/#application` };
  }
  return [...(absoluteUrls(catalog.entities, base) as Entity[]), page];
}

export function staticPageStructuredData(
  origin: string,
  path: string,
): Entity[] {
  const meta = pageMeta(path);
  if (!meta || meta.noindex) return [];
  return pageStructuredData(origin, path, meta.title, meta.description);
}

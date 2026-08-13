import pages from '../../shared/pages.json';

export interface PageMeta {
  title: string;
  description: string;
  noindex: boolean;
}

/**
 * Metadata for a static (non-trip) route, sourced from the same
 * `shared/pages.json` catalog the PHP metadata service reads. The `title` is
 * the distinguishing title; `DocTitle` applies the `| Ikuyo!` branding.
 */
export function pageMeta(path: string): PageMeta | undefined {
  return (pages as Record<string, PageMeta>)[path];
}

/** Convenience: the distinguishing title for a static route. */
export function pageTitle(path: string): string {
  return pageMeta(path)?.title ?? '';
}

import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PageStructuredData } from './PageStructuredData';
import {
  pageStructuredData,
  staticPageStructuredData,
  structuredDataScriptId,
} from './structuredData';

const location = vi.hoisted(() => ({ path: '/landing' }));
vi.mock('wouter', () => ({ useLocation: () => [location.path, vi.fn()] }));

afterEach(() => {
  document.getElementById(structuredDataScriptId)?.remove();
  location.path = '/landing';
});

describe('public-page structured data', () => {
  it.each(['/', '/landing', '/privacy', '/terms'])(
    'describes %s with absolute site and page identifiers',
    (path) => {
      const data = staticPageStructuredData('https://ikuyo.example/', path);
      expect(data.map((item) => item['@type'])).toEqual([
        'WebSite',
        'WebApplication',
        'WebPage',
      ]);
      expect(data[0]['@id']).toBe('https://ikuyo.example/#website');
      expect(data[1].url).toBe('https://ikuyo.example/landing');
      expect(data[2].url).toBe(`https://ikuyo.example${path}`);
      expect(data[2].isPartOf).toEqual({ '@id': data[0]['@id'] });
    },
  );

  it('describes the directory as a collection without inventing unseen trip entries', () => {
    const data = staticPageStructuredData(
      'https://ikuyo.example',
      '/trip/public',
    );
    expect(data[2]['@type']).toBe('CollectionPage');
    expect(data[2]).not.toHaveProperty('mainEntity');
    expect(data[2].name).toBe('Public Trips');
  });

  it.each([
    '/login',
    '/trip',
    '/trip/new',
    '/account/edit',
    '/admin',
    '/unknown',
  ])('omits private or unknown route %s', (path) => {
    expect(staticPageStructuredData('https://ikuyo.example', path)).toEqual([]);
  });

  it('links a canonical trip page to its exported trip entity', () => {
    const data = pageStructuredData(
      'https://ikuyo.example',
      '/trip/one',
      'Tokyo',
      '',
      'urn:ikuyo:trip:one',
    );
    expect(data[2].url).toBe('https://ikuyo.example/trip/one');
    expect(data[2].mainEntity).toEqual({ '@id': 'urn:ikuyo:trip:one' });
    expect(data[2].name).toBe('Tokyo');
  });

  it('replaces server data on navigation and clears it on a private route', () => {
    const server = document.createElement('script');
    server.id = structuredDataScriptId;
    document.head.appendChild(server);
    const view = render(<PageStructuredData />);
    expect(server.isConnected).toBe(false);
    expect(
      document.querySelectorAll(`#${structuredDataScriptId}`),
    ).toHaveLength(1);
    const data = () =>
      JSON.parse(
        document.getElementById(structuredDataScriptId)?.textContent ?? '[]',
      );
    expect(data()[2].mainEntity['@id']).toContain('#application');
    location.path = '/trip/public';
    view.rerender(<PageStructuredData />);
    expect(data()[2]['@type']).toBe('CollectionPage');
    location.path = '/login';
    view.rerender(<PageStructuredData />);
    expect(document.getElementById(structuredDataScriptId)).toBeNull();
    view.unmount();
  });

  it('leaves trip metadata alone during nested trip navigation', () => {
    location.path = '/trip/one/home';
    const view = render(<PageStructuredData />);
    const tripScript = document.createElement('script');
    tripScript.id = structuredDataScriptId;
    document.head.appendChild(tripScript);
    location.path = '/trip/one/map';
    view.rerender(<PageStructuredData />);
    expect(tripScript.isConnected).toBe(true);
    view.unmount();
  });
});

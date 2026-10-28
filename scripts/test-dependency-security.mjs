import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { JSDOM } from 'jsdom';

// Resolve the actual transitive packages consumed by the SDK and Sass plugin.
const sdkRequire = createRequire(import.meta.resolve('@maptiler/sdk'));
const sassRequire = createRequire(import.meta.resolve('@rsbuild/plugin-sass'));
const merge = sassRequire('deepmerge');

test('deepmerge rejects prototype poisoning in either input', () => {
  const payload = JSON.parse('{"__proto__":{"admin":true}}');
  const inputs = [Object.create(null), payload, null, 0];
  for (const target of inputs) {
    for (const result of [
      merge(target, payload),
      merge(payload, target ?? {}),
    ]) {
      assert.equal(Object.getPrototypeOf(result), Object.prototype);
      assert.equal(result.admin, undefined);
      assert.equal(Object.hasOwn(result, '__proto__'), false);
    }
  }
  const nested = merge(
    { session: null },
    JSON.parse('{"session":{"__proto__":{"admin":true}}}'),
  );
  assert.equal(nested.session.admin, undefined);
  assert.equal(Object.getPrototypeOf(nested.session), Object.prototype);
});

test('deepmerge preserves Sass option merging and cloning', () => {
  const logger = () => {};
  const symbol = Symbol('option');
  const defaults = { nested: { enabled: true }, paths: ['base'], logger };
  const result = merge(defaults, {
    nested: { quiet: true },
    paths: ['custom'],
    [symbol]: 42,
  });
  assert.deepEqual(result, {
    nested: { enabled: true, quiet: true },
    paths: ['base', 'custom'],
    logger,
    [symbol]: 42,
  });
  assert.notEqual(result.nested, defaults.nested);
  assert.deepEqual(defaults.paths, ['base']);
});

const { window } = new JSDOM('');
// No workers are started by attribution controls; jsdom lacks this browser API.
window.URL.createObjectURL = () => 'blob:dependency-security-test';
globalThis.window = window;
globalThis.document = window.document;
globalThis.DOMParser = window.DOMParser;

const maplibreRoot = path.dirname(
  sdkRequire.resolve('maplibre-gl/package.json'),
);
for (const bundle of [
  'maplibre-gl.js',
  'maplibre-gl-dev.js',
  'maplibre-gl-csp.js',
  'maplibre-gl-csp-dev.js',
]) {
  test(`${bundle} strips consecutive dangerous attribution attributes`, () => {
    const { AttributionControl } = sdkRequire(
      path.join(maplibreRoot, 'dist', bundle),
    );
    const control = new AttributionControl({
      compact: false,
      customAttribution:
        '<details open onload="1" ontoggle="alert(1)">Custom</details>',
    });
    const map = {
      style: {
        tileManagers: {
          tiles: {
            used: true,
            getSource: () => ({
              attribution:
                '<a href="javascript:alert(1)" onclick="alert(2)">Tiles</a>' +
                '<a href="https://example.com/">Credit</a>',
            }),
          },
        },
      },
      getCanvasContainer: () => document.createElement('div'),
      _getUIString: () => 'Attribution',
      on() {},
      off() {},
    };
    try {
      const element = control.onAdd(map);
      assert.ok(element.querySelector('details[open]'));
      assert.ok(element.querySelector('a[href="https://example.com/"]'));
      assert.match(element.textContent, /Custom/);
      assert.match(element.textContent, /Tiles/);
      assert.equal(
        element.querySelector('[onload], [ontoggle], [onclick]'),
        null,
      );
      assert.equal(element.querySelector('a[href^="javascript:"]'), null);
    } finally {
      control.onRemove();
    }
  });
}

import 'dotenv/config';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';
import { RsdoctorRspackPlugin } from '@rsdoctor/rspack-plugin';

const {
  INSTANT_APP_ID,
  INSTANT_API_URI,
  INSTANT_WEBSOCKET_URI,
  SENTRY_ENABLED,
  SENTRY_DSN,
  SENTRY_RELEASE,
  MAPTILER_API_KEY,
  MAPTILER_MAP_STYLE_LIGHT,
  MAPTILER_MAP_STYLE_DARK,
  NODE_ENV,
} = process.env;
const isSentryEnabled = !!JSON.parse(SENTRY_ENABLED || 'true');
const isProduction = NODE_ENV === 'production';
const isDevelopment = NODE_ENV === 'development';

console.log('Building Ikuyo for', NODE_ENV);
console.log('Configurations from env variables', {
  INSTANT_APP_ID,
  INSTANT_API_URI,
  INSTANT_WEBSOCKET_URI,
  SENTRY_ENABLED,
  SENTRY_DSN,
  SENTRY_RELEASE,
  MAPTILER_API_KEY,
  MAPTILER_MAP_STYLE_LIGHT,
  MAPTILER_MAP_STYLE_DARK,
  NODE_ENV,
  isSentryEnabled,
  isProduction,
  isDevelopment,
});

if (!INSTANT_APP_ID) {
  throw new Error('process.env.INSTANT_APP_ID is not set');
}
if (!MAPTILER_API_KEY) {
  throw new Error('process.env.MAPTILER_API_KEY is not set');
}
if (isSentryEnabled && !SENTRY_DSN && isProduction) {
  throw new Error('process.env.SENTRY_DSN is not set');
}

export default defineConfig({
  html: {
    template: './index.html',
    appIcon: {
      name: 'Ikuyo',
      icons: [
        {
          src: './public/ikuyo-180.png',
          size: 180,
          target: 'apple-touch-icon',
        },
        {
          src: './public/ikuyo-192.png',
          size: 192,
          target: 'web-app-manifest',
        },
        {
          src: './public/ikuyo-512.png',
          size: 512,
          target: 'web-app-manifest',
        },
      ],
    },
  },
  server: {
    // For local dev, only localhost:5173 is allowed by the OAuth callback
    host: 'localhost',
    port: 5173,
  },
  source: {
    entry: {
      index: './src/main.tsx',
    },
    define: {
      'process.env.INSTANT_APP_ID': JSON.stringify(INSTANT_APP_ID),
      'process.env.INSTANT_API_URI': JSON.stringify(INSTANT_API_URI || ''),
      'process.env.INSTANT_WEBSOCKET_URI': JSON.stringify(
        INSTANT_WEBSOCKET_URI || '',
      ),
      'process.env.SENTRY_ENABLED': JSON.stringify(isSentryEnabled),
      'process.env.SENTRY_DSN': JSON.stringify(SENTRY_DSN),
      'process.env.SENTRY_RELEASE': JSON.stringify(SENTRY_RELEASE),
      'process.env.MAPTILER_API_KEY': JSON.stringify(MAPTILER_API_KEY),
      'process.env.MAPTILER_MAP_STYLE_LIGHT': JSON.stringify(
        MAPTILER_MAP_STYLE_LIGHT || 'BASIC.LIGHT',
      ),
      'process.env.MAPTILER_MAP_STYLE_DARK': JSON.stringify(
        MAPTILER_MAP_STYLE_DARK || 'BASIC.DARK',
      ),
    },
  },
  output: {
    polyfill: 'usage',
    injectStyles: isDevelopment,
    sourceMap: {
      css: true,
      js: isProduction ? 'source-map' : 'cheap-module-source-map',
    },
  },
  plugins: [pluginReact(), pluginSass()],
  performance: {
    chunkSplit: {
      forceSplitting: {
        'lib-wouter': /node_modules[\\/]wouter/,
        'lib-maplibre': /node_modules[\\/]maplibre-gl/,
        'lib-maptiler': /node_modules[\\/]@maptiler/,
        'lib-instant': /node_modules[\\/](@instantdb|mutative|uuid)/,
        'lib-radix': /node_modules[\\/](@radix-ui|@floating-ui)/,
        'lib-dndkit': /node_modules[\\/](@dnd-kit)/,
        'lib-sentry': /node_modules[\\/](@sentry)/,
      },
    },
  },
  tools: {
    rspack: {
      plugins: [
        process.env.RSDOCTOR === 'true' &&
          new RsdoctorRspackPlugin({
            port: 5555,
            supports: {
              generateTileGraph: true,
            },
          }),
      ],
    },
  },
});

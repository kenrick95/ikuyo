import 'dotenv/config';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';
import { RsdoctorRspackPlugin } from '@rsdoctor/rspack-plugin';

const {
  NODE_ENV,
  IKUYO_API_URL,
  IKUYO_BACKEND_AUTH,
  IKUYO_BACKEND_CONTENT_WRITES,
  IKUYO_BACKEND_TASK_WRITES,
  IKUYO_BACKEND_SHARING_WRITES,
  IKUYO_BACKEND_ACTIVITY_WRITES,
  IKUYO_BACKEND_TRIP_WRITES,
  IKUYO_BACKEND_TRIP_READS,
  IKUYO_MAINTENANCE_MODE,
  IKUYO_READ_ONLY_MODE,
  SENTRY_ENABLED,
  SENTRY_DSN,
  SENTRY_RELEASE,
  MAPTILER_API_KEY,
  MAPTILER_MAP_STYLE_LIGHT,
  MAPTILER_MAP_STYLE_DARK,
  GOATCOUNTER_HOSTNAME,
} = process.env;
const isSentryEnabled = !!JSON.parse(SENTRY_ENABLED || 'true');
const isProduction = NODE_ENV === 'production';
const isDevelopment = NODE_ENV === 'development';

console.log('Building Ikuyo for', NODE_ENV);
console.log('Configurations from env variables', {
  NODE_ENV,
  IKUYO_API_URL,
  IKUYO_BACKEND_AUTH,
  IKUYO_BACKEND_CONTENT_WRITES,
  IKUYO_BACKEND_TASK_WRITES,
  IKUYO_BACKEND_SHARING_WRITES,
  IKUYO_BACKEND_ACTIVITY_WRITES,
  IKUYO_BACKEND_TRIP_WRITES,
  IKUYO_BACKEND_TRIP_READS,
  IKUYO_MAINTENANCE_MODE,
  IKUYO_READ_ONLY_MODE,
  SENTRY_ENABLED,
  SENTRY_DSN,
  SENTRY_RELEASE,
  MAPTILER_API_KEY,
  MAPTILER_MAP_STYLE_LIGHT,
  MAPTILER_MAP_STYLE_DARK,
  GOATCOUNTER_HOSTNAME,
  isSentryEnabled,
  isProduction,
  isDevelopment,
});

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
    host: 'localhost',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8999',
        changeOrigin: true,
      },
    },
  },
  source: {
    entry: {
      index: './src/main.tsx',
    },
    define: {
      'process.env.IKUYO_API_URL': JSON.stringify(
        process.env.IKUYO_API_URL || '',
      ),
      // Backend (Laravel) flags default ON now that InstantDB is removed.
      // They are only OFF if the caller explicitly sets the env var to 'false'.
      'process.env.IKUYO_BACKEND_AUTH': JSON.stringify(
        process.env.IKUYO_BACKEND_AUTH !== 'false',
      ),
      'process.env.IKUYO_BACKEND_CONTENT_WRITES': JSON.stringify(
        process.env.IKUYO_BACKEND_CONTENT_WRITES !== 'false',
      ),
      'process.env.IKUYO_BACKEND_TASK_WRITES': JSON.stringify(
        process.env.IKUYO_BACKEND_TASK_WRITES !== 'false',
      ),
      'process.env.IKUYO_BACKEND_SHARING_WRITES': JSON.stringify(
        process.env.IKUYO_BACKEND_SHARING_WRITES !== 'false',
      ),
      'process.env.IKUYO_BACKEND_ACTIVITY_WRITES': JSON.stringify(
        process.env.IKUYO_BACKEND_ACTIVITY_WRITES !== 'false',
      ),
      'process.env.IKUYO_BACKEND_TRIP_WRITES': JSON.stringify(
        process.env.IKUYO_BACKEND_TRIP_WRITES !== 'false',
      ),
      'process.env.IKUYO_BACKEND_TRIP_READS': JSON.stringify(
        process.env.IKUYO_BACKEND_TRIP_READS !== 'false',
      ),
      'process.env.IKUYO_MAINTENANCE_MODE': JSON.stringify(
        process.env.IKUYO_MAINTENANCE_MODE === 'true',
      ),
      'process.env.IKUYO_READ_ONLY_MODE': JSON.stringify(
        process.env.IKUYO_READ_ONLY_MODE === 'true',
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
      // Hostname only, e.g. "ikuyo.goatcounter.com". An empty value keeps
      // GoatCounter entirely disabled in the client.
      'process.env.GOATCOUNTER_HOSTNAME': JSON.stringify(
        GOATCOUNTER_HOSTNAME || '',
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

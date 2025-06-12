import 'dotenv/config';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';
import { RsdoctorRspackPlugin } from '@rsdoctor/rspack-plugin';

const INSTANT_APP_ID = process.env.INSTANT_APP_ID;
const MAPTILER_API_KEY = process.env.MAPTILER_API_KEY;
const SENTRY_DSN = process.env.SENTRY_DSN;
const isProduction = process.env.NODE_ENV === 'production';

if (!INSTANT_APP_ID) {
  throw new Error('process.env.INSTANT_APP_ID is not set');
}
if (!MAPTILER_API_KEY) {
  throw new Error('process.env.MAPTILER_API_KEY is not set');
}
if (!SENTRY_DSN && isProduction) {
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
      'process.env.INSTANT_APP_ID': JSON.stringify(process.env.INSTANT_APP_ID),
      'process.env.MAPTILER_API_KEY': JSON.stringify(
        process.env.MAPTILER_API_KEY,
      ),
      'process.env.SENTRY_DSN': JSON.stringify(process.env.SENTRY_DSN),
    },
  },
  output: {
    polyfill: 'usage',
    injectStyles: process.env.NODE_ENV === 'development',
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

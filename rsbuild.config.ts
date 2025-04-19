import 'dotenv/config';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';
import { pluginTypeCheck } from '@rsbuild/plugin-type-check';

const INSTANT_APP_ID = process.env.INSTANT_APP_ID;

if (!INSTANT_APP_ID) {
  throw new Error('process.env.INSTANT_APP_ID is not set');
}

export default defineConfig({
  html: {
    template: './index.html',
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
    },
  },
  output: {
    polyfill: 'usage',
  },
  plugins: [pluginReact(), pluginSass(), pluginTypeCheck()],
});

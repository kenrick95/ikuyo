import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Ikuyo',
        short_name: 'Ikuyo',
        description: 'Itinerary planning app',
        theme_color: '#AB4ABA',
        icons: [
          {
            src: './ikuyo-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: './ikuyo-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      strategies: 'generateSW',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallbackDenylist: [/^\/sw.js/],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('luxon')) {
              return 'v-luxon';
            }
            if (id.includes('@radix-ui')) {
              return 'v-radix-ui';
            }
            if (id.includes('@instantdb')) {
              return 'v-instantdb';
            }
            if (id.includes('react')) {
              return 'v-react';
            }
            return 'v-vendor';
          }
        },
      },
    },
  },
  test: {
    watch: !process.env.CI,
  },
});

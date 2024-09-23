import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
    watch: true,
  },
});

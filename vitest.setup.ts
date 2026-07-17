import '@testing-library/jest-dom/vitest';
// TODO: Node.js only supports Temporal since v26 but it's not LTS yet at time of writing (2026-07-13)
import 'temporal-polyfill/global';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Mock ResizeObserver which is not available in jsdom
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

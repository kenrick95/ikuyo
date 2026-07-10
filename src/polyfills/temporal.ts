// Only load temporal polyfill if it's not already available in the environment
if (!('Temporal' in globalThis)) {
  await import('temporal-polyfill/global');
}

export {};

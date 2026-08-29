import { useEffect } from 'react';
import {
  getModelContext,
  registerToolIfSupported,
  type WebMCPTool,
} from './modelContext';

/**
 * Register a set of WebMCP tools for the duration of the current render's
 * context, aborting their `AbortSignal` (which deregisters them) whenever the
 * `deps` change or the component unmounts.
 *
 * WebMCP has no `unregisterTool()`; releasing a tool means aborting the signal
 * passed at registration. Re-keying `deps` per page/auth context is what makes
 * tool registration dynamic (see the WebMCP guidance).
 */
export function useWebMCPTools(tools: WebMCPTool[], deps: unknown[]): void {
  useEffect(() => {
    if (!getModelContext()) return;
    const controller = new AbortController();
    const { signal } = controller;
    for (const tool of tools) {
      void registerToolIfSupported(tool, signal);
    }
    return () => controller.abort();
    // The caller owns the dependency array (page/auth context) and wants tools
    // to re-register exactly when those deps change, so suppress the literal
    // requirement here.
    // biome-ignore lint/correctness/useExhaustiveDependencies: deps is intentionally dynamic.
  }, deps);
}

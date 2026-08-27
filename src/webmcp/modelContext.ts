import { trackWebMCPTool } from './goatcounter';

/**
 * WebMCP (Web Model Context Protocol) — minimal client-side helper.
 *
 * WebMCP lets a page expose client-side functionality as structured "tools" to
 * AI agents / browser assistants. It runs entirely in the browser tab (no
 * backend transport) and only supports Tools (no Resources/Prompts).
 *
 * Reference (also bundled as a pi skill at .pi/skills/webmcp/):
 * - https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/webmcp/webmcp.md
 * - https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/webmcp/agentic-javascript-tools.md
 *
 * WebMCP is an early preview: requires Chromium 146+. It is guarded by feature
 * detection here so it is a safe no-op in every other browser. There is no
 * `unregisterTool()` — a tool is released by aborting the `AbortSignal` passed
 * at registration time.
 */

export interface WebMCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  /** `annotations` goes on the tool object, AFTER `execute` (see guide). */
  annotations?: { readOnlyHint?: boolean };
  execute: (input: Record<string, unknown>) => unknown | Promise<unknown>;
}

export interface ModelContext {
  registerTool: (
    tool: WebMCPTool,
    options?: { signal?: AbortSignal },
  ) => Promise<void>;
}

/**
 * Feature-detect the WebMCP imperative API. `navigator.modelContext` is
 * deprecated in Chromium 150+, so prefer `document.modelContext` and fall back
 * to `navigator.modelContext` for older builds.
 */
export function getModelContext(): ModelContext | undefined {
  if (typeof document === 'undefined') return undefined;
  const candidate =
    (document as { modelContext?: unknown }).modelContext ??
    (navigator as { modelContext?: unknown }).modelContext;
  return candidate &&
    typeof (candidate as ModelContext).registerTool === 'function'
    ? (candidate as ModelContext)
    : undefined;
}

/** `true` on browsers where WebMCP is available (Chromium 146+ + flag). */
export function isWebMCPAvailable(): boolean {
  return getModelContext() !== undefined;
}

/**
 * Register a single tool. No-ops (silently) when WebMCP is unsupported so
 * regular browsers are unaffected.
 */
export async function registerToolIfSupported(
  tool: WebMCPTool,
  signal?: AbortSignal,
): Promise<void> {
  const ctx = getModelContext();
  if (!ctx) return;
  try {
    await ctx.registerTool(
      {
        ...tool,
        async execute(input) {
          // The tool name is static; inputs are intentionally never tracked.
          try {
            trackWebMCPTool(tool.name);
          } catch {
            // Telemetry must never affect a tool invocation.
          }
          return tool.execute(input);
        },
      },
      signal ? { signal } : undefined,
    );
  } catch (error) {
    // Registration must never break the app; surface a warning in dev only.
    console.warn('[webmcp] failed to register tool', tool.name, error);
  }
}

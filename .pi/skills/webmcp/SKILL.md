---
name: webmcp
description: Implement browser-native WebMCP (Model Context Protocol) tool registration in web apps using document.modelContext. Use when adding or modifying WebMCP tools, imperative registerTool calls, inputSchema definitions, or AbortSignal-based tool lifecycle/cleanup in frontend JavaScript/TypeScript code.
---

# WebMCP — Web Model Context Protocol

WebMCP is a browser-native JavaScript API that lets web pages expose their
client-side functionality as structured **tools** to AI agents, browser
assistants, and assistive technologies.

Load the full reference docs on demand:

- `references/webmcp.md` — overview, best practices, anti-patterns, implementation status.
- `references/agentic-javascript-tools.md` — the Imperative API
  (`document.modelContext.registerTool`), lifecycle, schemas, fallback.

## Key facts

- Runs entirely **client-side** in the browser tab. It is *not* a backend
  server and does **not** use HTTP/SSE/stdio transports. The web page itself is
  the tool registry.
- Only the **Tools** primitive is supported. No Resources, no Prompts.
- Requires HTTPS (Secure Context). Early preview on Chromium `146.0.7672.0+`
  with the `#enable-webmcp-testing` flag.

## Imperative API quick start

```javascript
const controller = new AbortController();

await document.modelContext.registerTool({
  name: "get_user_preferences",
  description: "Retrieves the user's saved preferences.",
  inputSchema: { type: "object", properties: {} },
  execute() {
    const prefs = localStorage.getItem("user_prefs");
    return prefs ? JSON.parse(prefs) : { theme: "light" };
  },
  annotations: { readOnlyHint: true }
}, { signal: controller.signal });

// Unregister on teardown (there is NO unregisterTool):
controller.abort();
```

## Rules to follow

1. **Always pass an `AbortSignal`** during registration and abort it on
   unmount/route-change to unregister tools. Never call `unregisterTool()`
   (removed).
2. **`inputSchema`** must be a JSON-Schema object with `type`, `properties`,
   `required`, and a `description` for **every** parameter to avoid agent
   hallucinations.
3. **`annotations: { readOnlyHint: true }`** goes *after* `execute` and marks a
   tool read-only (safe for agents).
4. Use a **factory pattern** to pass app context (stores/managers) into tools.
5. **Feature-detect** `document.modelContext` (fallback
   `navigator.modelContext`) before registering.
6. Keep secrets out of client code; reach backends through secure API layers.

## Anti-patterns (do NOT do)

- No backend/Node transports.
- No Resources or Prompts.
- No `provideContext()` / `clearContext()` (removed).
- Don't auto-submit destructive/irreversible actions (e.g. deletes) without UI
  guardrails.

## Fallback

```javascript
const modelContext = document.modelContext || navigator.modelContext;
if (modelContext && 'registerTool' in modelContext) {
  // Register tools
}
```

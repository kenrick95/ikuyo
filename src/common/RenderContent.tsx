import type { ReactNode } from 'react';

/** Evaluate child JSX only when the parent mounts this subtree. */
export function RenderContent({ children }: { children: () => ReactNode }) {
  return children();
}

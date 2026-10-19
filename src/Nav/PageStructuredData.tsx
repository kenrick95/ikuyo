import { useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  staticPageStructuredData,
  structuredDataScriptId,
} from './structuredData';

/** Public static pages share declarations with the PHP front controller. */
export function PageStructuredData() {
  const [path] = useLocation();
  useEffect(() => {
    const data = staticPageStructuredData(window.location.origin, path);
    if (data.length === 0) return;
    document.getElementById(structuredDataScriptId)?.remove();
    const script = document.createElement('script');
    script.id = structuredDataScriptId;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
    return () => script.remove();
  }, [path]);
  return null;
}

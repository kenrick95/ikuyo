import { Fragment, useMemo } from 'react';
import type * as React from 'react';
import createUrlRegExp from 'url-regex-safe';

export function useParseTextIntoNodes(
  text: undefined | null | string,
): React.ReactNode[] {
  return useMemo(() => {
    return parseTextIntoNodes(text);
  }, [text]);
}

export function parseTextIntoNodes(
  text: undefined | null | string,
): React.ReactNode[] {
  const receivedText = text || '';
  if (!receivedText) {
    return [];
  }
  const urlRegex = createUrlRegExp({
    localhost: false,
    ipv4: false,
    ipv6: false,
  });
  const matchArray = receivedText.matchAll(urlRegex);

  const parts: Array<React.ReactNode> = [];
  let i = 0;
  let partIndex = 0;
  for (const match of matchArray) {
    const url = match[0];
    if (url) {
      const partBeforeUrl = receivedText.slice(i, match.index);
      if (partBeforeUrl.length > 0) {
        parts.push(<Fragment key={partIndex}>{partBeforeUrl}</Fragment>);
        partIndex += 1;
      }
      if (!url.startsWith('http')) {
        parts.push(<Fragment key={partIndex}>{url}</Fragment>);
        partIndex += 1;
      } else {
        parts.push(
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            key={partIndex}
          >
            {url}
          </a>,
        );
        partIndex += 1;
      }
      i = match.index + url.length;
    }
  }
  const finalPart = receivedText.slice(i, receivedText.length);
  if (finalPart.length > 0) {
    parts.push(<Fragment key={partIndex}>{finalPart}</Fragment>);
    partIndex += 1;
  }
  return parts;
}

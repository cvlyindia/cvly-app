import React from 'react';

const URL_PATTERN = /https?:\/\/[^\s]+/g;

/** Splits text on URLs and returns an array of strings and real <a> elements,
 * safe to render directly inside JSX. Internal cvly.in links open in the same
 * tab; anything else opens in a new one. Built with matchAll rather than
 * split+test on a global regex, which has a well-known statefulness bug where
 * .lastIndex mutates between calls and produces inconsistent results. */
export function linkifyText(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const url = match[0].replace(/[.,;)]+$/, ''); // trim trailing punctuation
    const start = match.index ?? 0;

    if (start > lastIndex) nodes.push(text.slice(lastIndex, start));

    const isInternal = url.includes('cvly.in') || url.startsWith('/');
    nodes.push(
      <a
        key={`${keyPrefix}-link-${start}`}
        href={url}
        target={isInternal ? undefined : '_blank'}
        rel={isInternal ? undefined : 'noopener noreferrer'}
        className="underline font-medium"
      >
        {url}
      </a>
    );

    lastIndex = start + url.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));

  return nodes.length ? nodes : [text];
}

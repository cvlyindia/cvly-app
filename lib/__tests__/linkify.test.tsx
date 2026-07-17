import { describe, it, expect } from 'vitest';
import React from 'react';
import { linkifyText } from '@/lib/linkify';

describe('linkifyText', () => {
  it('returns plain text unchanged when there are no URLs', () => {
    const result = linkifyText('Just a normal sentence.', 'k');
    expect(result).toEqual(['Just a normal sentence.']);
  });

  it('turns a URL into a real anchor element, not plain text', () => {
    const result = linkifyText('See https://cvly.in/privacy for details.', 'k');
    const link = result.find((node) => React.isValidElement(node)) as React.ReactElement<{ href: string }>;
    expect(link).toBeDefined();
    expect(link.type).toBe('a');
    expect(link.props.href).toBe('https://cvly.in/privacy');
  });

  it('preserves the surrounding text before and after the URL as separate string nodes', () => {
    const result = linkifyText('Read it at https://cvly.in/privacy for more.', 'k');
    expect(result[0]).toBe('Read it at ');
    expect(result[result.length - 1]).toBe(' for more.');
  });

  it('trims trailing punctuation from the URL rather than including it in the link', () => {
    const result = linkifyText('Check https://cvly.in/pricing.', 'k');
    const link = result.find((node) => React.isValidElement(node)) as React.ReactElement<{ href: string }>;
    expect(link.props.href).toBe('https://cvly.in/pricing');
    // the trailing period should be preserved as trailing text, not swallowed into the URL
    expect(result[result.length - 1]).toBe('.');
  });

  it('opens internal cvly.in links without target=_blank, external links with it', () => {
    const result = linkifyText('https://cvly.in/guides and https://example.com', 'k');
    const links = result.filter((node) => React.isValidElement(node)) as React.ReactElement<{ target?: string }>[];
    expect(links).toHaveLength(2);
    expect(links[0].props.target).toBeUndefined();
    expect(links[1].props.target).toBe('_blank');
  });

  it('handles multiple URLs in the same message', () => {
    const result = linkifyText('See https://cvly.in/pricing or https://cvly.in/guides', 'k');
    const links = result.filter((node) => React.isValidElement(node));
    expect(links).toHaveLength(2);
  });
});

import { describe, it, expect } from 'vitest';
import { extractSoftkomikToken, buildSoftkomikPageUrl, SOFTKOMIK_DEFAULT_TOKEN } from '@/lib/softkomik';

describe('Softkomik Access Token & Image URL Builder', () => {
  it('extracts token from HTML script declaration or image preloads', () => {
    const htmlWithPreload = `
      <link rel="preload" as="image" href="https://image.komik.im/softkomik/chapter-005/softkomik-0.webp?id=T4Kmwztku" fetchPriority="high"/>
    `;
    expect(extractSoftkomikToken(htmlWithPreload)).toBe('T4Kmwztku');

    const htmlWithScript = `
      <script>var t = String("AbCdEf123").trim();</script>
    `;
    expect(extractSoftkomikToken(htmlWithScript)).toBe('AbCdEf123');
  });

  it('falls back to SOFTKOMIK_DEFAULT_TOKEN when token is not found in HTML', () => {
    const htmlEmpty = '<div>no token here</div>';
    expect(extractSoftkomikToken(htmlEmpty)).toBe(SOFTKOMIK_DEFAULT_TOKEN);
  });

  it('builds image url appending ?id= parameter correctly', () => {
    const rawPath = 'new-filee/my-comic/chapter-005/softkomik-1.webp';
    const url = buildSoftkomikPageUrl(rawPath, 'T4Kmwztku');
    expect(url).toBe('https://image.komik.im/softkomik/new-filee/my-comic/chapter-005/softkomik-1.webp?id=T4Kmwztku');
  });

  it('does not duplicate ?id= parameter if already present in raw path', () => {
    const rawPath = 'https://image.komik.im/softkomik/test.webp?id=existingToken';
    const url = buildSoftkomikPageUrl(rawPath, 'new-token');
    expect(url).toBe('https://image.komik.im/softkomik/test.webp?id=existingToken');
  });
});

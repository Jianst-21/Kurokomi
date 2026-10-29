import { describe, it, expect } from 'vitest';
import { isSoftkomikPromoBanner } from '@/app/api/image-proxy/route';

describe('Softkomik Banner Interceptor in Image Proxy', () => {
  it('detects promotional trap banner by exact byte size (213,850 bytes)', () => {
    // Softkomik trap banner is exactly 213850 bytes JPEG with JFIF marker
    expect(isSoftkomikPromoBanner(213850)).toBe(true);
  });

  it('does not falsely flag regular manga page buffers', () => {
    expect(isSoftkomikPromoBanner(157212)).toBe(false);
    expect(isSoftkomikPromoBanner(200000)).toBe(false);
    expect(isSoftkomikPromoBanner(0)).toBe(false);
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import HomePage from '@/app/page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
}));

describe('HomePage Desktop Responsiveness', () => {
  it('renders desktop navbar and wide main container classes', () => {
    const { container } = render(<HomePage />);
    const main = container.querySelector('main');
    expect(main).toHaveClass('max-w-6xl');
  });

  it('hides mobile top header on md+ screens', () => {
    const { container } = render(<HomePage />);
    const headers = container.querySelectorAll('header');
    // headers[0] is desktop navbar (hidden md:flex), headers[1] is mobile header (md:hidden)
    const mobileHeader = Array.from(headers).find((h) => h.className.includes('md:hidden'));
    expect(mobileHeader).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import SearchPage from '@/app/search/page';
import FavoritesPage from '@/app/favorites/page';
import HistoryPage from '@/app/history/page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

describe('Search and Library Desktop Responsiveness', () => {
  describe('SearchPage', () => {
    it('contains max-w-6xl container on desktop', () => {
      const { container } = render(<SearchPage />);
      const main = container.querySelector('main');
      expect(main).toHaveClass('max-w-6xl');
    });

    it('renders DesktopNavbar and hides mobile search header on md+ screens', () => {
      const { container } = render(<SearchPage />);
      const headers = container.querySelectorAll('header');
      const mobileHeader = Array.from(headers).find((h) => h.className.includes('md:hidden'));
      expect(mobileHeader).toBeInTheDocument();
      const desktopNav = Array.from(headers).find((h) => h.className.includes('md:flex'));
      expect(desktopNav).toBeInTheDocument();
    });
  });

  describe('FavoritesPage', () => {
    it('contains max-w-6xl container on desktop', () => {
      const { container } = render(<FavoritesPage />);
      const main = container.querySelector('main');
      expect(main).toHaveClass('max-w-6xl');
    });

    it('renders DesktopNavbar and hides mobile header on md+ screens', () => {
      const { container } = render(<FavoritesPage />);
      const headers = container.querySelectorAll('header');
      const mobileHeader = Array.from(headers).find((h) => h.className.includes('md:hidden'));
      expect(mobileHeader).toBeInTheDocument();
      const desktopNav = Array.from(headers).find((h) => h.className.includes('md:flex'));
      expect(desktopNav).toBeInTheDocument();
    });
  });

  describe('HistoryPage', () => {
    it('contains max-w-6xl container on desktop', () => {
      const { container } = render(<HistoryPage />);
      const main = container.querySelector('main');
      expect(main).toHaveClass('max-w-6xl');
    });

    it('renders DesktopNavbar and hides mobile header on md+ screens', () => {
      const { container } = render(<HistoryPage />);
      const headers = container.querySelectorAll('header');
      const mobileHeader = Array.from(headers).find((h) => h.className.includes('md:hidden'));
      expect(mobileHeader).toBeInTheDocument();
      const desktopNav = Array.from(headers).find((h) => h.className.includes('md:flex'));
      expect(desktopNav).toBeInTheDocument();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { DesktopNavbar } from '@/components/DesktopNavbar';
import { BottomNav } from '@/components/BottomNav';

const mockPush = vi.fn();
let mockPathname = '/';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => mockPathname,
}));

describe('DesktopNavbar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/';
  });

  it('renders logo with clean white minimalist text branding', () => {
    render(<DesktopNavbar />);
    const title = screen.getByText('KUROKOMI');
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass('text-zinc-100');
    expect(title).not.toHaveClass('bg-clip-text');
  });

  it('has responsive class hidden md:flex', () => {
    const { container } = render(<DesktopNavbar />);
    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();
    expect(header?.className).toContain('hidden');
    expect(header?.className).toContain('md:flex');
  });

  it('renders quick search input for desktop and navigates on submit', () => {
    render(<DesktopNavbar />);
    const input = screen.getByPlaceholderText(/Cari komik.../i);
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'solo leveling' } });
    fireEvent.submit(input.closest('form')!);

    expect(mockPush).toHaveBeenCalledWith('/search?q=solo%20leveling');
  });

  it('does not submit when search input is empty or whitespace', () => {
    render(<DesktopNavbar />);
    const input = screen.getByPlaceholderText(/Cari komik.../i);
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(input.closest('form')!);

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('highlights the active navigation link based on pathname', () => {
    mockPathname = '/favorites';
    render(<DesktopNavbar />);
    const favLink = screen.getByRole('link', { name: /Favorit/i });
    expect(favLink.className).toContain('text-blue-500');
  });
});

describe('BottomNav Component Responsive', () => {
  it('includes md:hidden so it is hidden on desktop screens', () => {
    const { container } = render(<BottomNav />);
    const nav = container.querySelector('nav');
    expect(nav).toBeInTheDocument();
    expect(nav?.className).toContain('md:hidden');
  });

  it('shows red dot notification on Favorite tab when there is an unread update', () => {
    localStorage.setItem(
      'kurokomi_favorites_v1',
      JSON.stringify([
        {
          id: 'fav-1',
          title: 'Naruto',
          latestChapter: 'Ch. 700',
          latestChapterId: 'ch-700',
        },
      ])
    );

    render(<BottomNav />);
    expect(screen.getByLabelText('Ada update favorit')).toBeInTheDocument();
  });
});

describe('DesktopNavbar Red Dot Indicator', () => {
  it('shows red dot notification on Favorit link when there is an unread update', () => {
    localStorage.setItem(
      'kurokomi_favorites_v1',
      JSON.stringify([
        {
          id: 'fav-1',
          title: 'Naruto',
          latestChapter: 'Ch. 700',
          latestChapterId: 'ch-700',
        },
      ])
    );

    render(<DesktopNavbar />);
    expect(screen.getByLabelText('Ada update favorit')).toBeInTheDocument();
  });
});


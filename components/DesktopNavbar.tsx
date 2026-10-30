'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { hasAnyFavoriteUpdate } from '@/lib/storage';

export function DesktopNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [hasFavoriteUpdate, setHasFavoriteUpdate] = useState(false);

  useEffect(() => {
    const updateStatus = () => setHasFavoriteUpdate(hasAnyFavoriteUpdate());
    updateStatus();

    window.addEventListener('kurokomi_favorites_updated', updateStatus);
    window.addEventListener('storage', updateStatus);
    return () => {
      window.removeEventListener('kurokomi_favorites_updated', updateStatus);
      window.removeEventListener('storage', updateStatus);
    };
  }, [pathname]);

  const navLinks = [
    { label: 'Beranda', href: '/' },
    { label: 'Favorit', href: '/favorites', badge: hasFavoriteUpdate },
    { label: 'Riwayat', href: '/history' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <header className="hidden md:flex sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-850 px-6 py-3">
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-black border border-zinc-800 shadow-md shadow-black/50 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.svg"
              alt="Kurokomi Logo"
              width={32}
              height={32}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-extrabold tracking-wider text-zinc-100 leading-none">
              KUROKOMI
            </span>
            <span className="text-[10px] text-zinc-400 font-medium">
              Baca Komik Bahasa Indonesia
            </span>
          </div>
        </Link>

        {/* Quick Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md mx-8">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari komik..."
              className="w-full bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-500 rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
        </form>

        {/* Text-only Navigation Links */}
        <nav className="flex items-center gap-6 shrink-0">
          {navLinks.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm transition-colors relative flex items-center gap-1.5 ${
                  isActive
                    ? 'text-blue-500 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 font-medium'
                }`}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    aria-label="Ada update favorit"
                    title="Ada update komik favorit"
                    className="relative flex h-2 w-2"
                  >
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 ring-2 ring-zinc-950" />
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

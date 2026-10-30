'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Bookmark, Clock } from 'lucide-react';
import { hasAnyFavoriteUpdate } from '@/lib/storage';

export function BottomNav() {
  const pathname = usePathname();
  const [hasFavoriteUpdate, setHasFavoriteUpdate] = useState(false);

  useEffect(() => {
    setHasFavoriteUpdate(hasAnyFavoriteUpdate());
  }, [pathname]);

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Search', href: '/search', icon: Search },
    { label: 'Favorit', href: '/favorites', icon: Bookmark, badge: hasFavoriteUpdate },
    { label: 'History', href: '/history', icon: Clock },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md px-6 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 transition-colors relative ${
                isActive ? 'text-blue-500 font-medium' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.badge && (
                  <span
                    aria-label="Ada update favorit"
                    title="Ada update komik favorit"
                    className="absolute -top-1 -right-1 flex h-2 w-2"
                  >
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 ring-2 ring-zinc-950" />
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

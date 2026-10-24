'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Bookmark, Clock } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Search', href: '/search', icon: Search },
    { label: 'Favorit', href: '/favorites', icon: Bookmark },
    { label: 'History', href: '/history', icon: Clock },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950 border-t border-zinc-850 px-6 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 transition-colors ${
                isActive ? 'text-blue-500 font-medium' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bookmark, Compass } from 'lucide-react';
import { ComicCardItem } from '@/lib/types';
import { getFavorites } from '@/lib/storage';
import { ComicCard } from '@/components/ComicCard';
import { BottomNav } from '@/components/BottomNav';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<ComicCardItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setFavorites(getFavorites());
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 pb-24 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-blue-500 fill-current" />
            <h1 className="text-sm font-bold text-zinc-100">Favorit Saya</h1>
          </div>
          {mounted && favorites.length > 0 && (
            <span className="text-[11px] text-zinc-400 font-medium bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
              {favorites.length} komik
            </span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-4">
        {mounted && favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 bg-zinc-900/40 rounded-2xl border border-zinc-800/80 text-center my-12 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-850 flex items-center justify-center text-zinc-500 border border-zinc-800">
              <Bookmark className="w-6 h-6" />
            </div>
            <h2 className="text-sm font-bold text-zinc-200">Belum Ada Komik Favorit</h2>
            <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
              Kamu belum menambahkan komik ke daftar favorit. Buka halaman detail komik dan tekan ikon bookmark untuk menyimpannya di sini.
            </p>
            <Link
              href="/"
              className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Jelajahi Komik</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            {favorites.map(comic => (
              <ComicCard key={comic.id} comic={comic} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { LatestUpdatesSection } from '@/components/LatestUpdatesSection';
import { TopComicsSection } from '@/components/TopComicsSection';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 pb-28 text-zinc-100 flex flex-col">
      {/* Top Header - Seamless without border */}
      <header className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-extrabold text-white text-base shadow-md shadow-blue-600/30">
              K
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-extrabold tracking-wider bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent leading-none">
                KUROKOMI
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">
                Baca Komik Bahasa Indonesia
              </span>
            </div>
          </div>

          <Link
            href="/search"
            aria-label="Cari Komik"
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors"
          >
            <Search className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-2 flex flex-col gap-6">
        {/* Section 1: Update Komik Terbaru (Horizontal Snap Slider & Clean Pagination) */}
        <LatestUpdatesSection />

        {/* Section 2: Top 15 Rekomendasi (3-Column Grid & Clean Pagination) */}
        <TopComicsSection />
      </main>

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
}

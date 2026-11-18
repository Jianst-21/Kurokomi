'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Search, RefreshCw } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { DesktopNavbar } from '@/components/DesktopNavbar';
import { LatestUpdatesSection } from '@/components/LatestUpdatesSection';
import { TopComicsSection } from '@/components/TopComicsSection';

export default function HomePage() {
  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isPullingRef = useRef(false);

  useEffect(() => {
    // Enable browser native scroll restoration to avoid synthetic scroll jumps during initial load
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'auto';
    }
  }, []);

  // Pull-to-refresh swipe handler
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (typeof window !== 'undefined' && window.scrollY <= 0 && !isRefreshing) {
        touchStartY.current = e.touches[0].clientY;
        isPullingRef.current = true;
      } else {
        isPullingRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshing) return;
      const currentY = e.touches[0].clientY;
      const diff = currentY - touchStartY.current;
      if (diff > 0 && typeof window !== 'undefined' && window.scrollY <= 0) {
        const pull = Math.min(diff * 0.45, 80);
        setPullY(pull);
        setIsPulling(true);
      } else {
        setPullY(0);
        setIsPulling(false);
      }
    };

    const handleTouchEnd = () => {
      if (isPullingRef.current && pullY >= 45 && !isRefreshing) {
        setPullY(45);
        setIsRefreshing(true);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('kurokomi_refresh_home'));
        }
        setTimeout(() => {
          setIsRefreshing(false);
          setPullY(0);
        }, 800);
      } else {
        setPullY(0);
      }
      isPullingRef.current = false;
      setIsPulling(false);
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isRefreshing, pullY]);

  return (
    <div className="min-h-screen bg-zinc-950 pb-28 md:pb-12 text-zinc-100 flex flex-col relative">
      {/* Pull To Refresh Floating Banner */}
      <div
        style={{
          transform: `translateY(${isRefreshing ? 52 : pullY}px)`,
          opacity: pullY > 10 || isRefreshing ? 1 : 0,
          transition: isPulling ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease',
        }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none"
      >
        <div className="flex items-center gap-2 bg-zinc-900/95 border border-zinc-750 text-zinc-200 px-4 py-2 rounded-full shadow-2xl backdrop-blur-md text-xs font-semibold mt-2">
          <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isRefreshing || pullY >= 45 ? 'animate-spin' : ''}`} />
          <span>
            {isRefreshing
              ? 'Memperbarui update komik...'
              : pullY >= 45
              ? 'Lepaskan untuk memperbarui'
              : 'Tarik ke bawah untuk memperbarui'}
          </span>
        </div>
      </div>
      {/* Desktop Navbar (md+) */}
      <DesktopNavbar />

      {/* Top Header - Seamless without border (mobile only) */}
      <header className="md:hidden sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-black border border-zinc-800 shadow-md shadow-black/50 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.svg"
                alt="Kurokomi Logo"
                width={32}
                height={32}
                className="w-full h-full object-cover"
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
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 pt-4 flex flex-col gap-8">
        {/* Section 1: Update Komik Terbaru (Horizontal Snap Slider & Clean Pagination) */}
        <LatestUpdatesSection />

        {/* Section 2: Top Rekomendasi (Responsive Grid & Clean Pagination) */}
        <TopComicsSection />
      </main>

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
}

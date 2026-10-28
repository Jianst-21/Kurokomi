'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowUp, ChevronRight, Check } from 'lucide-react';

interface PullUpNextChapterProps {
  nextChapter?: {
    id: string;
    chapter: string;
  };
  mangaId?: string;
  onTriggerNext: () => void;
}

export function PullUpNextChapter({
  nextChapter,
  mangaId,
  onTriggerNext,
}: PullUpNextChapterProps) {
  const [progress, setProgress] = useState(0); // 0 to 1
  const [isTriggered, setIsTriggered] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const currentPull = useRef<number>(0);
  const wheelAccumulator = useRef<number>(0);
  const wheelTimeout = useRef<NodeJS.Timeout | null>(null);

  const PULL_THRESHOLD = 90; // Pixels needed to complete the circle

  const isAtBottom = () => {
    if (typeof window === 'undefined') return false;
    const scrollY = window.scrollY || window.pageYOffset;
    const windowHeight = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;
    return scrollY + windowHeight >= docHeight - 25;
  };

  useEffect(() => {
    if (!nextChapter || isTriggered) return;

    // Mobile Touch Handlers
    const handleTouchStart = (e: TouchEvent) => {
      if (isAtBottom()) {
        touchStartY.current = e.touches[0].clientY;
      } else {
        touchStartY.current = null;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartY.current === null) {
        if (isAtBottom()) {
          touchStartY.current = e.touches[0].clientY;
        }
        return;
      }

      const currentY = e.touches[0].clientY;
      const diffY = touchStartY.current - currentY; // positive = dragging upwards

      if (diffY > 0 && isAtBottom()) {
        // Resistance curve
        const pull = Math.min(diffY, PULL_THRESHOLD * 1.5);
        currentPull.current = pull;
        const ratio = Math.min(1, Math.max(0, pull / PULL_THRESHOLD));
        setProgress(ratio);
      } else {
        currentPull.current = 0;
        setProgress(0);
      }
    };

    const handleTouchEnd = () => {
      if (progress >= 1 || currentPull.current >= PULL_THRESHOLD) {
        setIsTriggered(true);
        onTriggerNext();
      } else {
        currentPull.current = 0;
        setProgress(0);
      }
      touchStartY.current = null;
    };

    // Desktop MouseWheel / Touchpad Handlers
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY <= 0) {
        // Scrolling up -> reset immediately
        wheelAccumulator.current = 0;
        setProgress(0);
        return;
      }

      if (isAtBottom()) {
        wheelAccumulator.current += Math.min(e.deltaY, 40);
        const ratio = Math.min(1, Math.max(0, wheelAccumulator.current / PULL_THRESHOLD));
        setProgress(ratio);

        if (wheelTimeout.current) clearTimeout(wheelTimeout.current);

        if (ratio >= 1) {
          setIsTriggered(true);
          onTriggerNext();
          return;
        }

        // Slowly decay if user stops scrolling
        wheelTimeout.current = setTimeout(() => {
          wheelAccumulator.current = 0;
          setProgress(0);
        }, 300);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('wheel', handleWheel);
      if (wheelTimeout.current) clearTimeout(wheelTimeout.current);
    };
  }, [nextChapter, isTriggered, progress, onTriggerNext]);

  // Radius & Circumference for SVG Progress Ring
  const radius = 24;
  const stroke = 3;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - progress * circumference;

  if (!nextChapter) {
    return (
      <div className="w-full py-12 px-4 flex flex-col items-center justify-center text-center gap-4 bg-zinc-950 border-t border-zinc-850 my-6">
        <span className="text-xs text-emerald-400 font-semibold bg-emerald-950/60 px-4 py-2 rounded-xl border border-emerald-900/80 shadow-inner">
          Kamu telah membaca chapter terbaru!
        </span>
        {mangaId && (
          <Link
            href={`/manga/${mangaId}`}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Kembali ke Daftar Chapter
          </Link>
        )}
      </div>
    );
  }

  const isFull = progress >= 1 || isTriggered;

  return (
    <div
      data-testid="pull-up-container"
      className="w-full py-12 px-4 flex flex-col items-center justify-center text-center gap-4 bg-zinc-950 border-t border-zinc-850 select-none my-6 transition-all"
    >
      {/* Circular Progress Ring */}
      <div
        data-testid="pull-up-progress-ring"
        className="relative flex items-center justify-center w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 shadow-lg shadow-black/50 transition-transform active:scale-95"
      >
        <svg
          height={radius * 2}
          width={radius * 2}
          className="transform -rotate-90"
        >
          {/* Background Ring */}
          <circle
            stroke="#27272a"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Active Animated Fill Ring */}
          <circle
            stroke={isFull ? '#10b981' : '#3b82f6'}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            className="transition-all duration-75 ease-out"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>

        {/* Center Indicator Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isFull ? (
            <Check className="w-5 h-5 text-emerald-400 animate-bounce" />
          ) : (
            <ArrowUp
              className={`w-5 h-5 transition-transform duration-150 ${
                progress > 0.6 ? 'text-blue-400 -translate-y-0.5' : 'text-zinc-500'
              }`}
            />
          )}
        </div>
      </div>

      {/* Dynamic Instruction & Next Chapter Badge */}
      <div className="flex flex-col items-center gap-1">
        <span
          className={`text-xs font-semibold tracking-wide transition-colors ${
            isFull ? 'text-emerald-400' : progress > 0 ? 'text-blue-400' : 'text-zinc-300'
          }`}
        >
          {isFull
            ? `Lepas untuk membaca Chapter ${nextChapter.chapter}`
            : progress > 0
            ? `Tarik lagi untuk ke Chapter ${nextChapter.chapter}`
            : `Scroll ke atas untuk lanjut ke Chapter ${nextChapter.chapter}`}
        </span>
        <span className="text-[11px] text-zinc-500 font-medium">
          Tarik hingga lingkaran penuh untuk membuka otomatis
        </span>
      </div>

      {mangaId && (
        <Link
          href={`/manga/${mangaId}`}
          className="text-xs text-zinc-500 hover:text-zinc-300 mt-2 transition-colors"
        >
          Kembali ke Daftar Chapter
        </Link>
      )}
    </div>
  );
}

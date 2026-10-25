'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CleanPaginationProps {
  page: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  activeColorClass?: string;
}

export function CleanPagination({
  page,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  activeColorClass = 'text-blue-400',
}: CleanPaginationProps) {
  return (
    <div className="flex items-center justify-between px-1 mt-3">
      <button
        onClick={onPrev}
        disabled={!hasPrev}
        aria-label="Sebelumnya"
        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
          hasPrev
            ? 'text-zinc-300 bg-zinc-900 border-zinc-800 hover:text-white hover:bg-zinc-850'
            : 'text-zinc-600 bg-zinc-950/60 border-zinc-900 cursor-not-allowed'
        }`}
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        <span>Prev</span>
      </button>

      {/* Clean Single Page Number Badge */}
      <div
        className={`w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-xs shadow-inner ${activeColorClass}`}
      >
        {page}
      </div>

      <button
        onClick={onNext}
        disabled={!hasNext}
        aria-label="Selanjutnya"
        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
          hasNext
            ? 'text-zinc-200 bg-zinc-900 border-zinc-800 hover:text-white hover:bg-zinc-850'
            : 'text-zinc-600 bg-zinc-950/60 border-zinc-900 cursor-not-allowed'
        }`}
      >
        <span>Next</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

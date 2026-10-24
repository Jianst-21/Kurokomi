'use client';

import React from 'react';
import { Palette, Layers } from 'lucide-react';
import { ComicType } from '@/lib/types';
import { GENRE_TAG_IDS } from '@/lib/mangadex';

interface FilterBarProps {
  activeType: ComicType;
  isColor: boolean;
  activeGenre: string;
  onTypeChange: (type: ComicType) => void;
  onColorToggle: () => void;
  onGenreChange: (genre: string) => void;
}

const TYPE_OPTIONS: { label: string; value: ComicType }[] = [
  { label: 'Semua', value: 'all' },
  { label: 'Manhwa', value: 'manhwa' },
  { label: 'Manga', value: 'manga' },
  { label: 'Manhua', value: 'manhua' },
];

const GENRES = Object.keys(GENRE_TAG_IDS).map(g => ({
  value: g,
  label: g.charAt(0).toUpperCase() + g.slice(1),
}));

export function FilterBar({
  activeType,
  isColor,
  activeGenre,
  onTypeChange,
  onColorToggle,
  onGenreChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-2.5 py-2">
      {/* Type & Color Row */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5">
        <div className="flex items-center gap-1.5 flex-nowrap">
          {TYPE_OPTIONS.map(opt => {
            const isActive = activeType === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onTypeChange(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Color Toggle */}
        <button
          onClick={onColorToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
            isColor
              ? 'bg-amber-500 text-zinc-950 font-semibold shadow-sm shadow-amber-500/20'
              : 'bg-zinc-800/80 text-zinc-400 border border-zinc-700/60 hover:text-zinc-200'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Berwarna</span>
        </button>
      </div>

      {/* Genre Selector Row */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          onClick={() => onGenreChange('')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
            !activeGenre
              ? 'bg-zinc-700 text-zinc-100'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Layers className="w-3 h-3" />
          <span>Semua Genre</span>
        </button>
        {GENRES.map(g => {
          const isActive = activeGenre === g.value;
          return (
            <button
              key={g.value}
              onClick={() => onGenreChange(isActive ? '' : g.value)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-zinc-100 text-zinc-900 font-semibold'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
              }`}
            >
              {g.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

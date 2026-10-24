'use client';

import React from 'react';
import { X, Palette, Check, RotateCcw } from 'lucide-react';
import { ComicType } from '@/lib/types';
import { GENRE_TAG_IDS } from '@/lib/mangadex';

interface SearchFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeType: ComicType;
  isColor: boolean;
  activeGenre: string;
  onTypeChange: (type: ComicType) => void;
  onColorToggle: () => void;
  onGenreChange: (genre: string) => void;
  onReset: () => void;
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

export function SearchFilterModal({
  isOpen,
  onClose,
  activeType,
  isColor,
  activeGenre,
  onTypeChange,
  onColorToggle,
  onGenreChange,
  onReset,
}: SearchFilterModalProps) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h3 className="text-sm font-bold text-zinc-100">Filter Pencarian</h3>
          <button
            onClick={onClose}
            aria-label="Tutup filter"
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 no-scrollbar">
          {/* Tipe Komik */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              Tipe Komik
            </label>
            <div className="grid grid-cols-4 gap-2">
              {TYPE_OPTIONS.map(opt => {
                const isActive = activeType === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => onTypeChange(opt.value)}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold text-center transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                        : 'bg-zinc-850 text-zinc-400 border border-zinc-750 hover:text-zinc-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Format / Warna */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              Format
            </label>
            <button
              onClick={onColorToggle}
              className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all ${
                isColor
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-zinc-850 border-zinc-750 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-amber-400" />
                <span>Hanya Tampilkan Berwarna (Full Color)</span>
              </div>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                  isColor
                    ? 'bg-amber-500 border-amber-400 text-zinc-950'
                    : 'border-zinc-700 bg-zinc-900'
                }`}
              >
                {isColor && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </button>
          </div>

          {/* Genre */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Genre
              </label>
              {activeGenre && (
                <button
                  onClick={() => onGenreChange('')}
                  className="text-[11px] text-blue-400 hover:underline"
                >
                  Reset Genre
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onGenreChange('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  !activeGenre
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-zinc-850 text-zinc-400 border border-zinc-750 hover:text-zinc-200'
                }`}
              >
                Semua Genre
              </button>
              {GENRES.map(g => {
                const isActive = activeGenre === g.value;
                return (
                  <button
                    key={g.value}
                    onClick={() => onGenreChange(isActive ? '' : g.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/30'
                        : 'bg-zinc-850 text-zinc-400 border border-zinc-750 hover:text-zinc-200'
                    }`}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 flex items-center gap-3 bg-zinc-900/95">
          <button
            onClick={onReset}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-xs font-semibold text-zinc-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/30 transition-all text-center"
          >
            Terapkan Filter
          </button>
        </div>
      </div>
    </div>
  );
}

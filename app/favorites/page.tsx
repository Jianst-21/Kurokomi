'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bookmark, Compass } from 'lucide-react';
import { ComicCardItem } from '@/lib/types';
import { getFavorites, exportUserData, importUserData } from '@/lib/storage';
import { ComicCard } from '@/components/ComicCard';
import { BottomNav } from '@/components/BottomNav';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<ComicCardItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    setFavorites(getFavorites());
  }, []);

  const handleExport = () => {
    try {
      const data = exportUserData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kurokomi-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage('Data berhasil dicadangkan');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      setStatusMessage('Gagal mencadangkan data');
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importUserData(content);
      if (res.success) {
        setFavorites(getFavorites());
        setStatusMessage(`Berhasil memulihkan ${res.count} data`);
      } else {
        setStatusMessage(res.error || 'Gagal memulihkan data');
      }
      setTimeout(() => setStatusMessage(null), 3000);
    };
    reader.onerror = () => {
      setStatusMessage('Gagal membaca file');
      setTimeout(() => setStatusMessage(null), 3000);
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-zinc-950 pb-24 text-zinc-100 flex flex-col">
      {/* Hidden File Input for Data Restore */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-blue-500 fill-current" />
            <h1 className="text-sm font-bold text-zinc-100">Favorit Saya</h1>
            {mounted && favorites.length > 0 && (
              <span className="text-[10px] text-zinc-500 font-medium">
                ({favorites.length})
              </span>
            )}
          </div>

          {/* Minimalist Data Actions */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={handleExport}
              title="Cadangkan data ke file JSON"
              className="px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 text-[11px] font-medium transition-colors"
            >
              Ekspor
            </button>
            <button
              onClick={handleImportClick}
              title="Pulihkan data dari file JSON"
              className="px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 text-[11px] font-medium transition-colors"
            >
              Impor
            </button>
          </div>
        </div>
      </header>

      {/* Status Notification */}
      {statusMessage && (
        <div className="max-w-md mx-auto w-full px-4 pt-2">
          <div className="py-1.5 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-center text-xs text-blue-400 font-medium animate-fade-in">
            {statusMessage}
          </div>
        </div>
      )}

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

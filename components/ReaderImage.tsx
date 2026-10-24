'use client';

import React, { useState } from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';

interface ReaderImageProps {
  src: string;
  pageIndex: number;
}

export function ReaderImage({ src, pageIndex }: ReaderImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setError(false);
    setLoaded(false);
    setRetryKey(k => k + 1);
  };

  return (
    <div className="relative w-full min-h-[300px] flex items-center justify-center bg-zinc-950">
      {/* Loading Skeleton */}
      {!loaded && !error && (
        <div className="absolute inset-0 bg-zinc-900/60 animate-pulse flex items-center justify-center">
          <span className="text-xs text-zinc-600 font-mono">Halaman {pageIndex + 1}</span>
        </div>
      )}

      {/* Error Retry Overlay */}
      {error && (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-900/80 rounded-xl my-4 gap-2 text-center border border-zinc-800">
          <AlertCircle className="w-6 h-6 text-rose-400" />
          <span className="text-xs text-zinc-300">Gagal memuat halaman {pageIndex + 1}</span>
          <button
            onClick={handleRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 mt-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Coba Muat Ulang</span>
          </button>
        </div>
      )}

      {/* Image Element */}
      {!error && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={retryKey}
          src={src}
          alt={`Halaman ${pageIndex + 1}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`w-full h-auto block select-none transition-opacity duration-200 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
}

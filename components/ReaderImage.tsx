'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';

interface ReaderImageProps {
  src: string;
  fallbackSrc?: string;
  pageIndex: number;
  fitContain?: boolean;
  globalRetryKey?: number;
  onErrorChange?: (pageIndex: number, hasError: boolean) => void;
  isTopError?: boolean;
  onRetryAll?: () => void;
}

export function ReaderImage({
  src,
  fallbackSrc,
  pageIndex,
  fitContain = false,
  globalRetryKey = 0,
  onErrorChange,
  isTopError = false,
  onRetryAll,
}: ReaderImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [error, setError] = useState(false);
  const [hasTriedFallback, setHasTriedFallback] = useState(false);
  const [hasTriedProxy, setHasTriedProxy] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setCurrentSrc(src);
    setError(false);
    setHasTriedFallback(false);
    setHasTriedProxy(false);
    onErrorChange?.(pageIndex, false);
  }, [src, pageIndex, onErrorChange]);

  useEffect(() => {
    if (globalRetryKey > 0) {
      setError(false);
      setHasTriedFallback(false);
      setHasTriedProxy(false);
      setCurrentSrc(src);
      setRetryKey(k => k + 1);
      onErrorChange?.(pageIndex, false);
    }
  }, [globalRetryKey, src, pageIndex, onErrorChange]);

  const handleImageError = () => {
    if (fallbackSrc && !hasTriedFallback && currentSrc !== fallbackSrc) {
      setHasTriedFallback(true);
      setCurrentSrc(fallbackSrc);
    } else if (!hasTriedProxy && !currentSrc.startsWith('/api/image-proxy')) {
      // Automatic fallback via Kurokomi server image proxy to bypass ISP blocking & hotlink issues
      setHasTriedProxy(true);
      setCurrentSrc(`/api/image-proxy?url=${encodeURIComponent(src)}`);
    } else {
      setError(true);
      onErrorChange?.(pageIndex, true);
    }
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setError(false);
    setHasTriedFallback(false);
    setHasTriedProxy(false);
    setCurrentSrc(src);
    setRetryKey(k => k + 1);
    onErrorChange?.(pageIndex, false);
  };

  if (error) {
    return (
      <div className="w-full py-8 px-4 flex flex-col items-center justify-center bg-zinc-900/80 my-1 gap-2 text-center border border-zinc-800">
        <AlertCircle className="w-5 h-5 text-rose-400" />
        <span className="text-xs text-zinc-300">Gagal memuat halaman {pageIndex + 1}</span>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={handleRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-xs text-zinc-200 transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Coba Muat Ulang</span>
          </button>
          {isTopError && onRetryAll && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRetryAll();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Muat Ulang Semua</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={`${currentSrc}-${retryKey}`}
      src={currentSrc}
      alt={`Halaman ${pageIndex + 1}`}
      loading={pageIndex < 4 ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={handleImageError}
      className={
        fitContain
          ? "max-h-[100dvh] max-w-full w-auto h-auto block m-auto border-0 outline-none select-none bg-black object-contain pointer-events-none"
          : "w-full h-auto block m-0 p-0 border-0 outline-none select-none bg-black pointer-events-none"
      }
    />
  );
}

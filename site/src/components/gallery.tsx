"use client";

import { useState, useEffect, useCallback } from "react";

// Статический массив фото
const PHOTOS = [
  "/file_179.jpg", "/file_180.jpg", "/file_181.jpg",
  "/file_175.jpg", "/file_176.jpg", "/file_177.jpg",
  "/file_171.jpg", "/file_172.jpg", "/file_173.jpg",
  "/file_174.jpg", "/file_178.jpg", "/file_150.jpg",
  "/file_151.jpg", "/file_152.jpg", "/file_153.jpg",
  "/file_154.jpg"
];

export default function Gallery() {
  const [selected, setSelected] = useState<number | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (selected === null) return;
    if (e.key === "Escape") setSelected(null);
    if (e.key === "ArrowRight")
      setSelected((selected + 1) % PHOTOS.length);
    if (e.key === "ArrowLeft")
      setSelected((selected - 1 + PHOTOS.length) % PHOTOS.length);
  }, [selected]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const grid = [];
  for (let i = 0; i < PHOTOS.length; i += 4) {
    const row = PHOTOS.slice(i, i + 4);
    grid.push(row);
  }

  return (
    <>
      <div className="mx-auto mt-12 max-w-6xl space-y-4">
        {grid.map((row, ri) => (
          <div key={ri} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {row.map((photo, ci) => {
              const idx = ri * 4 + ci;
              return (
                <button
                  key={photo}
                  onClick={() => setSelected(idx)}
                  className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-800 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <img
                    src={photo}
                    alt=""
                    className="h-full w-full object-cover transition-all duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 transition-all duration-300 group-hover:bg-black/20" />
                </button>
              );
            })}
            {/* Заполняем пустые ячейки, если строка неполная */}
            {row.length < 4 &&
              Array.from({ length: 4 - row.length }).map((_, ci) => (
                <div key={"empty-" + ci} />
              ))}
          </div>
        ))}
      </div>

      {/* Lightbox / карусель */}
      {selected !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelected((selected - 1 + PHOTOS.length) % PHOTOS.length);
            }}
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur transition hover:bg-white/25 sm:left-8"
            aria-label="Предыдущее"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>

          <img
            src={PHOTOS[selected]}
            alt=""
            className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelected((selected + 1) % PHOTOS.length);
            }}
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur transition hover:bg-white/25 sm:right-8"
            aria-label="Следующее"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>

          <button
            onClick={() => setSelected(null)}
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white backdrop-blur transition hover:bg-white/25"
            aria-label="Закрыть"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          {/* Счётчик */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-sm text-white backdrop-blur">
            {selected + 1} / {PHOTOS.length}
          </div>
        </div>
      )}
    </>
  );
}

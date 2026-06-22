"use client";

import { useState } from "react";

const photos = [
  "/photo-aec7e416-1bdd-47bd-a2c2-0ed2161d67f4.jpg",
  "/photo-92264ebb-380e-48d0-a3d4-3f3a699bf696.jpg",
  "/photo-68bd6b1e-39a5-4ca7-8a1d-1dbb1651def0.jpg",
  "/photo-2d11d1a8-51cc-4bfd-929f-c70519d97ba6.jpg",
  "/photo-d5c9afc7-3104-4f11-8072-94d78f99a446.jpg",
  "/photo-99bfa5f0-fd97-4cad-8e45-50779c5cb066.jpg",
  "/photo-2d455f8f-363d-4d05-b9e1-70a6e6686263.jpg",
  "/photo-44d9201f-1846-4190-a2b5-b6adff120b83.jpg",
];

export function PhotoGrid() {
  const [open, setOpen] = useState<number | null>(null);

  const close = () => setOpen(null);
  const prev = () => setOpen((open !== null) ? (open - 1 + photos.length) % photos.length : null);
  const next = () => setOpen((open !== null) ? (open + 1) % photos.length : null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {photos.map((src, i) => (
          <button
            key={i}
            onClick={() => setOpen(i)}
            className="group relative aspect-square overflow-hidden rounded-2xl bg-slate-200"
          >
            <img
              src={src}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {open !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={close}
        >
          <button
            onClick={(e) => { e.stopPropagation(); close(); }}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/40"
          >
            ✕
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-2xl text-white transition hover:bg-white/40"
          >
            ←
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-2xl text-white transition hover:bg-white/40"
          >
            →
          </button>

          <div className="flex h-[80vh] w-[90vw] items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={photos[open]}
              alt=""
              className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}

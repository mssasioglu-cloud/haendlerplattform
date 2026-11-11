"use client";
import { useState } from "react";

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  if (images.length === 0) {
    return <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-brand-50 text-sm text-muted">Keine Fotos vorhanden</div>;
  }
  const go = (d: number) => setI((o) => (o + d + images.length) % images.length);
  return (
    <div>
      <div className="relative overflow-hidden rounded-xl bg-ink">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[i]} alt={`${alt}, Foto ${i + 1} von ${images.length}`} className="aspect-[4/3] w-full object-contain" />
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Vorheriges Foto" className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-lg font-bold">‹</button>
            <button type="button" onClick={() => go(1)} aria-label="Nächstes Foto" className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-lg font-bold">›</button>
            <span className="badge absolute bottom-2 right-2 bg-ink/80 text-white">{i + 1} / {images.length}</span>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, n) => (
            <button key={src} type="button" onClick={() => setI(n)} aria-label={`Foto ${n + 1} anzeigen`}
              className={`shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 ${n === i ? "border-brand-600" : "border-transparent"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-14 w-20 object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

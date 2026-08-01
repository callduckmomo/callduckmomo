"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";

export default function MovieGallery({ posters }: { posters: string[] }) {
  const [selectedPoster, setSelectedPoster] = useState<string | null>(null);

  return (
    <>
      <div className="columns-2 gap-3 sm:gap-4 md:gap-6 space-y-3 sm:space-y-4 md:space-y-6">
        {posters.map((poster, index) => (
          <div
            key={index}
            onClick={() => setSelectedPoster(poster)}
            className="relative w-full overflow-hidden rounded-2xl border border-[#fed7aa]/40 bg-zinc-50 shadow-md cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-[var(--theme-color)]/60 break-inside-avoid"
          >
            <img
              src={poster}
              alt={`Movie Poster ${index + 1}`}
              className="w-full h-auto object-contain block"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      <Dialog open={!!selectedPoster} onOpenChange={(open) => !open && setSelectedPoster(null)}>
        <DialogContent className="max-w-[90vw] md:max-w-[600px] p-2 border-none bg-transparent shadow-none flex items-center justify-center focus-visible:outline-none">
          <DialogTitle className="sr-only">รูปภาพหนังใหม่ขนาดเต็ม</DialogTitle>
          <div className="relative w-full max-h-[85vh] flex items-center justify-center overflow-hidden rounded-2xl bg-black/5 shadow-2xl">
            <button
              onClick={() => setSelectedPoster(null)}
              className="absolute top-4 right-4 z-50 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 transition"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
            {selectedPoster && (
              <img
                src={selectedPoster}
                alt="Full Movie Poster"
                className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import { Logo } from "@/components/brand";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center rounded-2xl bg-muted p-16">
        <Logo className="w-full opacity-20" />
      </div>
    );
  }
  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto md:w-20 md:flex-col">
          {images.map((src, i) => (
            <button
              key={src}
              onClick={() => setActive(i)}
              aria-label={`Ver foto ${i + 1}`}
              className={cn(
                "relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-lg border-2 md:w-full",
                i === active ? "border-foreground" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <Image src={src} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
      <div className="relative aspect-[3/4] flex-1 overflow-hidden rounded-2xl bg-muted">
        <Image src={images[active]} alt={name} fill priority sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
      </div>
    </div>
  );
}

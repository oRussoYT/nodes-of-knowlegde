"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { motionAllowed } from "./motion";
import { RevealImage } from "./RevealImage";

// "Who was there": a row of large photographs that travels sideways while the
// page scrolls down (pinned). Below 768px, or with motion off, it stacks.
export interface RailPhoto {
  src: string;
  alt: string;
  place: string;
  caption: string;
  tall?: boolean;
}

export function PhotoRail({ photos, heading }: { photos: readonly RailPhoto[]; heading: ReactNode }) {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 768px)");
    const decide = () => setPinned(wide.matches && motionAllowed());
    const t = window.setTimeout(decide, 0);
    wide.addEventListener("change", decide);
    return () => {
      window.clearTimeout(t);
      wide.removeEventListener("change", decide);
    };
  }, []);

  useEffect(() => {
    if (!pinned) return;
    const s = section.current;
    const tr = track.current;
    if (!s || !tr) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = s.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const k = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      const distance = Math.max(0, tr.scrollWidth - window.innerWidth);
      tr.style.transform = `translate3d(${-k * distance}px, 0, 0)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
      tr.style.transform = "";
    };
  }, [pinned]);

  return (
    <section
      ref={section}
      aria-labelledby="rail-heading"
      className="relative bg-nk-ink text-nk-bone"
      style={pinned ? { height: `${photos.length * 70 + 100}vh` } : undefined}
    >
      <div className={pinned ? "sticky top-0 flex h-screen flex-col justify-center overflow-hidden" : "py-20"}>
        <div className="px-6 sm:px-10">{heading}</div>
        <div
          ref={track}
          className={pinned ? "mt-10 flex w-max items-end gap-8 px-6 will-change-transform sm:px-10" : "mt-10 grid gap-10 px-6 sm:px-10"}
        >
          {photos.map((p, i) => (
            <figure key={p.src} className={pinned ? (p.tall ? "w-[min(30rem,40vw)]" : "w-[min(46rem,60vw)]") : ""}>
              <RevealImage
                src={p.src}
                alt={p.alt}
                sizes="(min-width: 768px) 60vw, 100vw"
                className={pinned ? (p.tall ? "h-[62vh] rounded-2xl" : "h-[50vh] rounded-2xl") : "aspect-[4/3] rounded-2xl"}
              />
              <figcaption className="mt-4 flex gap-4">
                <span className="font-display text-sm font-bold tabular-nums text-nk-lime">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="block font-display text-2xl font-bold tracking-tight">{p.place}</span>
                  <span className="mt-1 block max-w-md text-[#c3c8b6]">{p.caption}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

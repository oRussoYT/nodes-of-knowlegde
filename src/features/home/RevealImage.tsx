"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/ui/cn";

import { motionAllowed } from "./motion";

// A photo that wipes in from the bottom when it reaches the screen and then
// drifts slightly against the scroll (parallax) inside its frame.
export function RevealImage({
  src,
  alt,
  className,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  drift = 60,
  eager = false,
}: {
  /** Base name in /public/photos, e.g. "camp" for camp-960.jpg / camp-1920.jpg. */
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  /** Maximum parallax drift in pixels. */
  drift?: number;
  eager?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Kept in state (not classList) so parent re-renders don't wipe it.
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!motionAllowed()) {
      const t = window.setTimeout(() => setShown(true), 0);
      return () => window.clearTimeout(t);
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);

    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.bottom < -100 || r.top > vh + 100) return;
      const k = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2); // -1 … 1
      el.style.setProperty("--nk-py", `${(-k * drift).toFixed(1)}px`);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [drift]);

  return (
    <div ref={ref} className={cn("nk-reveal relative overflow-hidden bg-nk-ink-2", shown && "is-in", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- self-hosted, pre-sized photos with srcset */}
      <img
        src={`/photos/${src}-1920.jpg`}
        srcSet={`/photos/${src}-960.jpg 960w, /photos/${src}-1920.jpg 1920w`}
        sizes={sizes}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className="absolute inset-0 size-full object-cover"
      />
    </div>
  );
}

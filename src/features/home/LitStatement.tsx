"use client";

import { motionAllowed } from "./motion";

import { useEffect, useRef, useState } from "react";

// A statement whose words light up one by one as it scrolls through the
// screen (moss → bone, both readable on ink). With reduced motion every word
// is lit from the start.
export function LitStatement({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const words = text.split(" ");
  const [lit, setLit] = useState(words.length);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!motionAllowed()) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the block's top reaches 85% of the screen, 1 when its bottom reaches 45%.
      const k = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.4)));
      setLit(Math.round(k * words.length));
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
    };
  }, [words.length]);

  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className={i < lit ? "nk-lit is-on" : "nk-lit"}>
          {w}{" "}
        </span>
      ))}
    </p>
  );
}

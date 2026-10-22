"use client";

import { motionAllowed } from "./motion";

import { useEffect, useState } from "react";

// Opening counter, Lando-style: 0 → 100 while a lime bar fills, then the ink
// curtain lifts (globals.css .nk-preloader). Shown once per browser session,
// never blocks clicks (pointer-events: none), hidden from assistive tech, and
// skipped entirely with reduced motion.
export function Preloader() {
  const [show, setShow] = useState(true);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("nk-intro") === "1";
      sessionStorage.setItem("nk-intro", "1");
    } catch {
      /* storage unavailable: just show it */
    }
    const reduce = !motionAllowed();
    if (seen || reduce) {
      const t = window.setTimeout(() => setShow(false), 0);
      return () => window.clearTimeout(t);
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / 1100);
      setCount(Math.round(100 * (1 - Math.pow(1 - k, 3))));
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const done = window.setTimeout(() => setShow(false), 2200);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(done);
    };
  }, []);

  if (!show) return null;
  return (
    <div aria-hidden="true" className="nk-preloader flex flex-col justify-end">
      <div className="flex items-end justify-between px-6 pb-6 sm:px-10 sm:pb-10">
        <span className="font-display text-xl font-extrabold [font-stretch:115%]">Nodes BDFFP</span>
        <span className="font-display text-[22vw] font-bold leading-[0.8] tabular-nums tracking-tighter text-nk-lime [font-stretch:75%] sm:text-[14vw]">
          {count}
        </span>
      </div>
      <div className="nk-preloader-bar" />
    </div>
  );
}

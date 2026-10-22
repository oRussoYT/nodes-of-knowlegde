"use client";

import { useEffect, useState } from "react";

import { MOTION_KEY, motionAllowed } from "./motion";

// A visible switch that stops every animation on the home page (and is
// remembered in this browser). Turning motion back on reloads the page so the
// scroll effects start cleanly.
export function MotionToggle() {
  const [on, setOn] = useState(true);

  useEffect(() => {
    const allowed = motionAllowed();
    const main = document.querySelector("main.nk-motion");
    if (main) main.setAttribute("data-motion", allowed ? "on" : "off");
    const t = window.setTimeout(() => setOn(allowed), 0);
    return () => window.clearTimeout(t);
  }, []);

  const toggle = () => {
    const next = !on;
    try {
      localStorage.setItem(MOTION_KEY, next ? "on" : "off");
    } catch {
      /* not remembered, still applied */
    }
    if (next) {
      window.location.reload();
      return;
    }
    setOn(false);
    document.querySelector("main.nk-motion")?.setAttribute("data-motion", "off");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={!on}
      className="fixed bottom-4 left-4 z-[80] rounded-full border border-nk-ink-3 bg-nk-ink/85 px-4 py-2 text-xs font-medium text-nk-bone backdrop-blur hover:border-nk-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nk-lime"
    >
      {on ? "Motion off" : "Motion on"}
    </button>
  );
}

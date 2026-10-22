"use client";

import { useEffect } from "react";

import { motionAllowed } from "./motion";

// Inertial ("buttery") wheel scrolling for the home page, the way racing and
// studio sites feel: the wheel sets a target and the page glides to it.
// Mouse/trackpad wheels only; keyboard, scrollbar and touch stay native.
export function SmoothScroll() {
  useEffect(() => {
    if (!motionAllowed()) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let target = window.scrollY;
    let current = window.scrollY;
    let frame = 0;
    let gliding = false;

    const max = () => document.documentElement.scrollHeight - window.innerHeight;

    const step = () => {
      current += (target - current) * 0.09;
      if (Math.abs(target - current) < 0.5) {
        current = target;
        gliding = false;
      }
      window.scrollTo(0, current);
      frame = gliding ? requestAnimationFrame(step) : 0;
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.defaultPrevented) return;
      const el = e.target instanceof Element ? e.target.closest("[data-native-scroll], [role='dialog']") : null;
      if (el) return;
      e.preventDefault();
      if (!gliding) current = window.scrollY;
      const delta = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
      target = Math.max(0, Math.min(max(), (gliding ? target : window.scrollY) + delta));
      if (!gliding) {
        gliding = true;
        frame = requestAnimationFrame(step);
      }
    };
    const onScroll = () => {
      if (!gliding) {
        target = window.scrollY;
        current = window.scrollY;
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}

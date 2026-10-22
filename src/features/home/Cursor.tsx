"use client";

import { useEffect, useRef } from "react";

// A lime cursor dot that trails the pointer and swells over anything
// clickable, plus "magnetic" pull on elements marked data-magnetic. Pointer
// devices only; nothing runs with reduced motion or on touch screens.
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = dot.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let tx = x;
    let ty = y;
    let frame = 0;
    el.style.opacity = "0";

    const loop = () => {
      x += (tx - x) * 0.2;
      y += (ty - y) * 0.2;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      el.style.opacity = "1";
      const target = e.target instanceof Element ? e.target.closest("a, button, [data-cursor]") : null;
      el.classList.toggle("is-big", Boolean(target));
    };
    const onLeave = () => {
      el.style.opacity = "0";
    };

    const magnets = Array.from(document.querySelectorAll<HTMLElement>("[data-magnetic]"));
    const pull = (m: HTMLElement) => (e: PointerEvent) => {
      const r = m.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) * 0.3;
      const dy = (e.clientY - (r.top + r.height / 2)) * 0.35;
      m.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const release = (m: HTMLElement) => () => {
      m.style.transform = "";
    };
    const handlers = magnets.map((m) => {
      const move = pull(m);
      const leave = release(m);
      m.style.transition = "transform 500ms cubic-bezier(0.19, 1, 0.22, 1)";
      m.addEventListener("pointermove", move);
      m.addEventListener("pointerleave", leave);
      return { m, move, leave };
    });

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      handlers.forEach(({ m, move, leave }) => {
        m.removeEventListener("pointermove", move);
        m.removeEventListener("pointerleave", leave);
      });
    };
  }, []);

  return <div ref={dot} aria-hidden="true" className="nk-cursor" />;
}

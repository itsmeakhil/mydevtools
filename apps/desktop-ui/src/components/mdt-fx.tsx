"use client";

import { useEffect } from "react";
import { motion, useScroll } from "framer-motion";

/**
 * Marketing-only interaction layer:
 *  - top scroll-progress beam
 *  - cursor-following gradient border on every .glass-overlay card
 *    (sets --mx/--my; the glow itself is pure CSS, see globals.css)
 */
export function MdtFx() {
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      const card = target?.closest?.(".glass-overlay") as HTMLElement | null;
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <motion.div
      aria-hidden
      className="mdt-progress"
      style={{ scaleX: scrollYProgress }}
    />
  );
}

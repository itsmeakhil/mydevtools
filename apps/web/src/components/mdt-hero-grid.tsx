"use client";

import { useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";

/**
 * Interactive hero grid. A perspective grid layer that gently warps toward the
 * cursor — a spring-damped 3D tilt plus a radial "lens" mask that follows the
 * pointer, so the grid feels alive near the cursor and fades away from it.
 * Window-level listener (the layer is pointer-events:none, never blocks the UI).
 */
export function MdtHeroGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const sx = useSpring(mx, { stiffness: 90, damping: 18, mass: 0.5 });
  const sy = useSpring(my, { stiffness: 90, damping: 18, mass: 0.5 });

  const rotateX = useTransform(sy, [0, 1], [7, -7]);
  const rotateY = useTransform(sx, [0, 1], [-7, 7]);
  const gx = useTransform(sx, [0, 1], ["8%", "92%"]);
  const gy = useTransform(sy, [0, 1], ["10%", "90%"]);

  useEffect(() => {
    if (reduce) return;
    const onMove = (e: PointerEvent) => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      // ease back to center when the pointer leaves the hero
      if (x < -0.15 || x > 1.15 || y < -0.15 || y > 1.15) {
        mx.set(0.5);
        my.set(0.5);
        return;
      }
      mx.set(x);
      my.set(y);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce, mx, my]);

  return (
    <div ref={ref} className="mdt-herogrid" aria-hidden>
      <motion.div
        className="mdt-herogrid__layer"
        style={
          reduce
            ? undefined
            : ({ rotateX, rotateY, "--gx": gx, "--gy": gy } as React.CSSProperties)
        }
      />
    </div>
  );
}

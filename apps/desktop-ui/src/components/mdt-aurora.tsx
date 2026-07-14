"use client";

import { useEffect, useRef } from "react";

/**
 * Animated aurora gradient field rendered on a low-res 2D canvas and blurred
 * via CSS. GPU-cheap, pointer-reactive, pauses when offscreen/hidden, and
 * renders a single static frame under prefers-reduced-motion.
 */
export default function MdtAurora() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const blobs = [
      { x: 0.28, y: 0.32, r: 0.55, c: "91,99,240" },
      { x: 0.72, y: 0.4, r: 0.5, c: "154,92,242" },
      { x: 0.5, y: 0.72, r: 0.55, c: "79,208,230" },
    ];
    const pointer = { x: 0.5, y: 0.4, tx: 0.5, ty: 0.4 };
    let raf = 0;
    let t = 0;

    const resize = () => {
      canvas.width = Math.max(1, Math.floor(canvas.clientWidth * 0.4));
      canvas.height = Math.max(1, Math.floor(canvas.clientHeight * 0.4));
    };

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      blobs.forEach((b, i) => {
        const drift = reduce ? 0 : 0.11;
        const pull = (i === 0 ? 0.06 : 0.03);
        const px = (b.x + Math.sin(t * 0.0003 + i) * drift + (pointer.x - 0.5) * pull) * w;
        const py = (b.y + Math.cos(t * 0.00026 + i * 1.3) * drift + (pointer.y - 0.5) * pull) * h;
        const rad = b.r * Math.min(w, h) * 1.1;
        const g = ctx.createRadialGradient(px, py, 0, px, py, rad);
        g.addColorStop(0, `rgba(${b.c},0.55)`);
        g.addColorStop(1, `rgba(${b.c},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fill();
      });
      if (!reduce) {
        t += 16;
        raf = requestAnimationFrame(draw);
      }
    };

    const onPointer = (e: PointerEvent) => {
      pointer.tx = e.clientX / window.innerWidth;
      pointer.ty = e.clientY / window.innerHeight;
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="mdt-aurora" />;
}

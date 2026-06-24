"use client";

import { useEffect, useState } from "react";

/**
 * CRT boot loader. Plays once per hard document load (refresh), not on SPA
 * navigation — guarded by a module-level flag that resets only when a new JS
 * context is created. SSR-rendered so it covers first paint with no flash.
 */
let played = false;

const LINES: { label: string; ok?: string; ready?: boolean }[] = [
  { label: "boot mydevtools.os", ok: "v2.4.1" },
  { label: "post · memory check 64k", ok: "ok" },
  { label: "mount data engine [ sql · mongo · redis ]", ok: "ok" },
  { label: "load 60+ developer tools", ok: "ok" },
  { label: "init zero-knowledge vault [ aes-256 ]", ok: "ok" },
  { label: "warm aurora shaders", ok: "ok" },
  { label: "ready", ready: true },
];
const TOTAL = LINES.reduce((n, l) => n + l.label.length, 0);

export function MdtBoot() {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const [chars, setChars] = useState(0);
  const [leaving, setLeaving] = useState(false);
  // Already-played (SPA nav) → hidden from first render, no flash.
  // Fresh load (server + client hydration) → played is false → shows.
  const [hidden, setHidden] = useState(played);

  useEffect(() => {
    if (played) {
      setHidden(true);
      return;
    }
    played = true;

    if (prefersReduced) {
      setChars(TOTAL);
      const t = setTimeout(() => setLeaving(true), 550);
      return () => clearTimeout(t);
    }

    let c = 0;
    const id = setInterval(() => {
      c += 2;
      setChars(c);
      if (c >= TOTAL) {
        clearInterval(id);
        setTimeout(() => setLeaving(true), 520);
      }
    }, 13);
    return () => clearInterval(id);
  }, [prefersReduced]);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setHidden(true), 740);
    return () => clearTimeout(t);
  }, [leaving]);

  if (hidden) return null;

  let offset = 0;
  const pct = Math.min(100, Math.round((chars / TOTAL) * 100));

  return (
    <div className={`mdt-boot${leaving ? " mdt-boot--out" : ""}`} aria-hidden role="presentation">
      <div className="mdt-boot__vignette" />
      <div className="mdt-boot__sweep" />
      <div className="mdt-boot__screen mdt-boot__flicker">
        <div className="mdt-boot__title">MYDEVTOOLS</div>
        <div className="mdt-boot__term">
          {LINES.map((line, i) => {
            const start = offset;
            offset += line.label.length;
            const revealed = Math.max(0, Math.min(line.label.length, chars - start));
            if (revealed <= 0) return null;
            const done = revealed >= line.label.length;
            const isActive = chars >= start && chars < offset;
            const text = line.label.slice(0, revealed);
            return (
              <div className="mdt-boot__line" key={i}>
                <span className={line.ready ? "mdt-boot__ready" : undefined}>
                  {line.ready ? "" : "> "}
                  {text}
                  {isActive && <span className="mdt-boot__cursor" />}
                </span>
                {done && line.ok ? <span className="mdt-boot__ok">[ {line.ok} ]</span> : null}
                {done && line.ready ? <span className="mdt-boot__cursor" /> : null}
              </div>
            );
          })}
        </div>
        <div className="mdt-boot__bar">
          <div className="mdt-boot__barfill" style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
      </div>
      <div className="mdt-boot__scanlines" />
    </div>
  );
}

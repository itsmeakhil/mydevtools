"use client";

import { useEffect, useState } from "react";

/**
 * CRT-monitor boot loader. A drawn retro monitor with a boot/loader log typing
 * inside the screen, capped at ~3.5s, then dissolves. Plays once per hard load
 * (refresh) — a module flag skips it on SPA navigation. SSR-rendered so it
 * covers first paint with no flash. Honors prefers-reduced-motion.
 */
let played = false;

const CODE: { t: string; accent?: boolean }[] = [
  { t: "$ ./mydevtools --boot", accent: true },
  { t: "" },
  { t: "[0.01] fetching modules ............. ok" },
  { t: "[0.34] linking 60+ tools ............ ok" },
  { t: "[0.62] mount db [sql|mongo|redis] ... ok" },
  { t: "[0.88] decrypt vault [aes-256] ...... ok" },
  { t: "[1.21] hydrating interface .......... ok" },
  { t: "[1.43] warming aurora shaders ....... ok" },
  { t: "" },
  { t: "> launching mydevtools.tech", accent: true },
];
const TOTAL = CODE.reduce((n, l) => n + l.t.length, 0);
const CAP_MS = 3100; // hard cap before fade-out (+600ms fade ≈ 3.7s total)

export function MdtBoot() {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const [chars, setChars] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [hidden, setHidden] = useState(played);

  useEffect(() => {
    if (played) {
      setHidden(true);
      return;
    }
    played = true;

    if (prefersReduced) {
      setChars(TOTAL);
      const t = setTimeout(() => setLeaving(true), 700);
      return () => clearTimeout(t);
    }

    let c = 0;
    const id = setInterval(() => {
      c += 2;
      setChars(c);
      if (c >= TOTAL) clearInterval(id);
    }, 16);
    const cap = setTimeout(() => setLeaving(true), CAP_MS);
    return () => {
      clearInterval(id);
      clearTimeout(cap);
    };
  }, [prefersReduced]);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setHidden(true), 640);
    return () => clearTimeout(t);
  }, [leaving]);

  if (hidden) return null;

  let offset = 0;

  return (
    <div className={`crt-boot${leaving ? " crt-boot--out" : ""}`} aria-hidden role="presentation">
      <div className="crt">
        <div className="crt__monitor">
          <div className="crt__screen">
            <div className="crt__code crt__flicker">
              {CODE.map((line, i) => {
                const start = offset;
                offset += line.t.length;
                const begun = chars >= start;
                if (!begun) return null;
                const revealed = Math.min(line.t.length, chars - start);
                const active = chars >= start && chars < offset && line.t.length > 0;
                if (line.t.length === 0) return <div className="crt__line" key={i}>&nbsp;</div>;
                return (
                  <div className={`crt__line${line.accent ? " crt__accent" : ""}`} key={i}>
                    {line.t.slice(0, revealed)}
                    {active && <span className="crt__cursor" />}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="crt__brand">
            <span>MYDEVTOOLS · CRT-204</span>
            <span className="crt__led" />
          </div>
        </div>
        <div className="crt__neck" />
        <div className="crt__base" />
      </div>
    </div>
  );
}

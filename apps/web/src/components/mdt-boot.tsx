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
  { t: "$ mydevtools boot --env=production", accent: true },
  { t: "" },
  { t: "[boot ] reading config ............ ok" },
  { t: "[init ] next 16 · react 19 ........ ready" },
  { t: "[net  ] api.mydevtools.tech ....... 200" },
  { t: "[db   ] sql · mongo · redis ....... online" },
  { t: "[tools] registered 60 utilities ... ok" },
  { t: "[vault] aes-256 zero-knowledge .... sealed" },
  { t: "[gpu  ] compiling aurora shaders .. ok" },
  { t: "[cache] prefetch routes ........... warm" },
  { t: "[ok   ] all systems nominal" },
  { t: "" },
  { t: "> launching workspace", accent: true },
];
const TOTAL = CODE.reduce((n, l) => n + l.t.length, 0);
const TYPE_MS = 3000; // typing spans ~3s
const STEP = 2;
const CAP_MS = 3500; // safety cap before fade-out

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
    const tick = Math.max(8, Math.round(TYPE_MS / (TOTAL / STEP)));
    const id = setInterval(() => {
      c += STEP;
      setChars(c);
      if (c >= TOTAL) {
        clearInterval(id);
        setTimeout(() => setLeaving(true), 280);
      }
    }, tick);
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

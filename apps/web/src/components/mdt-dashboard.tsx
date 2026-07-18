"use client";

import { useEffect, useState } from "react";
import { Search, Play, ChevronDown } from "lucide-react";

// Palette matched to the revamped desktop app: graphite blue-black surfaces,
// one electric-indigo accent, hairline borders.
const C = {
  base: "#101218",
  panel: "#15171d",
  raised: "#1a1d24",
  hover: "#20242c",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.13)",
  ink: "#e9ebf1",
  muted: "#9aa1af",
  faint: "#6b7280",
  indigo: "#6d7cf5",
  green: "#34d399",
  cyan: "#38bdf8",
};

const NAV = ["Formatters", "Converters", "Security", "Network"];

const ROWS: [string, string, string, string][] = [
  ["1042", "ada@lovelace.dev", "pro", "2m"],
  ["1041", "linus@kernel.org", "team", "11m"],
  ["1040", "grace@hopper.io", "free", "1h"],
  ["1039", "alan@turing.ac", "pro", "3h"],
  ["1038", "margaret@nasa.gov", "team", "5h"],
];

const PLAN: Record<string, string> = {
  pro: C.indigo,
  team: C.cyan,
  free: C.faint,
};

/** Crisp vector mock of the revamped MyDevTools workspace — full-width canvas,
 *  grouped top-nav, Figma-style tabs, graphite + indigo. Interactive: blinking
 *  caret, live query-latency readout, roving row highlight. */
export function MdtDashboard() {
  const [ms, setMs] = useState(12);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setMs(9 + Math.floor(Math.random() * 9));
      setActive((r) => (r + 1) % ROWS.length);
    }, 1900);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="select-none overflow-hidden rounded-2xl shadow-2xl shadow-black/40"
      style={{ background: C.panel, border: `1px solid ${C.border}` }}
    >
      {/* Unified top bar — traffic lights · brand · version · grouped nav · ⌘K · avatar */}
      <div
        className="flex items-center gap-3 px-3.5 py-2.5"
        style={{ background: C.raised, borderBottom: `1px solid ${C.border}` }}
      >
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-rose-400/70" />
          <span className="h-3 w-3 rounded-full bg-amber-400/70" />
          <span className="h-3 w-3 rounded-full bg-emerald-400/70" />
        </div>

        <div className="ml-1 flex items-center gap-2">
          <span
            className="grid h-5 w-5 place-items-center rounded-[5px] text-[11px] font-bold"
            style={{ background: C.indigo, color: "#0b0d16" }}
          >
            ◆
          </span>
          <span className="text-[13px] font-semibold tracking-tight" style={{ color: C.ink }}>
            mydevtools
          </span>
          <span
            className="rounded border px-1.5 py-px font-mono text-[10px] leading-none"
            style={{ borderColor: C.border, background: C.hover, color: C.faint }}
          >
            v0.1.5
          </span>
        </div>

        {/* grouped category nav (labels reveal tools on hover in the real app) */}
        <div className="ml-1 hidden items-center gap-0.5 md:flex">
          {NAV.map((n, i) => (
            <span
              key={n}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium"
              style={{ color: i === 0 ? C.ink : C.muted, background: i === 0 ? C.hover : "transparent" }}
            >
              {n}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </span>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span
            className="hidden items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] sm:flex"
            style={{ borderColor: C.border, background: C.base, color: C.faint }}
          >
            <Search className="h-3 w-3" /> ⌘K
          </span>
          <span
            className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold"
            style={{ background: C.hover, color: C.ink, border: `1px solid ${C.border}` }}
          >
            A
          </span>
        </div>
      </div>

      {/* Figma-style tab strip */}
      <div
        className="flex items-end gap-0 px-2 pt-1.5 font-mono text-[11px]"
        style={{ background: C.raised, borderBottom: `1px solid ${C.border}` }}
      >
        <span
          className="relative -mb-px rounded-t-[7px] border border-b-0 px-3 py-1.5"
          style={{ background: C.panel, borderColor: C.border, color: C.ink }}
        >
          <span
            className="absolute inset-x-0 top-0 h-0.5 rounded-t-[7px]"
            style={{ background: C.indigo }}
          />
          query.sql
        </span>
        <span className="px-3 py-1.5" style={{ color: C.faint }}>schema</span>
        <span className="px-2 py-1.5" style={{ color: C.faint }}>+</span>
        <span className="ml-auto flex items-center gap-1.5 pb-1.5 pr-1 text-[10px]" style={{ color: C.muted }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: C.green }} />
          postgres@prod
        </span>
      </div>

      {/* editor */}
      <div className="space-y-1 px-4 py-3 font-mono text-[12px] leading-relaxed md:text-[13px]" style={{ background: C.panel }}>
        <div>
          <span style={{ color: C.indigo }}>SELECT</span>{" "}
          <span style={{ color: C.ink }}>id, email, plan, created</span>
        </div>
        <div>
          <span style={{ color: C.indigo }}>FROM</span> <span style={{ color: C.ink }}>users</span>
        </div>
        <div className="flex items-center">
          <span style={{ color: C.indigo }}>WHERE</span>
          <span style={{ color: C.ink }}>&nbsp;plan&nbsp;</span>
          <span style={{ color: C.cyan }}>!=</span>
          <span style={{ color: C.green }}>&nbsp;&apos;free&apos;</span>
          <span style={{ color: C.indigo }}>&nbsp;LIMIT</span>
          <span style={{ color: C.ink }}>&nbsp;5;</span>
          <span className="mdt-dash-caret ml-0.5 inline-block h-[1.05em] w-[7px] translate-y-[2px]" />
        </div>
      </div>

      {/* run bar */}
      <div
        className="flex items-center gap-2 px-4 py-2"
        style={{ background: C.raised, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}
      >
        <span
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold"
          style={{ background: C.indigo, color: "#0b0d16" }}
        >
          <Play className="h-3 w-3" /> Run
        </span>
        <span className="font-mono text-[10px]" style={{ color: C.faint }}>⌘↵</span>
      </div>

      {/* results */}
      <div className="px-2 py-2 font-mono text-[11px] md:text-[12px]" style={{ background: C.panel }}>
        <div
          className="grid grid-cols-[3rem_1fr_4rem_3rem] gap-2 px-2 pb-1.5 text-[10px] uppercase tracking-wider"
          style={{ color: C.faint }}
        >
          <span>id</span><span>email</span><span>plan</span><span>seen</span>
        </div>
        {ROWS.map((r, i) => (
          <div
            key={r[0]}
            className="grid grid-cols-[3rem_1fr_4rem_3rem] items-center gap-2 rounded-md px-2 py-1.5 transition-colors"
            style={
              i === active
                ? { background: "rgba(109,124,245,.12)", boxShadow: `inset 2px 0 0 ${C.indigo}` }
                : undefined
            }
          >
            <span style={{ color: C.faint }}>{r[0]}</span>
            <span className="truncate" style={{ color: C.muted }}>{r[1]}</span>
            <span>
              <span
                className="rounded px-1.5 py-0.5 text-[10px]"
                style={{ color: PLAN[r[2]], border: `1px solid ${PLAN[r[2]]}33` }}
              >
                {r[2]}
              </span>
            </span>
            <span style={{ color: C.faint }}>{r[3]}</span>
          </div>
        ))}
      </div>

      {/* status bar */}
      <div
        className="flex items-center justify-between px-4 py-2 font-mono text-[10px]"
        style={{ background: C.base, borderTop: `1px solid ${C.border}`, color: C.muted }}
      >
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: C.green }} />
          connected · offline
        </span>
        <span>{ROWS.length} rows · {ms} ms</span>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  Database,
  Braces,
  KeyRound,
  TerminalSquare,
  Lock,
  Bookmark,
  Search,
  Play,
} from "lucide-react";

const RAIL = [Database, Braces, KeyRound, TerminalSquare, Lock, Bookmark];

const ROWS: [string, string, string, string][] = [
  ["1042", "ada@lovelace.dev", "pro", "2m"],
  ["1041", "linus@kernel.org", "team", "11m"],
  ["1040", "grace@hopper.io", "free", "1h"],
  ["1039", "alan@turing.ac", "pro", "3h"],
  ["1038", "margaret@nasa.gov", "team", "5h"],
];

const PLAN: Record<string, string> = {
  pro: "var(--mdt-violet)",
  team: "var(--mdt-cyan)",
  free: "var(--mdt-faint)",
};

/** Crisp, vector mock of the MyDevTools workspace — sharp at any scale, with a
 *  blinking caret, a live query-latency readout and a roving row highlight. */
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
    <div className="glass-overlay select-none overflow-hidden rounded-2xl shadow-2xl shadow-violet-500/10">
      {/* chrome */}
      <div className="flex items-center gap-3 border-b border-[color:var(--mdt-border)] bg-white/[0.02] px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-rose-400/70" />
          <span className="h-3 w-3 rounded-full bg-amber-400/70" />
          <span className="h-3 w-3 rounded-full bg-emerald-400/70" />
        </div>
        <div className="mx-auto flex h-7 max-w-[60%] flex-1 items-center gap-2 rounded-md border border-[color:var(--mdt-border)] bg-black/30 px-3 font-mono text-[11px] text-[color:var(--mdt-muted)]">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--mdt-green)" }} />
          <span className="truncate">mydevtools.tech/app/sql-client</span>
        </div>
        <div className="hidden items-center gap-1.5 rounded-md border border-[color:var(--mdt-border)] bg-black/20 px-2 py-1 font-mono text-[10px] text-[color:var(--mdt-faint)] sm:flex">
          <Search className="h-3 w-3" /> ⌘K
        </div>
      </div>

      <div className="flex">
        {/* tool rail */}
        <div className="flex w-12 shrink-0 flex-col items-center gap-1.5 border-r border-[color:var(--mdt-border)] bg-black/20 py-3">
          {RAIL.map((Icon, i) => (
            <div
              key={i}
              className="grid h-8 w-8 place-items-center rounded-lg transition-colors"
              style={
                i === 0
                  ? { background: "var(--mdt-grad)", color: "#0a0b12" }
                  : { color: "var(--mdt-faint)" }
              }
            >
              <Icon className="h-[18px] w-[18px]" />
            </div>
          ))}
        </div>

        {/* main */}
        <div className="min-w-0 flex-1">
          {/* tabs */}
          <div className="flex items-center gap-1 border-b border-[color:var(--mdt-border)] px-3 pt-2 font-mono text-[11px]">
            <span className="border-b-2 px-3 py-1.5 text-[color:var(--mdt-text)]" style={{ borderColor: "var(--mdt-violet)" }}>
              query.sql
            </span>
            <span className="px-3 py-1.5 text-[color:var(--mdt-faint)]">schema</span>
            <span className="px-2 py-1.5 text-[color:var(--mdt-faint)]">+</span>
            <span className="ml-auto flex items-center gap-1.5 pr-1 text-[10px] text-[color:var(--mdt-muted)]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--mdt-green)" }} />
              postgres@prod
            </span>
          </div>

          {/* editor */}
          <div className="space-y-1 px-4 py-3 font-mono text-[12px] leading-relaxed md:text-[13px]">
            <div>
              <span style={{ color: "var(--mdt-violet)" }}>SELECT</span>{" "}
              <span className="text-[color:var(--mdt-text)]">id, email, plan, created</span>
            </div>
            <div>
              <span style={{ color: "var(--mdt-violet)" }}>FROM</span>{" "}
              <span className="text-[color:var(--mdt-text)]">users</span>
            </div>
            <div className="flex items-center">
              <span style={{ color: "var(--mdt-violet)" }}>WHERE</span>
              <span className="text-[color:var(--mdt-text)]">&nbsp;plan&nbsp;</span>
              <span style={{ color: "var(--mdt-cyan)" }}>!=</span>
              <span style={{ color: "var(--mdt-green)" }}>&nbsp;&apos;free&apos;</span>
              <span style={{ color: "var(--mdt-violet)" }}>&nbsp;LIMIT</span>
              <span className="text-[color:var(--mdt-text)]">&nbsp;5;</span>
              <span className="mdt-dash-caret ml-0.5 inline-block h-[1.05em] w-[7px] translate-y-[2px]" />
            </div>
          </div>

          {/* run bar */}
          <div className="flex items-center gap-2 border-y border-[color:var(--mdt-border)] bg-white/[0.015] px-4 py-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold"
              style={{ background: "var(--mdt-grad)", color: "#0a0b12" }}
            >
              <Play className="h-3 w-3" /> Run
            </span>
            <span className="font-mono text-[10px] text-[color:var(--mdt-faint)]">⌘↵</span>
          </div>

          {/* results */}
          <div className="px-2 py-2 font-mono text-[11px] md:text-[12px]">
            <div className="grid grid-cols-[3rem_1fr_4rem_3rem] gap-2 px-2 pb-1.5 text-[10px] uppercase tracking-wider text-[color:var(--mdt-faint)]">
              <span>id</span><span>email</span><span>plan</span><span>seen</span>
            </div>
            {ROWS.map((r, i) => (
              <div
                key={r[0]}
                className="grid grid-cols-[3rem_1fr_4rem_3rem] items-center gap-2 rounded-md px-2 py-1.5 transition-colors"
                style={
                  i === active
                    ? { background: "rgba(122,107,245,.12)", boxShadow: "inset 2px 0 0 var(--mdt-violet)" }
                    : undefined
                }
              >
                <span className="text-[color:var(--mdt-faint)]">{r[0]}</span>
                <span className="truncate text-[color:var(--mdt-muted)]">{r[1]}</span>
                <span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px]"
                    style={{ color: PLAN[r[2]], border: `1px solid ${PLAN[r[2]]}33` }}
                  >
                    {r[2]}
                  </span>
                </span>
                <span className="text-[color:var(--mdt-faint)]">{r[3]}</span>
              </div>
            ))}
          </div>

          {/* status bar */}
          <div className="flex items-center justify-between border-t border-[color:var(--mdt-border)] bg-black/20 px-4 py-2 font-mono text-[10px] text-[color:var(--mdt-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--mdt-green)" }} />
              connected
            </span>
            <span>{ROWS.length} rows · {ms} ms</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function formatElapsed(minutes: number): string {
  if (minutes < 1) return "< 1m";
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function getElapsedMinutes(task: {
  timeLogged?: number;
  isTimerRunning?: boolean;
  timerStartedAt?: string;
}): number {
  const logged = task.timeLogged ?? 0;
  if (task.isTimerRunning && task.timerStartedAt) {
    const startMs = new Date(task.timerStartedAt).getTime();
    return logged + (Date.now() - startMs) / 60000;
  }
  return logged;
}

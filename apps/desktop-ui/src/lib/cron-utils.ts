import CronExpressionParser from 'cron-parser';
import cronstrue from 'cronstrue';

export const CRON_FIELD_LABELS = [
  'minute',
  'hour',
  'dayOfMonth',
  'month',
  'dayOfWeek',
] as const;

export const CRON_PRESETS: { key: string; cron: string }[] = [
  { key: 'everyMinute', cron: '* * * * *' },
  { key: 'every5Minutes', cron: '*/5 * * * *' },
  { key: 'every15Minutes', cron: '*/15 * * * *' },
  { key: 'everyHour', cron: '0 * * * *' },
  { key: 'every6Hours', cron: '0 */6 * * *' },
  { key: 'dailyMidnight', cron: '0 0 * * *' },
  { key: 'daily0900', cron: '0 9 * * *' },
  { key: 'weekdays0900', cron: '0 9 * * 1-5' },
  { key: 'weeklySunday', cron: '0 0 * * 0' },
  { key: 'monthlyFirst', cron: '0 0 1 * *' },
  { key: 'yearlyJan1', cron: '0 0 1 1 *' },
];

export function tokenizeCron(expression: string): string[] {
  return expression.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
}

/** cron-parser v5 uses second minute hour dom mon dow — prepend `0` for classic 5-field input. */
export function toSixField(expression: string): string {
  const parts = tokenizeCron(expression);
  if (parts.length === 5) return `0 ${parts.join(' ')}`;
  if (parts.length === 6) return parts.join(' ');
  return parts.join(' ');
}

export function validateCron(
  expression: string
): { ok: true } | { ok: false; errorKey: 'fieldCount' | 'invalid'; detail?: string } {
  const parts = tokenizeCron(expression);
  if (parts.length !== 5 && parts.length !== 6) {
    return {
      ok: false,
      errorKey: 'fieldCount',
    };
  }
  try {
    CronExpressionParser.parse(toSixField(expression));
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid cron expression.';
    return { ok: false, errorKey: 'invalid', detail: msg };
  }
}

function toCronstrueLocale(locale: string): string {
  if (locale === 'pt-BR') return 'pt_BR';
  if (locale === 'pt') return 'pt_PT';
  if (locale === 'zh') return 'zh_CN';
  return locale;
}

export function describeCron(expression: string, locale: string): string | null {
  const trimmed = expression.trim();
  if (!trimmed) return null;
  const t = tokenizeCron(trimmed);
  const five = t.length === 6 ? t.slice(1).join(' ') : trimmed;
  try {
    return cronstrue.toString(five, {
      use24HourTimeFormat: true,
      dayOfWeekStartIndexZero: true,
      locale: toCronstrueLocale(locale),
    });
  } catch {
    return null;
  }
}

export function getNextRunDates(expression: string, count: number): Date[] | null {
  const v = validateCron(expression);
  if (!v.ok) return null;
  try {
    const iter = CronExpressionParser.parse(toSixField(expression));
    const out: Date[] = [];
    let cur = iter.next();
    for (let i = 0; i < count; i++) {
      out.push(cur.toDate());
      cur = iter.next();
    }
    return out;
  } catch {
    return null;
  }
}

/** Ensure exactly 5 segments for the visual builder (pads with *). */
export function normalizeFiveFields(parts: string[]): [string, string, string, string, string] {
  const p = [...parts];
  while (p.length < 5) p.push('*');
  return [p[0]!, p[1]!, p[2]!, p[3]!, p[4]!];
}

export function joinFiveFields(parts: [string, string, string, string, string]): string {
  return parts.join(' ');
}

export function getFiveFieldParts(expression: string): [string, string, string, string, string] {
  const t = tokenizeCron(expression);
  if (t.length === 6) {
    return [t[1]!, t[2]!, t[3]!, t[4]!, t[5]!];
  }
  return normalizeFiveFields(t);
}

export function setFiveFieldAt(expression: string, index: 0 | 1 | 2 | 3 | 4, value: string): string {
  const t = tokenizeCron(expression);
  if (t.length === 6) {
    const next = [...t];
    next[index + 1] = value;
    return next.join(' ');
  }
  const parts = normalizeFiveFields(t);
  parts[index] = value;
  return joinFiveFields(parts);
}

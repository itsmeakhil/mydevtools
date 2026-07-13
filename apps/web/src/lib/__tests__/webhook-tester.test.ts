import {
  buildCurlExample,
  buildReceiveUrl,
  formatCountdown,
  formatRequestSize,
  isBinExpired,
  methodColor,
  relativeTime,
  tryPrettyJson,
} from '@/lib/webhook-tester';

describe('buildReceiveUrl', () => {
  it('joins base url and bin id under /api/v1', () => {
    expect(buildReceiveUrl('http://localhost:8000', 'abc123')).toBe(
      'http://localhost:8000/api/v1/webhook-tester/in/abc123'
    );
  });

  it('strips trailing slashes from the base url', () => {
    expect(buildReceiveUrl('https://api.example.com/', 'x')).toBe(
      'https://api.example.com/api/v1/webhook-tester/in/x'
    );
    expect(buildReceiveUrl('https://api.example.com//', 'x')).toBe(
      'https://api.example.com/api/v1/webhook-tester/in/x'
    );
  });
});

describe('buildCurlExample', () => {
  it('produces a POST curl with a JSON payload and the real url', () => {
    const url = 'http://localhost:8000/api/v1/webhook-tester/in/abc';
    expect(buildCurlExample(url)).toBe(
      `curl -X POST '${url}' -H 'Content-Type: application/json' -d '{"hello":"world"}'`
    );
  });
});

describe('formatRequestSize', () => {
  it('formats bytes', () => {
    expect(formatRequestSize(0)).toBe('0 B');
    expect(formatRequestSize(1)).toBe('1 B');
    expect(formatRequestSize(1023)).toBe('1023 B');
  });

  it('formats kilobytes with one trimmed decimal', () => {
    expect(formatRequestSize(1024)).toBe('1 KB');
    expect(formatRequestSize(1536)).toBe('1.5 KB');
    expect(formatRequestSize(64 * 1024)).toBe('64 KB');
  });

  it('formats megabytes', () => {
    expect(formatRequestSize(1024 * 1024)).toBe('1 MB');
    expect(formatRequestSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });

  it('handles invalid input safely', () => {
    expect(formatRequestSize(-5)).toBe('0 B');
    expect(formatRequestSize(NaN)).toBe('0 B');
  });
});

describe('methodColor', () => {
  it.each(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])(
    'returns distinct classes for %s',
    (method) => {
      const { text, bg } = methodColor(method);
      expect(text).toMatch(/^text-/);
      expect(bg).toContain('bg-');
    }
  );

  it('is case-insensitive', () => {
    expect(methodColor('post')).toEqual(methodColor('POST'));
  });

  it('falls back to slate for unknown methods', () => {
    expect(methodColor('PROPFIND').text).toBe('text-slate-500');
  });

  it('gives different colors to GET and DELETE', () => {
    expect(methodColor('GET').text).not.toBe(methodColor('DELETE').text);
  });
});

describe('relativeTime', () => {
  const now = Date.parse('2026-07-12T12:00:00Z');

  it('says just now for very recent timestamps', () => {
    expect(relativeTime('2026-07-12T11:59:58Z', now)).toBe('just now');
    expect(relativeTime('2026-07-12T12:00:05Z', now)).toBe('just now'); // future-safe
  });

  it('formats seconds, minutes, hours and days', () => {
    expect(relativeTime('2026-07-12T11:59:15Z', now)).toBe('45s ago');
    expect(relativeTime('2026-07-12T11:55:00Z', now)).toBe('5m ago');
    expect(relativeTime('2026-07-12T09:00:00Z', now)).toBe('3h ago');
    expect(relativeTime('2026-07-10T12:00:00Z', now)).toBe('2d ago');
  });

  it('returns empty string for invalid dates', () => {
    expect(relativeTime('not-a-date', now)).toBe('');
  });
});

describe('isBinExpired', () => {
  const now = Date.parse('2026-07-12T12:00:00Z');

  it('detects expired and live bins', () => {
    expect(isBinExpired('2026-07-12T11:59:59Z', now)).toBe(true);
    expect(isBinExpired('2026-07-12T12:00:01Z', now)).toBe(false);
  });

  it('treats unparseable timestamps as expired', () => {
    expect(isBinExpired('garbage', now)).toBe(true);
  });
});

describe('formatCountdown', () => {
  const now = Date.parse('2026-07-12T12:00:00Z');

  it('formats hours and minutes', () => {
    expect(formatCountdown('2026-07-13T11:59:30Z', now)).toBe('23h 59m');
    expect(formatCountdown('2026-07-12T12:45:30Z', now)).toBe('45m');
  });

  it('handles the sub-minute and expired cases', () => {
    expect(formatCountdown('2026-07-12T12:00:30Z', now)).toBe('<1m');
    expect(formatCountdown('2026-07-12T11:00:00Z', now)).toBe('expired');
    expect(formatCountdown('garbage', now)).toBe('expired');
  });
});

describe('tryPrettyJson', () => {
  it('pretty-prints valid JSON objects and arrays', () => {
    expect(tryPrettyJson('{"a":1}')).toBe('{\n  "a": 1\n}');
    expect(tryPrettyJson(' [1,2] ')).toBe('[\n  1,\n  2\n]');
  });

  it('handles scalar JSON values', () => {
    expect(tryPrettyJson('true')).toBe('true');
    expect(tryPrettyJson('42')).toBe('42');
    expect(tryPrettyJson('"hi"')).toBe('"hi"');
  });

  it('returns null for invalid JSON or plain text', () => {
    expect(tryPrettyJson('')).toBeNull();
    expect(tryPrettyJson('hello world')).toBeNull();
    expect(tryPrettyJson('{"a":')).toBeNull();
    expect(tryPrettyJson('key=value&x=1')).toBeNull();
  });
});

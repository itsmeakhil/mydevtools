import {
  CLOSE_CODE_NAMES,
  describeCloseEvent,
  formatLogEntry,
  formatLogTimestamp,
  isValidWsUrl,
  parseProtocols,
  tryPrettyJson,
  type LogEntry,
} from '../websocket-tester'

describe('formatLogTimestamp', () => {
  it('formats as HH:MM:SS.mmm', () => {
    const d = new Date(2026, 0, 2, 3, 4, 5, 6)
    expect(formatLogTimestamp(d.getTime())).toBe('03:04:05.006')
  })

  it('pads double-digit fields', () => {
    const d = new Date(2026, 0, 2, 23, 59, 59, 999)
    expect(formatLogTimestamp(d.getTime())).toBe('23:59:59.999')
  })
})

describe('formatLogEntry', () => {
  const ts = new Date(2026, 5, 1, 12, 30, 45, 123).getTime()

  it('formats a sent entry', () => {
    const entry: LogEntry = { direction: 'sent', text: 'hello', timestamp: ts }
    expect(formatLogEntry(entry)).toBe('[12:30:45.123] [SENT] hello')
  })

  it('formats a received entry', () => {
    const entry: LogEntry = { direction: 'received', text: 'pong', timestamp: ts }
    expect(formatLogEntry(entry)).toBe('[12:30:45.123] [RECV] pong')
  })

  it('formats a system entry', () => {
    const entry: LogEntry = { direction: 'system', text: 'Connected', timestamp: ts }
    expect(formatLogEntry(entry)).toBe('[12:30:45.123] [SYS ] Connected')
  })

  it('keeps multi-line payload text intact', () => {
    const entry: LogEntry = { direction: 'sent', text: 'a\nb', timestamp: ts }
    expect(formatLogEntry(entry)).toBe('[12:30:45.123] [SENT] a\nb')
  })
})

describe('tryPrettyJson', () => {
  it('pretty-prints a JSON object', () => {
    expect(tryPrettyJson('{"a":1,"b":[2,3]}')).toBe('{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}')
  })

  it('pretty-prints a JSON array', () => {
    expect(tryPrettyJson('[1,2]')).toBe('[\n  1,\n  2\n]')
  })

  it('tolerates surrounding whitespace', () => {
    expect(tryPrettyJson('  {"a":1}  ')).toBe('{\n  "a": 1\n}')
  })

  it('returns null for invalid JSON', () => {
    expect(tryPrettyJson('{"a":')).toBeNull()
    expect(tryPrettyJson('{a: 1}')).toBeNull()
  })

  it('returns null for JSON primitives', () => {
    expect(tryPrettyJson('123')).toBeNull()
    expect(tryPrettyJson('"hello"')).toBeNull()
    expect(tryPrettyJson('true')).toBeNull()
    expect(tryPrettyJson('null')).toBeNull()
  })

  it('returns null for plain text and empty input', () => {
    expect(tryPrettyJson('hello world')).toBeNull()
    expect(tryPrettyJson('')).toBeNull()
    expect(tryPrettyJson('   ')).toBeNull()
  })
})

describe('describeCloseEvent', () => {
  it('names common close codes', () => {
    expect(describeCloseEvent(1000)).toBe('Connection closed: 1000 (Normal Closure)')
    expect(describeCloseEvent(1001)).toBe('Connection closed: 1001 (Going Away)')
    expect(describeCloseEvent(1006)).toBe('Connection closed: 1006 (Abnormal Closure)')
    expect(describeCloseEvent(1008)).toBe('Connection closed: 1008 (Policy Violation)')
    expect(describeCloseEvent(1011)).toBe('Connection closed: 1011 (Internal Error)')
  })

  it('appends the reason when present', () => {
    expect(describeCloseEvent(1000, 'bye')).toBe('Connection closed: 1000 (Normal Closure) — bye')
  })

  it('ignores empty/whitespace reasons', () => {
    expect(describeCloseEvent(1000, '')).toBe('Connection closed: 1000 (Normal Closure)')
    expect(describeCloseEvent(1000, '   ')).toBe('Connection closed: 1000 (Normal Closure)')
  })

  it('falls back to the bare code for unknown codes', () => {
    expect(describeCloseEvent(4000)).toBe('Connection closed: 4000')
    expect(describeCloseEvent(4000, 'app-specific')).toBe('Connection closed: 4000 — app-specific')
  })

  it('exposes names for all required codes', () => {
    for (const code of [1000, 1001, 1006, 1008, 1011]) {
      expect(CLOSE_CODE_NAMES[code]).toBeTruthy()
    }
  })
})

describe('parseProtocols', () => {
  it('splits on commas and trims', () => {
    expect(parseProtocols('graphql-ws, soap ,wamp')).toEqual(['graphql-ws', 'soap', 'wamp'])
  })

  it('drops empty segments', () => {
    expect(parseProtocols(',a,,b,')).toEqual(['a', 'b'])
  })

  it('deduplicates while preserving order', () => {
    expect(parseProtocols('a,b,a,c,b')).toEqual(['a', 'b', 'c'])
  })

  it('returns an empty array for empty/blank input', () => {
    expect(parseProtocols('')).toEqual([])
    expect(parseProtocols('  ,  ')).toEqual([])
  })
})

describe('isValidWsUrl', () => {
  it('accepts ws and wss URLs', () => {
    expect(isValidWsUrl('ws://localhost:8080/socket')).toBe(true)
    expect(isValidWsUrl('wss://echo.websocket.org')).toBe(true)
    expect(isValidWsUrl('  wss://example.com/path?x=1  ')).toBe(true)
  })

  it('rejects other schemes and garbage', () => {
    expect(isValidWsUrl('http://example.com')).toBe(false)
    expect(isValidWsUrl('echo.websocket.org')).toBe(false)
    expect(isValidWsUrl('')).toBe(false)
  })
})

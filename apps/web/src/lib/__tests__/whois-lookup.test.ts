import { formatIsoDate, isIPv4, isIPv6, normalizeTarget, relativeTime } from '../whois-lookup'

describe('isIPv4', () => {
  it('accepts valid addresses', () => {
    expect(isIPv4('8.8.8.8')).toBe(true)
    expect(isIPv4('255.255.255.255')).toBe(true)
    expect(isIPv4('0.0.0.0')).toBe(true)
  })

  it('rejects invalid addresses', () => {
    expect(isIPv4('256.1.1.1')).toBe(false)
    expect(isIPv4('1.2.3')).toBe(false)
    expect(isIPv4('1.2.3.4.5')).toBe(false)
    expect(isIPv4('01.2.3.4')).toBe(false) // leading zero
    expect(isIPv4('a.b.c.d')).toBe(false)
  })
})

describe('isIPv6', () => {
  it('accepts valid addresses', () => {
    expect(isIPv6('2001:4860:4860::8888')).toBe(true)
    expect(isIPv6('::1')).toBe(true)
    expect(isIPv6('::')).toBe(true)
    expect(isIPv6('fe80:0:0:0:0:0:0:1')).toBe(true)
  })

  it('rejects invalid addresses', () => {
    expect(isIPv6('example.com')).toBe(false)
    expect(isIPv6('1:2:3:4:5:6:7:8:9')).toBe(false)
    expect(isIPv6('1::2::3')).toBe(false)
    expect(isIPv6('gggg::1')).toBe(false)
    expect(isIPv6('1:2:3:4:5:6:7:8::')).toBe(false) // :: must compress at least one group
  })
})

describe('normalizeTarget', () => {
  it('normalizes a plain domain', () => {
    expect(normalizeTarget('example.com')).toEqual({ target: 'example.com', type: 'domain' })
  })

  it('strips scheme, path, query and lowercases', () => {
    expect(normalizeTarget('https://Example.COM/some/path?q=1#frag')).toEqual({
      target: 'example.com',
      type: 'domain',
    })
  })

  it('strips trailing dot and port', () => {
    expect(normalizeTarget('example.com.')).toEqual({ target: 'example.com', type: 'domain' })
    expect(normalizeTarget('example.com:8080')).toEqual({ target: 'example.com', type: 'domain' })
  })

  it('detects IPv4 addresses', () => {
    expect(normalizeTarget('8.8.8.8')).toEqual({ target: '8.8.8.8', type: 'ip' })
    expect(normalizeTarget('  8.8.8.8  ')).toEqual({ target: '8.8.8.8', type: 'ip' })
  })

  it('detects IPv6 addresses, including bracketed', () => {
    expect(normalizeTarget('2001:4860:4860::8888')).toEqual({
      target: '2001:4860:4860::8888',
      type: 'ip',
    })
    expect(normalizeTarget('[2001:4860:4860::8888]')).toEqual({
      target: '2001:4860:4860::8888',
      type: 'ip',
    })
  })

  it('handles subdomains and multi-label TLDs', () => {
    expect(normalizeTarget('www.gov.uk')).toEqual({ target: 'www.gov.uk', type: 'domain' })
  })

  it('rejects invalid input', () => {
    expect(normalizeTarget('')).toBeNull()
    expect(normalizeTarget('   ')).toBeNull()
    expect(normalizeTarget('no-tld')).toBeNull()
    expect(normalizeTarget('not a domain')).toBeNull()
    expect(normalizeTarget('-bad-.com')).toBeNull()
    expect(normalizeTarget('a'.repeat(300) + '.com')).toBeNull()
  })
})

describe('relativeTime', () => {
  const now = new Date('2026-07-12T00:00:00Z')

  it('formats past dates', () => {
    expect(relativeTime('2025-07-12T00:00:00Z', now)).toBe('1 year ago')
    expect(relativeTime('1998-07-12T00:00:00Z', now)).toBe('28 years ago')
    expect(relativeTime('2026-05-12T00:00:00Z', now)).toBe('2 months ago')
    expect(relativeTime('2026-07-09T00:00:00Z', now)).toBe('3 days ago')
    expect(relativeTime('2026-07-11T21:00:00Z', now)).toBe('3 hours ago')
    expect(relativeTime('2026-07-11T23:55:00Z', now)).toBe('5 minutes ago')
  })

  it('formats future dates', () => {
    expect(relativeTime('2027-07-15T00:00:00Z', now)).toBe('in 1 year')
    expect(relativeTime('2026-09-12T00:00:00Z', now)).toBe('in 2 months')
    expect(relativeTime('2026-07-13T12:00:00Z', now)).toBe('in 2 days')
  })

  it('returns "just now" for sub-minute differences', () => {
    expect(relativeTime('2026-07-12T00:00:30Z', now)).toBe('just now')
    expect(relativeTime('2026-07-11T23:59:31Z', now)).toBe('just now')
  })

  it('returns null for invalid dates', () => {
    expect(relativeTime('not-a-date', now)).toBeNull()
    expect(relativeTime('', now)).toBeNull()
  })
})

describe('formatIsoDate', () => {
  it('formats to YYYY-MM-DD (UTC)', () => {
    expect(formatIsoDate('1995-08-14T04:00:00Z')).toBe('1995-08-14')
    expect(formatIsoDate('2026-08-13T04:00:00+00:00')).toBe('2026-08-13')
  })

  it('returns null for invalid input', () => {
    expect(formatIsoDate('nope')).toBeNull()
  })
})

import UAParser from 'ua-parser-js'

export type UaParserBreakdown = {
  ua: string
  browser: { name: string | null; version: string | null }
  engine: { name: string | null; version: string | null }
  os: { name: string | null; version: string | null }
  device: { vendor: string | null; model: string | null; type: string | null }
  cpu: { architecture: string | null }
}

export function parseUserAgent(ua: string): UaParserBreakdown {
  const trimmed = ua.trim()
  const parser = new UAParser(trimmed)
  const r = parser.getResult()

  return {
    ua,
    browser: { name: r.browser?.name ?? null, version: r.browser?.version ?? null },
    engine: { name: r.engine?.name ?? null, version: r.engine?.version ?? null },
    os: { name: r.os?.name ?? null, version: r.os?.version ?? null },
    device: {
      vendor: r.device?.vendor ?? null,
      model: r.device?.model ?? null,
      type: r.device?.type ?? null,
    },
    cpu: { architecture: r.cpu?.architecture ?? null },
  }
}


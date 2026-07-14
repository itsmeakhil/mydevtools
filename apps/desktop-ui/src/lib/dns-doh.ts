/**
 * DNS lookup via Google's DNS-over-HTTPS JSON API, routed through the
 * desktop proxy (proxyGet). Replaces the old backend /dns-lookup route.
 */
import { proxyGet } from '@/lib/desktop/proxy-get';

export interface DNSRecord {
  type: string;
  value: string;
  ttl: number | null;
  priority: number | null;
  extra: Record<string, string | number> | null;
}

export interface DNSLookupResult {
  domain: string;
  records: Record<string, DNSRecord[]>;
  errors: Record<string, string>;
}

/** RR type numbers as returned in DoH answers. */
const RR_NUM: Record<string, number> = {
  A: 1, NS: 2, CNAME: 5, SOA: 6, PTR: 12, MX: 15, TXT: 16, AAAA: 28, CAA: 257,
};

const DOH_STATUS: Record<number, string> = {
  1: 'Query format error (FORMERR)',
  2: 'Server failed to complete the request (SERVFAIL)',
  3: 'Domain does not exist (NXDOMAIN)',
  5: 'Query refused (REFUSED)',
};

const stripDot = (s: string) => s.replace(/\.$/, '');

/** TXT data arrives as one or more quoted strings: `"a""b"` → `ab`. */
const unquoteTxt = (s: string) => s.replace(/^"|"$/g, '').replace(/""/g, '');

type DohAnswer = { name: string; type: number; TTL?: number; data: string };

function toRecord(type: string, a: DohAnswer): DNSRecord {
  const base: DNSRecord = {
    type,
    value: a.data,
    ttl: a.TTL ?? null,
    priority: null,
    extra: null,
  };
  switch (type) {
    case 'MX': {
      const m = a.data.match(/^(\d+)\s+(\S+)$/);
      if (m) {
        base.priority = Number(m[1]);
        base.value = stripDot(m[2]);
      }
      break;
    }
    case 'TXT':
      base.value = unquoteTxt(a.data);
      break;
    case 'NS':
    case 'CNAME':
    case 'PTR':
      base.value = stripDot(a.data);
      break;
    case 'SOA': {
      const parts = a.data.split(/\s+/);
      if (parts.length >= 7) {
        base.value = `${stripDot(parts[0])} ${stripDot(parts[1])}`;
        base.extra = {
          mname: stripDot(parts[0]),
          rname: stripDot(parts[1]),
          serial: Number(parts[2]),
          refresh: Number(parts[3]),
          retry: Number(parts[4]),
          expire: Number(parts[5]),
          minimum: Number(parts[6]),
        };
      }
      break;
    }
  }
  return base;
}

async function queryType(domain: string, type: string): Promise<DNSRecord[]> {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`;
  const res = await proxyGet(url, { timeoutMs: 10_000 });
  if (!res.ok) throw new Error(res.status ? `Request failed (${res.status})` : 'Network error');
  const json = JSON.parse(res.body) as { Status: number; Answer?: DohAnswer[] };
  if (json.Status !== 0 && json.Status !== 3) {
    throw new Error(DOH_STATUS[json.Status] ?? `DNS error (status ${json.Status})`);
  }
  // NXDOMAIN or NOERROR with no answers → empty section ("No records found").
  const wanted = RR_NUM[type];
  return (json.Answer ?? []).filter((a) => a.type === wanted).map((a) => toRecord(type, a));
}

/**
 * Query all selected record types in parallel. Per-type failures land in
 * `errors`; throws only when every single query failed.
 */
export async function dohLookup(domain: string, types: string[]): Promise<DNSLookupResult> {
  const result: DNSLookupResult = { domain, records: {}, errors: {} };
  await Promise.all(
    types.map(async (type) => {
      try {
        result.records[type] = await queryType(domain, type);
      } catch (e) {
        result.errors[type] = e instanceof Error ? e.message : 'Lookup failed';
      }
    })
  );
  if (Object.keys(result.records).length === 0) {
    throw new Error(Object.values(result.errors)[0] ?? 'Lookup failed');
  }
  return result;
}

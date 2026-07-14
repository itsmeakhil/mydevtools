/**
 * Whois-style lookup via RDAP (rdap.org bootstrap, follows redirects to the
 * authoritative registry), routed through the desktop proxy (proxyGet).
 * Replaces the old backend /whois route.
 */
import { proxyGet } from '@/lib/desktop/proxy-get';
import type { TargetType } from '@/lib/whois-lookup';

export interface WhoisContact {
  roles: string[];
  name: string | null;
  organization: string | null;
  handle: string | null;
}

export interface WhoisResult {
  target: string;
  type: TargetType;
  registrar: string | null;
  status: string[];
  created: string | null;
  updated: string | null;
  expires: string | null;
  nameservers: string[];
  contacts: WhoisContact[];
  raw: Record<string, unknown>;
}

type RdapEvent = { eventAction?: string; eventDate?: string };
type VcardEntry = [string, unknown, string, unknown];
type RdapEntity = {
  roles?: string[];
  handle?: string;
  vcardArray?: [string, VcardEntry[]];
  entities?: RdapEntity[];
};
type RdapDoc = {
  ldhName?: string;
  name?: string;
  status?: string[];
  events?: RdapEvent[];
  entities?: RdapEntity[];
  nameservers?: { ldhName?: string }[];
  errorCode?: number;
  title?: string;
  description?: string[];
};

function vcardValue(entity: RdapEntity, key: string): string | null {
  const entries = entity.vcardArray?.[1] ?? [];
  for (const e of entries) {
    if (e[0] === key) {
      const v = e[3];
      const text = Array.isArray(v) ? v.filter(Boolean).join(', ') : String(v ?? '');
      if (text.trim()) return text.trim();
    }
  }
  return null;
}

function flattenEntities(entities: RdapEntity[] | undefined, out: RdapEntity[] = []): RdapEntity[] {
  for (const e of entities ?? []) {
    out.push(e);
    flattenEntities(e.entities, out);
  }
  return out;
}

function eventDate(events: RdapEvent[] | undefined, action: string): string | null {
  return events?.find((e) => e.eventAction === action)?.eventDate ?? null;
}

export async function rdapLookup(target: string, type: TargetType): Promise<WhoisResult> {
  const url = `https://rdap.org/${type === 'ip' ? 'ip' : 'domain'}/${encodeURIComponent(target)}`;
  const res = await proxyGet(url, {
    headers: { accept: 'application/rdap+json' },
    timeoutMs: 15_000,
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error(`No RDAP record found for ${target}`);
    throw new Error(res.status ? `Lookup failed (${res.status})` : 'Network error');
  }
  const doc = JSON.parse(res.body) as RdapDoc;

  const entities = flattenEntities(doc.entities);
  const registrarEntity = entities.find((e) => e.roles?.includes('registrar'));
  const registrar =
    type === 'ip'
      ? doc.name ?? null
      : registrarEntity
        ? vcardValue(registrarEntity, 'fn') ?? vcardValue(registrarEntity, 'org') ?? registrarEntity.handle ?? null
        : null;

  const contacts: WhoisContact[] = entities.map((e) => ({
    roles: e.roles ?? [],
    name: vcardValue(e, 'fn'),
    organization: vcardValue(e, 'org'),
    handle: e.handle ?? null,
  }));

  return {
    target,
    type,
    registrar,
    status: doc.status ?? [],
    created: eventDate(doc.events, 'registration'),
    updated: eventDate(doc.events, 'last changed'),
    expires: eventDate(doc.events, 'expiration'),
    nameservers: (doc.nameservers ?? [])
      .map((n) => n.ldhName?.toLowerCase() ?? '')
      .filter(Boolean),
    contacts,
    raw: doc as Record<string, unknown>,
  };
}

import { Netmask } from 'netmask';
import ipaddr from 'ipaddr.js';

export type IpSubnetErrorKey = 'invalidIpv4' | 'invalidIpv6';

export type Ipv4SubnetResult = {
  kind: 'ipv4';
  cidrNotation: string;
  networkAddress: string;
  netmask: string;
  wildcardMask: string;
  broadcast: string | null;
  firstHost: string;
  lastHost: string;
  totalAddresses: bigint;
  usableHosts: bigint | null;
  usableNoteKey: 'none' | 'pointToPoint' | 'singleHost' | null;
};

export type Ipv6SubnetResult = {
  kind: 'ipv6';
  cidrNotation: string;
  networkAddress: string;
  lastAddress: string;
  prefixLength: number;
  totalAddresses: string;
  rangeSummaryKey: 'normal' | 'single' | 'full';
};

function ipv6PartsToBigInt(parts: number[]): bigint {
  let n = BigInt(0);
  for (let i = 0; i < 8; i++) {
    n = (n << BigInt(16)) | BigInt(parts[i] & 0xffff);
  }
  return n;
}

function bigIntToIpv6(n: bigint): ipaddr.IPv6 {
  const parts: number[] = [];
  let x = n;
  const mask = BigInt(0xffff);
  const shift = BigInt(16);
  for (let i = 7; i >= 0; i--) {
    parts[i] = Number(x & mask);
    x >>= shift;
  }
  return new ipaddr.IPv6(parts);
}

/** Strip zone index (e.g. fe80::1%eth0 → fe80::1) */
function stripZoneId(s: string): string {
  const i = s.indexOf('%');
  return i === -1 ? s : s.slice(0, i);
}

export function computeIpv4Subnet(raw: string): { ok: true; value: Ipv4SubnetResult } | { ok: false; errorKey: IpSubnetErrorKey } {
  let input = raw.trim();
  if (!input) {
    return { ok: false, errorKey: 'invalidIpv4' };
  }

  let block: Netmask;
  try {
    if (input.includes('/') && !input.includes(' ')) {
      block = new Netmask(input);
    } else if (/\s/.test(input) && !input.includes('/')) {
      const parts = input.split(/\s+/).filter(Boolean);
      if (parts.length !== 2) {
        return { ok: false, errorKey: 'invalidIpv4' };
      }
      block = new Netmask(parts[0], parts[1]);
    } else if (!input.includes('/') && !/\s/.test(input)) {
      block = new Netmask(`${input}/32`);
    } else {
      block = new Netmask(input);
    }
  } catch {
    return { ok: false, errorKey: 'invalidIpv4' };
  }

  const { bitmask } = block;
  const total = BigInt(block.size);
  let usable: bigint | null = null;
  let usableNoteKey: Ipv4SubnetResult['usableNoteKey'] = null;

  if (bitmask <= 30) {
    usable = total > BigInt(2) ? total - BigInt(2) : BigInt(0);
  } else if (bitmask === 31) {
    usable = BigInt(2);
    usableNoteKey = 'pointToPoint';
  } else {
    usable = BigInt(1);
    usableNoteKey = 'singleHost';
  }

  const result: Ipv4SubnetResult = {
    kind: 'ipv4',
    cidrNotation: block.toString(),
    networkAddress: block.base,
    netmask: block.mask,
    wildcardMask: block.hostmask,
    broadcast: block.broadcast ?? null,
    firstHost: block.first,
    lastHost: block.last,
    totalAddresses: total,
    usableHosts: usable,
    usableNoteKey,
  };

  return { ok: true, value: result };
}

export function computeIpv6Subnet(raw: string): { ok: true; value: Ipv6SubnetResult } | { ok: false; errorKey: IpSubnetErrorKey } {
  let input = stripZoneId(raw.trim());
  if (!input) {
    return { ok: false, errorKey: 'invalidIpv6' };
  }

  if (!input.includes('/')) {
    input = `${input}/128`;
  }

  let addr: ipaddr.IPv6;
  let prefix: number;
  try {
    const parsed = ipaddr.IPv6.parseCIDR(input);
    addr = parsed[0];
    prefix = parsed[1];
  } catch {
    return { ok: false, errorKey: 'invalidIpv6' };
  }

  const addrBig = ipv6PartsToBigInt(addr.parts);
  const hostBits = 128 - prefix;
  const networkBig = (addrBig >> BigInt(hostBits)) << BigInt(hostBits);
  const lastBig = networkBig | ((BigInt(1) << BigInt(hostBits)) - BigInt(1));

  const network = bigIntToIpv6(networkBig);
  const last = bigIntToIpv6(lastBig);

  const totalExact = BigInt(1) << BigInt(hostBits);
  let rangeSummaryKey: Ipv6SubnetResult['rangeSummaryKey'] = 'normal';
  if (prefix === 128) rangeSummaryKey = 'single';
  if (prefix === 0) rangeSummaryKey = 'full';

  const value: Ipv6SubnetResult = {
    kind: 'ipv6',
    cidrNotation: `${network.toRFC5952String()}/${prefix}`,
    networkAddress: network.toRFC5952String(),
    lastAddress: last.toRFC5952String(),
    prefixLength: prefix,
    totalAddresses: totalExact.toLocaleString('en-US'),
    rangeSummaryKey,
  };

  return { ok: true, value };
}

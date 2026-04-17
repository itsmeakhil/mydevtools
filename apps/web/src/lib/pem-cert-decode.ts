import 'reflect-metadata';
import {
  PemConverter,
  Pkcs10CertificateRequest,
  SubjectAlternativeNameExtension,
  X509Certificate,
} from '@peculiar/x509';

export type PemDecodeErrorKey = 'empty' | 'noBlock' | 'parseFailed';

export type SanRow = { type: string; value: string };

/** PEM blocks returned to the UI (unsupported types are dropped). */
export type DecodedPemBlock =
  | {
      kind: 'certificate';
      pemLabel: string;
      subject: string;
      issuer: string;
      notBeforeIso: string;
      notAfterIso: string;
      serialNumber: string;
      signatureAlgorithm: string;
      sha256Fingerprint: string;
      sans: SanRow[];
    }
  | {
      kind: 'csr';
      pemLabel: string;
      subject: string;
      signatureAlgorithm: string;
      sans: SanRow[];
    };

type InternalBlock = DecodedPemBlock | { kind: 'unsupported'; pemLabel: string };

const SUBJECT_ALT_NAME_OID = '2.5.29.17';

function bufferToColonHexUpper(buf: ArrayBuffer): string {
  const hex = [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return hex.replace(/(.{2})(?=.)/g, '$1:');
}

function readSans(source: X509Certificate | Pkcs10CertificateRequest): SanRow[] {
  const raw = source.getExtension(SUBJECT_ALT_NAME_OID);
  if (!raw) return [];
  try {
    const san = new SubjectAlternativeNameExtension(raw.value);
    return san.names.toJSON().map((j) => ({ type: j.type, value: j.value }));
  } catch {
    return [];
  }
}

function sigName(cert: X509Certificate | Pkcs10CertificateRequest): string {
  const a = cert.signatureAlgorithm as { name?: string } | undefined;
  return typeof a?.name === 'string' ? a.name : '—';
}

async function fromCertificate(raw: ArrayBuffer, pemLabel: string): Promise<DecodedPemBlock> {
  const cert = new X509Certificate(raw);
  const shaBuf = await cert.getThumbprint({ name: 'SHA-256' });
  return {
    kind: 'certificate',
    pemLabel,
    subject: cert.subject,
    issuer: cert.issuer,
    notBeforeIso: cert.notBefore.toISOString(),
    notAfterIso: cert.notAfter.toISOString(),
    serialNumber: cert.serialNumber,
    signatureAlgorithm: sigName(cert),
    sha256Fingerprint: bufferToColonHexUpper(shaBuf),
    sans: readSans(cert),
  };
}

function fromCsr(raw: ArrayBuffer, pemLabel: string): DecodedPemBlock {
  const csr = new Pkcs10CertificateRequest(raw);
  return {
    kind: 'csr',
    pemLabel,
    subject: csr.subject,
    signatureAlgorithm: sigName(csr),
    sans: readSans(csr),
  };
}

function classifyPemType(label: string): 'cert' | 'csr' | 'unknown' {
  const u = label.toUpperCase();
  if (u.includes('CERTIFICATE') && u.includes('REQUEST')) return 'csr';
  if (u.includes('CERTIFICATE')) return 'cert';
  return 'unknown';
}

async function decodeRawBlock(raw: ArrayBuffer, pemLabel: string): Promise<InternalBlock> {
  const cls = classifyPemType(pemLabel);
  if (cls === 'csr') {
    try {
      return fromCsr(raw, pemLabel);
    } catch {
      return { kind: 'unsupported', pemLabel };
    }
  }
  if (cls === 'cert') {
    try {
      return await fromCertificate(raw, pemLabel);
    } catch {
      return { kind: 'unsupported', pemLabel };
    }
  }
  try {
    return await fromCertificate(raw, pemLabel);
  } catch {
    try {
      return fromCsr(raw, pemLabel);
    } catch {
      return { kind: 'unsupported', pemLabel };
    }
  }
}

export type PemDecodeResult =
  | { ok: true; blocks: DecodedPemBlock[] }
  | { ok: false; errorKey: PemDecodeErrorKey };

export async function decodePemCertificateInput(text: string): Promise<PemDecodeResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, errorKey: 'empty' };
  }

  const blocks: InternalBlock[] = [];

  if (PemConverter.isPem(trimmed)) {
    const structs = PemConverter.decodeWithHeaders(trimmed);
    for (const s of structs) {
      blocks.push(await decodeRawBlock(s.rawData, s.type));
    }
  } else {
    try {
      blocks.push(await decodeRawBlock(new X509Certificate(trimmed).rawData, 'DER / pasted'));
    } catch {
      try {
        blocks.push(fromCsr(new Pkcs10CertificateRequest(trimmed).rawData, 'DER / pasted'));
      } catch {
        return { ok: false, errorKey: 'parseFailed' };
      }
    }
  }

  const decoded = blocks.filter((b): b is DecodedPemBlock => b.kind !== 'unsupported');
  if (!decoded.length) {
    return { ok: false, errorKey: blocks.length ? 'parseFailed' : 'noBlock' };
  }

  return { ok: true, blocks: decoded };
}

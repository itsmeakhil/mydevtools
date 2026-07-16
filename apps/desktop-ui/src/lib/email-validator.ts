/**
 * Client-side email validation. Replaces the old backend /api/validate-email
 * route: syntax + disposable/role checks are pure, domain/MX checks go
 * through DNS-over-HTTPS (dns-doh). No account, no MyDevTools backend.
 */
import { dohLookup } from './dns-doh';

export interface EmailValidations {
  syntax: boolean;
  domain_exists: boolean;
  mx_records: boolean;
  mailbox_exists: boolean;
  is_disposable: boolean;
  is_role_based: boolean;
}

export interface EmailValidationResult {
  email: string;
  validations: EmailValidations;
  score: number;
  status: 'VALID' | 'INVALID' | 'DISPOSABLE';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_LOCALS = new Set([
  'abuse', 'admin', 'administrator', 'billing', 'contact', 'enquiries',
  'help', 'hello', 'hr', 'info', 'legal', 'mail', 'marketing', 'newsletter',
  'noreply', 'no-reply', 'office', 'postmaster', 'privacy', 'sales',
  'security', 'support', 'team', 'webmaster',
]);

const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com', '20minutemail.com', '33mail.com', 'anonbox.net',
  'burnermail.io', 'byom.de', 'dispostable.com', 'dropmail.me',
  'emailondeck.com', 'fakeinbox.com', 'getairmail.com', 'getnada.com',
  'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org',
  'harakirimail.com', 'inboxkitten.com', 'incognitomail.com', 'jetable.org',
  'mail-temp.com', 'mail.tm', 'mailcatch.com', 'maildrop.cc',
  'mailinator.com', 'mailnesia.com', 'mailsac.com', 'minuteinbox.com',
  'mohmal.com', 'mytemp.email', 'nada.email', 'sharklasers.com',
  'spamgourmet.com', 'tempail.com', 'temp-mail.io', 'temp-mail.org',
  'tempinbox.com', 'tempmail.dev', 'tempmailo.com', 'tempr.email',
  'throwawaymail.com', 'trash-mail.com', 'trashmail.com', 'yopmail.com',
  'yopmail.fr', 'zohomail.party',
]);

export function splitEmail(email: string): { local: string; domain: string } | null {
  const trimmed = email.trim();
  if (!EMAIL_RE.test(trimmed)) return null;
  const at = trimmed.lastIndexOf('@');
  return { local: trimmed.slice(0, at).toLowerCase(), domain: trimmed.slice(at + 1).toLowerCase() };
}

export function isRoleBased(local: string): boolean {
  return ROLE_LOCALS.has(local.toLowerCase());
}

export function isDisposable(domain: string): boolean {
  return DISPOSABLE_DOMAINS.has(domain.toLowerCase());
}

/** Pure scoring over the individual checks. */
export function scoreEmail(v: EmailValidations): { score: number; status: EmailValidationResult['status'] } {
  if (!v.syntax) return { score: 0, status: 'INVALID' };
  let score = 25;
  if (v.domain_exists) score += 20;
  if (v.mx_records) score += 35;
  if (!v.is_disposable) score += 15;
  if (!v.is_role_based) score += 5;
  const status = !v.mx_records ? 'INVALID' : v.is_disposable ? 'DISPOSABLE' : 'VALID';
  return { score, status };
}

type DomainInfo = { exists: boolean; mx: boolean };
export type DomainCache = Map<string, Promise<DomainInfo>>;

function lookupDomain(domain: string, cache: DomainCache): Promise<DomainInfo> {
  let hit = cache.get(domain);
  if (!hit) {
    hit = dohLookup(domain, ['MX', 'A'])
      .then(({ records }) => {
        const mx = (records.MX ?? []).length > 0;
        const a = (records.A ?? []).length > 0;
        return { exists: mx || a, mx };
      })
      .catch(() => ({ exists: false, mx: false }));
    cache.set(domain, hit);
  }
  return hit;
}

export async function validateEmail(
  email: string,
  cache: DomainCache = new Map()
): Promise<EmailValidationResult> {
  const trimmed = email.trim();
  const parts = splitEmail(trimmed);
  if (!parts) {
    const validations: EmailValidations = {
      syntax: false, domain_exists: false, mx_records: false,
      mailbox_exists: false, is_disposable: false, is_role_based: false,
    };
    return { email: trimmed, validations, ...scoreEmail(validations) };
  }
  const { exists, mx } = await lookupDomain(parts.domain, cache);
  const validations: EmailValidations = {
    syntax: true,
    domain_exists: exists,
    mx_records: mx,
    // ponytail: no SMTP probe from the client — mailbox check mirrors MX
    mailbox_exists: mx,
    is_disposable: isDisposable(parts.domain),
    is_role_based: isRoleBased(parts.local),
  };
  return { email: trimmed, validations, ...scoreEmail(validations) };
}

/** Bulk validation with per-domain DoH dedupe and bounded concurrency. */
export async function validateEmails(
  emails: string[],
  cache: DomainCache = new Map(),
  onProgress?: (done: number, total: number) => void
): Promise<EmailValidationResult[]> {
  const results: EmailValidationResult[] = new Array(emails.length);
  let done = 0;
  let next = 0;
  const worker = async () => {
    while (next < emails.length) {
      const i = next++;
      results[i] = await validateEmail(emails[i], cache);
      onProgress?.(++done, emails.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(8, emails.length) }, worker));
  return results;
}

import { splitEmail, isRoleBased, isDisposable, scoreEmail } from '../email-validator';

describe('splitEmail', () => {
  it('splits a valid email into local and domain, lowercased', () => {
    expect(splitEmail(' John.Doe@Example.COM ')).toEqual({ local: 'john.doe', domain: 'example.com' });
  });

  it('rejects invalid formats', () => {
    expect(splitEmail('nope')).toBeNull();
    expect(splitEmail('a@b')).toBeNull();
    expect(splitEmail('a b@example.com')).toBeNull();
    expect(splitEmail('')).toBeNull();
  });
});

describe('isRoleBased / isDisposable', () => {
  it('flags role-based locals case-insensitively', () => {
    expect(isRoleBased('Admin')).toBe(true);
    expect(isRoleBased('support')).toBe(true);
    expect(isRoleBased('john.doe')).toBe(false);
  });

  it('flags known disposable domains', () => {
    expect(isDisposable('mailinator.com')).toBe(true);
    expect(isDisposable('YOPMAIL.COM')).toBe(true);
    expect(isDisposable('gmail.com')).toBe(false);
  });
});

describe('scoreEmail', () => {
  const base = {
    syntax: true, domain_exists: true, mx_records: true,
    mailbox_exists: true, is_disposable: false, is_role_based: false,
  };

  it('scores a clean deliverable email 100 / VALID', () => {
    expect(scoreEmail(base)).toEqual({ score: 100, status: 'VALID' });
  });

  it('bad syntax is 0 / INVALID', () => {
    expect(scoreEmail({ ...base, syntax: false })).toEqual({ score: 0, status: 'INVALID' });
  });

  it('no MX is INVALID', () => {
    expect(scoreEmail({ ...base, mx_records: false, mailbox_exists: false }).status).toBe('INVALID');
  });

  it('disposable domain is DISPOSABLE and scored down', () => {
    const r = scoreEmail({ ...base, is_disposable: true });
    expect(r.status).toBe('DISPOSABLE');
    expect(r.score).toBeLessThan(100);
  });
});

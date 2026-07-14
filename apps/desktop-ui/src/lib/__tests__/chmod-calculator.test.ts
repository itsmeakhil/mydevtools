import {
  emptyFlags,
  flagsToOctal,
  flagsToSymbolic,
  octalToFlags,
  symbolicToFlags,
  type PermissionFlags,
} from '@/lib/chmod-calculator';

function flags(
  owner: string,
  group: string,
  others: string,
  special: Partial<Pick<PermissionFlags, 'setuid' | 'setgid' | 'sticky'>> = {},
): PermissionFlags {
  const cls = (s: string) => ({
    read: s.includes('r'),
    write: s.includes('w'),
    execute: s.includes('x'),
  });
  return {
    owner: cls(owner),
    group: cls(group),
    others: cls(others),
    setuid: false,
    setgid: false,
    sticky: false,
    ...special,
  };
}

describe('octalToFlags', () => {
  it('parses 755', () => {
    expect(octalToFlags('755')).toEqual(flags('rwx', 'rx', 'rx'));
  });

  it('parses 000 and 777', () => {
    expect(octalToFlags('000')).toEqual(emptyFlags());
    expect(octalToFlags('777')).toEqual(flags('rwx', 'rwx', 'rwx'));
  });

  it('parses 4-digit octal with special bits', () => {
    expect(octalToFlags('4755')).toEqual(flags('rwx', 'rx', 'rx', { setuid: true }));
    expect(octalToFlags('2755')).toEqual(flags('rwx', 'rx', 'rx', { setgid: true }));
    expect(octalToFlags('1777')).toEqual(flags('rwx', 'rwx', 'rwx', { sticky: true }));
    expect(octalToFlags('7644')).toEqual(
      flags('rw', 'r', 'r', { setuid: true, setgid: true, sticky: true }),
    );
  });

  it('treats a leading 0 in 4-digit form as "no special bits"', () => {
    expect(octalToFlags('0644')).toEqual(flags('rw', 'r', 'r'));
  });

  it('returns null for invalid input', () => {
    expect(octalToFlags('758')).toBeNull();
    expect(octalToFlags('75')).toBeNull();
    expect(octalToFlags('75555')).toBeNull();
    expect(octalToFlags('abc')).toBeNull();
    expect(octalToFlags('')).toBeNull();
    expect(octalToFlags('-755')).toBeNull();
  });
});

describe('flagsToOctal', () => {
  it('emits 3 digits without special bits', () => {
    expect(flagsToOctal(flags('rwx', 'rx', 'rx'))).toBe('755');
    expect(flagsToOctal(flags('rw', 'r', 'r'))).toBe('644');
    expect(flagsToOctal(emptyFlags())).toBe('000');
  });

  it('emits 4 digits when any special bit is set', () => {
    expect(flagsToOctal(flags('rwx', 'rx', 'rx', { setuid: true }))).toBe('4755');
    expect(flagsToOctal(flags('rwx', 'rwx', 'rwx', { sticky: true }))).toBe('1777');
    expect(flagsToOctal(flags('rwx', 'rx', '', { setgid: true }))).toBe('2750');
  });
});

describe('flagsToSymbolic', () => {
  it('renders plain permissions', () => {
    expect(flagsToSymbolic(flags('rwx', 'rx', 'rx'))).toBe('rwxr-xr-x');
    expect(flagsToSymbolic(flags('rw', 'r', 'r'))).toBe('rw-r--r--');
    expect(flagsToSymbolic(emptyFlags())).toBe('---------');
  });

  it('renders setuid as s with execute and S without', () => {
    expect(flagsToSymbolic(flags('rwx', 'rx', 'rx', { setuid: true }))).toBe('rwsr-xr-x');
    expect(flagsToSymbolic(flags('rw', 'rx', 'rx', { setuid: true }))).toBe('rwSr-xr-x');
  });

  it('renders setgid as s/S in the group triad', () => {
    expect(flagsToSymbolic(flags('rwx', 'rx', 'rx', { setgid: true }))).toBe('rwxr-sr-x');
    expect(flagsToSymbolic(flags('rwx', 'r', 'rx', { setgid: true }))).toBe('rwxr-Sr-x');
  });

  it('renders sticky as t with execute and T without', () => {
    expect(flagsToSymbolic(flags('rwx', 'rwx', 'rwx', { sticky: true }))).toBe('rwxrwxrwt');
    expect(flagsToSymbolic(flags('rwx', 'rwx', 'rw', { sticky: true }))).toBe('rwxrwxrwT');
  });
});

describe('symbolicToFlags', () => {
  it('parses plain strings', () => {
    expect(symbolicToFlags('rwxr-xr-x')).toEqual(flags('rwx', 'rx', 'rx'));
    expect(symbolicToFlags('rw-r--r--')).toEqual(flags('rw', 'r', 'r'));
    expect(symbolicToFlags('---------')).toEqual(emptyFlags());
  });

  it('parses special-bit characters, both cases', () => {
    expect(symbolicToFlags('rwsr-xr-x')).toEqual(flags('rwx', 'rx', 'rx', { setuid: true }));
    expect(symbolicToFlags('rwSr-xr-x')).toEqual(flags('rw', 'rx', 'rx', { setuid: true }));
    expect(symbolicToFlags('rwxr-sr-x')).toEqual(flags('rwx', 'rx', 'rx', { setgid: true }));
    expect(symbolicToFlags('rwxrwxrwt')).toEqual(flags('rwx', 'rwx', 'rwx', { sticky: true }));
    expect(symbolicToFlags('rwxrwxrwT')).toEqual(flags('rwx', 'rwx', 'rw', { sticky: true }));
  });

  it('returns null for invalid strings', () => {
    expect(symbolicToFlags('rwxr-xr')).toBeNull(); // too short
    expect(symbolicToFlags('rwxr-xr-xx')).toBeNull(); // too long
    expect(symbolicToFlags('rwxr-xr-q')).toBeNull(); // bad char
    expect(symbolicToFlags('twxr-xr-x')).toBeNull(); // t only valid in last slot
    expect(symbolicToFlags('rwxr-xr-s')).toBeNull(); // s not valid in others slot
    expect(symbolicToFlags('')).toBeNull();
  });
});

describe('round-trips', () => {
  const octals = ['000', '400', '600', '644', '664', '700', '755', '775', '777', '4755', '2755', '1777', '7777', '4644', '2745', '1666'];

  it.each(octals)('octal %s -> flags -> octal', (octal) => {
    const f = octalToFlags(octal)!;
    expect(f).not.toBeNull();
    // 4-digit with leading 0 normalizes to 3 digits
    const expected = octal.length === 4 && octal[0] === '0' ? octal.slice(1) : octal;
    expect(flagsToOctal(f)).toBe(expected);
  });

  it.each(octals)('octal %s -> symbolic -> flags -> octal', (octal) => {
    const f = octalToFlags(octal)!;
    const sym = flagsToSymbolic(f);
    expect(symbolicToFlags(sym)).toEqual(f);
    expect(flagsToOctal(symbolicToFlags(sym)!)).toBe(octal);
  });
});

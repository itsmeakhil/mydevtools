import {
  decimalToDms,
  formatBytes,
  formatExposureTime,
  groupMetadata,
  isJpeg,
  osmLink,
  stripJpegMetadata,
} from '@/lib/exif-viewer';

/* ------------------------- synthetic JPEG builder ------------------------- */

function segment(marker: number, payload: number[]): number[] {
  const length = payload.length + 2;
  return [0xff, marker, (length >> 8) & 0xff, length & 0xff, ...payload];
}

function ascii(text: string): number[] {
  return Array.from(text).map((c) => c.charCodeAt(0));
}

const APP0_JFIF = segment(0xe0, [...ascii('JFIF\0'), 1, 1, 0, 0, 1, 0, 1, 0, 0]);
const APP1_EXIF = segment(0xe1, [...ascii('Exif\0\0'), 0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8]);
const APP2_ICC = segment(0xe2, [...ascii('ICC_PROFILE\0'), 1, 1, 0xaa, 0xbb]);
const APP2_OTHER = segment(0xe2, [...ascii('FPXR\0'), 1, 2, 3]);
const APP13_IPTC = segment(0xed, [...ascii('Photoshop 3.0\0'), 0x38, 0x42, 0x49, 0x4d]);
const COM_SEG = segment(0xfe, ascii('a comment'));
const DQT = segment(0xdb, [0, ...new Array(64).fill(16)]);
const SOF0 = segment(0xc0, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]);
const DHT = segment(0xc4, [0, ...new Array(16).fill(0), 0]);
const SOS_HEADER = segment(0xda, [1, 1, 0, 0, 63, 0]);
const SCAN_DATA = [0x12, 0x34, 0xff, 0x00, 0x56]; // includes a stuffed 0xFF00

function buildJpeg(segments: number[][]): ArrayBuffer {
  const bytes = [
    0xff, 0xd8, // SOI
    ...segments.flat(),
    ...SOS_HEADER,
    ...SCAN_DATA,
    0xff, 0xd9, // EOI
  ];
  return new Uint8Array(bytes).buffer;
}

function markers(buffer: ArrayBuffer): number[] {
  // Collect segment markers up to (and including) SOS.
  const bytes = new Uint8Array(buffer);
  const found: number[] = [];
  let offset = 2;
  while (offset < bytes.length) {
    expect(bytes[offset]).toBe(0xff);
    const marker = bytes[offset + 1];
    found.push(marker);
    if (marker === 0xda) break;
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    offset += 2 + length;
  }
  return found;
}

/* --------------------------------- tests ---------------------------------- */

describe('isJpeg', () => {
  it('accepts a JPEG buffer', () => {
    expect(isJpeg(buildJpeg([APP0_JFIF]))).toBe(true);
  });

  it('rejects non-JPEG and tiny buffers', () => {
    expect(isJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]).buffer)).toBe(false);
    expect(isJpeg(new Uint8Array([0xff]).buffer)).toBe(false);
    expect(isJpeg(new ArrayBuffer(0))).toBe(false);
  });
});

describe('stripJpegMetadata', () => {
  const FULL = [APP0_JFIF, APP1_EXIF, APP2_ICC, APP2_OTHER, APP13_IPTC, COM_SEG, DQT, SOF0, DHT];

  it('throws on non-JPEG input', () => {
    expect(() => stripJpegMetadata(new Uint8Array([1, 2, 3, 4]).buffer, { keepIcc: true })).toThrow(
      'Not a JPEG file',
    );
  });

  it('removes APP1 (EXIF), APP13 (IPTC) and COM but keeps APP0 and image segments', () => {
    const out = stripJpegMetadata(buildJpeg(FULL), { keepIcc: true });
    const m = markers(out);
    expect(m).not.toContain(0xe1);
    expect(m).not.toContain(0xed);
    expect(m).not.toContain(0xfe);
    expect(m).toContain(0xe0); // APP0 JFIF kept
    expect(m).toContain(0xdb); // DQT kept
    expect(m).toContain(0xc0); // SOF0 kept
    expect(m).toContain(0xc4); // DHT kept
    expect(m).toContain(0xda); // SOS kept
  });

  it('keeps the ICC APP2 segment when keepIcc is true but drops other APP2', () => {
    const out = new Uint8Array(stripJpegMetadata(buildJpeg(FULL), { keepIcc: true }));
    const text = Array.from(out).map((b) => String.fromCharCode(b)).join('');
    expect(text).toContain('ICC_PROFILE');
    expect(text).not.toContain('FPXR');
  });

  it('drops the ICC APP2 segment when keepIcc is false', () => {
    const out = new Uint8Array(stripJpegMetadata(buildJpeg(FULL), { keepIcc: false }));
    const text = Array.from(out).map((b) => String.fromCharCode(b)).join('');
    expect(text).not.toContain('ICC_PROFILE');
    expect(markers(out.buffer)).not.toContain(0xe2);
  });

  it('preserves SOI at the start, EOI at the end and the scan data verbatim', () => {
    const out = new Uint8Array(stripJpegMetadata(buildJpeg(FULL), { keepIcc: true }));
    expect(out[0]).toBe(0xff);
    expect(out[1]).toBe(0xd8);
    expect(out[out.length - 2]).toBe(0xff);
    expect(out[out.length - 1]).toBe(0xd9);
    const scan = Array.from(out.slice(out.length - 2 - SCAN_DATA.length, out.length - 2));
    expect(scan).toEqual(SCAN_DATA);
  });

  it('is idempotent and shrinks the file', () => {
    const original = buildJpeg(FULL);
    const once = stripJpegMetadata(original, { keepIcc: true });
    const twice = stripJpegMetadata(once, { keepIcc: true });
    expect(once.byteLength).toBeLessThan(original.byteLength);
    expect(new Uint8Array(twice)).toEqual(new Uint8Array(once));
  });

  it('throws on a corrupt segment length', () => {
    const bad = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff, 0x00]);
    expect(() => stripJpegMetadata(bad.buffer, { keepIcc: true })).toThrow(/Corrupt JPEG/);
  });
});

describe('formatting helpers', () => {
  it('formats exposure time as a fraction below one second', () => {
    expect(formatExposureTime(1 / 250)).toBe('1/250 s');
    expect(formatExposureTime(0.005)).toBe('1/200 s');
  });

  it('formats exposure time in whole seconds at or above one second', () => {
    expect(formatExposureTime(2)).toBe('2 s');
    expect(formatExposureTime(1.5)).toBe('1.5 s');
  });

  it('converts decimal coordinates to DMS with hemisphere', () => {
    expect(decimalToDms(48.858222, 'lat')).toBe(`48° 51' 29.6" N`);
    expect(decimalToDms(-0.5, 'lon')).toBe(`0° 30' 0.0" W`);
  });

  it('formats byte sizes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.00 MB');
  });

  it('builds an OpenStreetMap link', () => {
    expect(osmLink(48.85, 2.35)).toBe(
      'https://www.openstreetmap.org/?mlat=48.85&mlon=2.35#map=16/48.85/2.35',
    );
  });
});

describe('groupMetadata', () => {
  it('routes tags into the expected groups and formats values', () => {
    const groups = groupMetadata({
      Make: 'Canon',
      Model: 'EOS R5',
      ISO: 400,
      FNumber: 2.8,
      ExposureTime: 1 / 500,
      FocalLength: 85,
      DateTimeOriginal: new Date(Date.UTC(2024, 0, 15, 10, 30, 0)),
      latitude: 48.85,
      longitude: 2.35,
      Software: 'Lightroom',
      Orientation: 1,
    });
    expect(groups.camera).toEqual([
      { key: 'Make', value: 'Canon' },
      { key: 'Model', value: 'EOS R5' },
    ]);
    expect(groups.exposure).toContainEqual({ key: 'ExposureTime', value: '1/500 s' });
    expect(groups.exposure).toContainEqual({ key: 'FNumber', value: 'f/2.8' });
    expect(groups.exposure).toContainEqual({ key: 'FocalLength', value: '85 mm' });
    expect(groups.timestamps[0].value).toContain('2024-01-15 10:30:00');
    expect(groups.gps.map((e) => e.key)).toEqual(['latitude', 'longitude']);
    expect(groups.software).toEqual([{ key: 'Software', value: 'Lightroom' }]);
    expect(groups.other).toEqual([{ key: 'Orientation', value: '1' }]);
  });

  it('returns all-empty groups for an empty tag object', () => {
    const groups = groupMetadata({});
    expect(Object.values(groups).every((g) => g.length === 0)).toBe(true);
  });
});

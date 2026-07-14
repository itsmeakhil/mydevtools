import {
  ICO_SIZES,
  ICON_SIZES,
  buildHeadSnippet,
  buildIco,
  buildManifestSnippet,
  isPngBytes,
  pngFileName,
} from '@/lib/favicon-generator';

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function fakePng(payloadLength: number): Uint8Array {
  const bytes = new Uint8Array(PNG_MAGIC.length + payloadLength);
  bytes.set(PNG_MAGIC, 0);
  for (let i = 0; i < payloadLength; i++) bytes[PNG_MAGIC.length + i] = i & 0xff;
  return bytes;
}

function u16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function u32(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16)) + bytes[offset + 3] * 0x1000000;
}

describe('buildIco', () => {
  const images = [
    { size: 16, png: fakePng(10) },
    { size: 32, png: fakePng(25) },
    { size: 48, png: fakePng(7) },
  ];

  it('writes a valid ICONDIR header (reserved 0, type 1, count)', () => {
    const ico = buildIco(images);
    expect(u16(ico, 0)).toBe(0);
    expect(u16(ico, 2)).toBe(1);
    expect(u16(ico, 4)).toBe(3);
  });

  it('writes width/height bytes per entry, with 0 for sizes >= 256', () => {
    const ico = buildIco([...images, { size: 256, png: fakePng(4) }]);
    // entry i starts at 6 + i * 16
    expect(ico[6]).toBe(16);
    expect(ico[7]).toBe(16);
    expect(ico[6 + 16]).toBe(32);
    expect(ico[7 + 16]).toBe(32);
    expect(ico[6 + 32]).toBe(48);
    expect(ico[6 + 48]).toBe(0); // 256 → 0
    expect(ico[7 + 48]).toBe(0);
  });

  it('writes planes=1, bpp=32 and correct little-endian sizes/offsets', () => {
    const ico = buildIco(images);
    const headerSize = 6 + 16 * images.length;
    let expectedOffset = headerSize;
    images.forEach((img, i) => {
      const entry = 6 + i * 16;
      expect(ico[entry + 2]).toBe(0); // palette
      expect(ico[entry + 3]).toBe(0); // reserved
      expect(u16(ico, entry + 4)).toBe(1); // planes
      expect(u16(ico, entry + 6)).toBe(32); // bpp
      expect(u32(ico, entry + 8)).toBe(img.png.length);
      expect(u32(ico, entry + 12)).toBe(expectedOffset);
      expectedOffset += img.png.length;
    });
    expect(ico.length).toBe(expectedOffset);
  });

  it('embeds each PNG payload verbatim, with PNG magic at each offset', () => {
    const ico = buildIco(images);
    images.forEach((img, i) => {
      const entry = 6 + i * 16;
      const offset = u32(ico, entry + 12);
      const length = u32(ico, entry + 8);
      expect(isPngBytes(ico, offset)).toBe(true);
      expect(Array.from(ico.slice(offset, offset + length))).toEqual(Array.from(img.png));
    });
  });

  it('throws when given no images', () => {
    expect(() => buildIco([])).toThrow('at least one image');
  });
});

describe('snippet builders', () => {
  it('buildManifestSnippet produces valid JSON with 192, 512 and maskable icons', () => {
    const manifest = JSON.parse(buildManifestSnippet());
    expect(manifest.icons).toHaveLength(3);
    expect(manifest.icons[0]).toEqual({ src: '/icon-192.png', sizes: '192x192', type: 'image/png' });
    expect(manifest.icons[2].purpose).toBe('maskable');
    expect(manifest.display).toBe('standalone');
  });

  it('buildHeadSnippet references favicon.ico, apple-touch-icon and manifest', () => {
    const head = buildHeadSnippet();
    expect(head).toContain('href="/favicon.ico"');
    expect(head).toContain('rel="apple-touch-icon"');
    expect(head).toContain('href="/site.webmanifest"');
    expect(head).toContain('sizes="192x192"');
  });
});

describe('pngFileName', () => {
  it('names the 180px icon apple-touch-icon.png', () => {
    expect(pngFileName(180)).toBe('apple-touch-icon.png');
  });

  it('names regular and maskable icons by size', () => {
    expect(pngFileName(512)).toBe('icon-512.png');
    expect(pngFileName(512, true)).toBe('icon-512-maskable.png');
  });
});

describe('size constants', () => {
  it('ICO_SIZES is a subset of ICON_SIZES', () => {
    for (const size of ICO_SIZES) {
      expect(ICON_SIZES).toContain(size);
    }
  });
});

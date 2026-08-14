import { safeFileName } from '@/lib/markdown-preview-html';

describe('safeFileName', () => {
  it('keeps plain names, spaces and dashes', () => {
    expect(safeFileName('my notes-v2')).toBe('my notes-v2');
  });

  it('drops a trailing .html/.htm so export does not double it', () => {
    expect(safeFileName('report.html')).toBe('report');
    expect(safeFileName('report.HTM')).toBe('report');
  });

  it('strips path separators and illegal chars', () => {
    expect(safeFileName('../../etc/pass:wd')).toBe('etcpasswd');
  });

  it('falls back to export when nothing usable is left', () => {
    expect(safeFileName('   ')).toBe('export');
    expect(safeFileName('///')).toBe('export');
  });

  it('caps length', () => {
    expect(safeFileName('a'.repeat(300))).toHaveLength(100);
  });
});

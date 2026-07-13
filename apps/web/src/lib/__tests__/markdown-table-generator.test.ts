import {
  parseDelimited,
  buildMarkdownTable,
  buildHtmlTable,
  escapeHtml,
  type ColumnAlign,
} from '@/lib/markdown-table-generator';

describe('parseDelimited', () => {
  it('returns an empty array for blank input', () => {
    expect(parseDelimited('')).toEqual([]);
    expect(parseDelimited('  \n  ')).toEqual([]);
  });

  it('parses TSV when tabs are present', () => {
    expect(parseDelimited('a\tb\tc\n1\t2\t3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('parses CSV when no tabs are present', () => {
    expect(parseDelimited('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('handles quoted CSV cells with embedded commas', () => {
    expect(parseDelimited('name,notes\nAda,"loves math, and code"')).toEqual([
      ['name', 'notes'],
      ['Ada', 'loves math, and code'],
    ]);
  });

  it('handles doubled quotes inside quoted cells', () => {
    expect(parseDelimited('q\n"she said ""hi"""')).toEqual([
      ['q'],
      ['she said "hi"'],
    ]);
  });

  it('handles newlines inside quoted cells', () => {
    expect(parseDelimited('a,b\n"line1\nline2",x')).toEqual([
      ['a', 'b'],
      ['line1\nline2', 'x'],
    ]);
  });

  it('normalizes CRLF line endings', () => {
    expect(parseDelimited('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('keeps empty cells and drops only trailing empty rows', () => {
    expect(parseDelimited('a,,c\n,,\n1,2,3\n\n')).toEqual([
      ['a', '', 'c'],
      ['', '', ''],
      ['1', '2', '3'],
    ]);
  });
});

describe('buildMarkdownTable', () => {
  const headers = ['Name', 'Role'];
  const rows = [
    ['Ada', 'admin'],
    ['Linus', 'developer'],
  ];

  it('returns an empty string with no columns', () => {
    expect(buildMarkdownTable([], [], [])).toBe('');
  });

  it('pads cells so pipes align', () => {
    const md = buildMarkdownTable(headers, rows, ['left', 'left']);
    const lines = md.split('\n');
    expect(lines).toEqual([
      '| Name  | Role      |',
      '| ----- | --------- |',
      '| Ada   | admin     |',
      '| Linus | developer |',
    ]);
    const pipeCols = lines.map((l) => l.indexOf('|', 1));
    expect(new Set(pipeCols).size).toBe(1);
  });

  it('emits alignment colons in the separator row', () => {
    const md = buildMarkdownTable(['L', 'C', 'R'], [['1', '2', '3']], [
      'left',
      'center',
      'right',
    ] as ColumnAlign[]);
    const sep = md.split('\n')[1];
    expect(sep).toBe('| --- | :-: | --: |');
  });

  it('centers and right-aligns cell padding', () => {
    const md = buildMarkdownTable(['Head'], [['x']], ['right']);
    expect(md.split('\n')[2]).toBe('|    x |');
    const centered = buildMarkdownTable(['Head'], [['x']], ['center']);
    expect(centered.split('\n')[2]).toBe('|  x   |');
  });

  it('escapes pipes and converts newlines to <br>', () => {
    const md = buildMarkdownTable(['a'], [['x|y'], ['l1\nl2']], ['left']);
    expect(md).toContain('x\\|y');
    expect(md).toContain('l1<br>l2');
  });

  it('fills missing cells and defaults missing aligns to left', () => {
    const md = buildMarkdownTable(['a', 'b'], [['only']], []);
    const lines = md.split('\n');
    expect(lines[2]).toBe('| only |     |');
    expect(lines[1]).toBe('| ---- | --- |');
  });
});

describe('buildHtmlTable', () => {
  it('returns an empty string with no columns', () => {
    expect(buildHtmlTable([], [], [])).toBe('');
  });

  it('builds thead/tbody structure with alignment styles', () => {
    const html = buildHtmlTable(['A', 'B'], [['1', '2']], ['center', 'right']);
    expect(html).toContain('<table>');
    expect(html).toContain('<th style="text-align: center">A</th>');
    expect(html).toContain('<th style="text-align: right">B</th>');
    expect(html).toContain('<td style="text-align: center">1</td>');
    expect(html).toContain('</tbody>\n</table>');
  });

  it('omits the style attribute for left alignment', () => {
    const html = buildHtmlTable(['A'], [['1']], ['left']);
    expect(html).toContain('<th>A</th>');
    expect(html).toContain('<td>1</td>');
  });

  it('escapes HTML entities in headers and cells', () => {
    const html = buildHtmlTable(['<b>'], [['a & "b" \'c\'']], ['left']);
    expect(html).toContain('<th>&lt;b&gt;</th>');
    expect(html).toContain('<td>a &amp; &quot;b&quot; &#39;c&#39;</td>');
  });

  it('fills missing cells with empty tds', () => {
    const html = buildHtmlTable(['a', 'b'], [['only']], []);
    expect(html).toContain('<td>only</td>');
    expect(html).toContain('<td></td>');
  });
});

describe('escapeHtml', () => {
  it('escapes all five special characters', () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;');
  });
});

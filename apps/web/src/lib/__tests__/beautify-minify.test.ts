import { beautify, minify, BEAUTIFY_LANGS } from '@/lib/beautify-minify';
import type { BeautifyLang } from '@/lib/beautify-minify';

describe('beautify', () => {
  it('returns empty output with no error for blank input', () => {
    for (const { value } of BEAUTIFY_LANGS) {
      expect(beautify('', value)).toEqual({ output: '', error: null });
      expect(beautify('   \n\t ', value)).toEqual({ output: '', error: null });
    }
  });

  it('pretty-prints JSON with the requested indent and round-trips', () => {
    const input = '{"a":1,"b":{"c":[1,2]}}';
    const two = beautify(input, 'json', 2);
    expect(two.error).toBeNull();
    expect(two.output).toContain('\n  "a": 1');
    expect(JSON.parse(two.output)).toEqual(JSON.parse(input));

    const four = beautify(input, 'json', 4);
    expect(four.output).toContain('\n    "a": 1');
    expect(JSON.parse(four.output)).toEqual(JSON.parse(input));
  });

  it('reports an error for invalid JSON', () => {
    const result = beautify('{"a":}', 'json');
    expect(result.output).toBe('');
    expect(result.error).not.toBeNull();
  });

  it('formats CSS with one declaration per line and nesting', () => {
    const result = beautify('@media screen{.a{color:red;margin:0}}', 'css');
    expect(result.error).toBeNull();
    expect(result.output).toBe(
      '@media screen {\n  .a {\n    color: red;\n    margin: 0;\n  }\n}',
    );
  });

  it('indents HTML by nesting depth and preserves raw-text blocks', () => {
    const result = beautify('<div><p>Hi</p><pre>  keep\n  me</pre></div>', 'html');
    expect(result.error).toBeNull();
    expect(result.output).toContain('<div>\n  <p>');
    expect(result.output).toContain('<pre>  keep\n  me</pre>');
  });

  it('indents XML including directives', () => {
    const result = beautify('<?xml version="1.0"?><root><item>1</item></root>', 'xml');
    expect(result.error).toBeNull();
    expect(result.output.split('\n')).toEqual([
      '<?xml version="1.0"?>',
      '<root>',
      '  <item>',
      '    1',
      '  </item>',
      '</root>',
    ]);
  });

  it('re-indents JavaScript braces without touching string contents', () => {
    const result = beautify('function f(){const s="a;{b}";return s;}', 'js');
    expect(result.error).toBeNull();
    expect(result.output).toContain('"a;{b}"');
    expect(result.output).toContain('\n');
  });
});

describe('minify', () => {
  it('returns empty output with no error for blank input', () => {
    for (const { value } of BEAUTIFY_LANGS) {
      expect(minify('', value)).toEqual({ output: '', error: null });
    }
  });

  it('minifies JSON to its compact form', () => {
    const result = minify('{\n  "a": 1,\n  "b": [1, 2]\n}', 'json');
    expect(result).toEqual({ output: '{"a":1,"b":[1,2]}', error: null });
  });

  it('reports an error for invalid JSON', () => {
    const result = minify('[1,', 'json');
    expect(result.output).toBe('');
    expect(result.error).not.toBeNull();
  });

  it('minifies CSS, dropping comments and the last semicolon in a block', () => {
    const result = minify('/* note */ .a {\n  color: red;\n  margin: 0;\n}', 'css');
    expect(result).toEqual({ output: '.a{color:red;margin:0}', error: null });
  });

  it('keeps CSS string literals intact', () => {
    const result = minify('.a { content: "a ; b"; }', 'css');
    expect(result.output).toContain('"a ; b"');
  });

  it('minifies HTML, removing comments and inter-tag whitespace', () => {
    const result = minify('<div>\n  <!-- gone -->\n  <p>Hi</p>\n</div>', 'html');
    expect(result.error).toBeNull();
    expect(result.output).not.toContain('gone');
    expect(result.output).toContain('<p>Hi</p>');
  });

  it('preserves script/pre content verbatim in HTML', () => {
    const input = '<pre>  spaced\n  out</pre>';
    const result = minify(`<div>${input}</div>`, 'html');
    expect(result.output).toContain(input);
  });

  it('minifies JS, dropping comments but keeping strings and regex', () => {
    const result = minify('const re = /a b/; // trailing\nconst s = "x  y" ;', 'js');
    expect(result.error).toBeNull();
    expect(result.output).toContain('/a b/');
    expect(result.output).toContain('"x  y"');
    expect(result.output).not.toContain('trailing');
  });

  it('never grows the input for any language', () => {
    const samples: Record<BeautifyLang, string> = {
      json: '{ "a": 1,  "b": 2 }',
      css: '.a {  color : red ; }',
      js: 'const a = 1 ;  const b = 2 ;',
      html: '<div>  <p>Hi</p>  </div>',
      xml: '<root>  <a>1</a>  </root>',
    };
    for (const [lang, input] of Object.entries(samples) as [BeautifyLang, string][]) {
      const { output, error } = minify(input, lang);
      expect(error).toBeNull();
      expect(output.length).toBeLessThanOrEqual(input.length);
    }
  });
});

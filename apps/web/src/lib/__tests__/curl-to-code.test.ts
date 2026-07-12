import { parseCurl, curlToCode, CURL_TARGETS } from '@/lib/curl-to-code';

const SAMPLE = `curl -X POST https://api.example.com/v1/users \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer token123' \\
  -d '{"name":"Ada","role":"admin"}'`;

describe('parseCurl', () => {
  it('parses method, url, headers, and body from a full command', () => {
    const parsed = parseCurl(SAMPLE);
    expect(parsed.method).toBe('POST');
    expect(parsed.url).toBe('https://api.example.com/v1/users');
    expect(parsed.headers).toEqual([
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Authorization', value: 'Bearer token123' },
    ]);
    expect(parsed.body).toBe('{"name":"Ada","role":"admin"}');
    expect(parsed.auth).toBeNull();
  });

  it('defaults to GET without a body', () => {
    expect(parseCurl('curl https://example.com').method).toBe('GET');
  });

  it('implies POST when -d is present without -X', () => {
    const parsed = parseCurl('curl https://example.com -d "a=1"');
    expect(parsed.method).toBe('POST');
    expect(parsed.body).toBe('a=1');
  });

  it('joins multiple -d flags with &', () => {
    const parsed = parseCurl('curl https://example.com -d a=1 -d b=2');
    expect(parsed.body).toBe('a=1&b=2');
  });

  it('handles double-quoted values and escaped characters', () => {
    const parsed = parseCurl('curl -H "X-Note: hello world" "https://example.com/a b"');
    expect(parsed.headers).toEqual([{ name: 'X-Note', value: 'hello world' }]);
    expect(parsed.url).toBe('https://example.com/a b');
  });

  it('parses -u basic auth credentials', () => {
    const parsed = parseCurl('curl -u alice:s3cret https://example.com');
    expect(parsed.auth).toEqual({ user: 'alice', password: 's3cret' });
  });

  it('maps -A, -e, and -b onto headers', () => {
    const parsed = parseCurl("curl -A 'MyAgent' -e 'https://ref.example' -b 'k=v' https://example.com");
    expect(parsed.headers).toEqual([
      { name: 'User-Agent', value: 'MyAgent' },
      { name: 'Referer', value: 'https://ref.example' },
      { name: 'Cookie', value: 'k=v' },
    ]);
  });

  it('throws on input that is not a curl command', () => {
    expect(() => parseCurl('wget https://example.com')).toThrow('Not a curl command');
  });
});

describe('curlToCode', () => {
  it('returns empty code with no error for blank input', () => {
    expect(curlToCode('', 'fetch')).toEqual({ code: '', error: null });
    expect(curlToCode('   ', 'fetch')).toEqual({ code: '', error: null });
  });

  it('surfaces the parse error for non-curl input', () => {
    const result = curlToCode('echo hi', 'fetch');
    expect(result.code).toBe('');
    expect(result.error).toBe('Not a curl command');
  });

  it('generates non-empty code containing the URL for every target', () => {
    for (const { value } of CURL_TARGETS) {
      const { code, error } = curlToCode(SAMPLE, value);
      expect(error).toBeNull();
      expect(code.length).toBeGreaterThan(0);
      expect(code).toContain('api.example.com');
    }
  });

  it('emits idiomatic markers per target', () => {
    expect(curlToCode(SAMPLE, 'fetch').code).toContain('await fetch(');
    expect(curlToCode(SAMPLE, 'node-fetch').code).toContain('import fetch from "node-fetch"');
    expect(curlToCode(SAMPLE, 'axios').code).toContain('import axios');
    expect(curlToCode(SAMPLE, 'xhr').code).toContain('new XMLHttpRequest()');
    expect(curlToCode(SAMPLE, 'python-requests').code).toContain('import requests');
    expect(curlToCode(SAMPLE, 'python-http').code).toContain('http.client.HTTPSConnection');
    expect(curlToCode(SAMPLE, 'go').code).toContain('http.NewRequest');
    expect(curlToCode(SAMPLE, 'php-curl').code).toContain('curl_init()');
    expect(curlToCode(SAMPLE, 'ruby').code).toContain('Net::HTTP');
    expect(curlToCode(SAMPLE, 'java').code).toContain('HttpClient.newHttpClient()');
    expect(curlToCode(SAMPLE, 'csharp').code).toContain('new HttpClient()');
  });

  it('adds a base64 Authorization header for targets without native auth', () => {
    const cmd = 'curl -u alice:s3cret https://example.com';
    const { code } = curlToCode(cmd, 'fetch');
    // btoa('alice:s3cret')
    expect(code).toContain('Basic YWxpY2U6czNjcmV0');
  });

  it('passes credentials natively where the client supports them', () => {
    const cmd = 'curl -u alice:s3cret https://example.com';
    const axios = curlToCode(cmd, 'axios').code;
    expect(axios).toContain('username: "alice"');
    const python = curlToCode(cmd, 'python-requests').code;
    expect(python).toContain("auth=('alice', 's3cret')");
  });
});

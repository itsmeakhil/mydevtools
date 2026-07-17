import { paletteFilter } from '../palette-entries'

// keywords[0] = lowercased title, keywords[1] = full searchValue blob
const kw = (title: string, blob: string) => [title.toLowerCase(), blob.toLowerCase()]

describe('paletteFilter', () => {
  const jsonFmt = kw('json formatter', 'json formatter format pretty print beautify formatters')
  const base64 = kw('base64 encode / decode', 'base64 encode decode converters')

  test('empty query keeps everything', () => {
    expect(paletteFilter('/x', '', jsonFmt)).toBe(1)
  })

  test('title beats description-only match', () => {
    const titleHit = paletteFilter('/a', 'json', jsonFmt)
    const blobOnly = paletteFilter('/b', 'json', kw('uuid generator', 'uuid json id generators'))
    expect(titleHit).toBeGreaterThan(blobOnly)
  })

  test('exact title ranks highest', () => {
    expect(paletteFilter('/a', 'json formatter', jsonFmt)).toBe(1)
    expect(paletteFilter('/a', 'json', jsonFmt)).toBeLessThan(1)
  })

  test('word-start inside title scores above mid-word', () => {
    expect(paletteFilter('/a', 'formatter', jsonFmt)).toBe(0.8) // word start
    expect(paletteFilter('/a', 'ormat', jsonFmt)).toBe(0.6) // mid-word substring
  })

  test('non-matching query is hidden', () => {
    expect(paletteFilter('/a', 'zzzz', jsonFmt)).toBe(0)
  })

  test('no fuzzy subsequence false positives', () => {
    // "jsn" is a subsequence of "json formatter" but not a substring — old fuzzy
    // filter would match it; substring filter must not.
    expect(paletteFilter('/a', 'jsn', jsonFmt)).toBe(0)
  })

  test('multi-word any-order match', () => {
    expect(paletteFilter('/a', 'decode base64', base64)).toBeGreaterThan(0)
  })
})

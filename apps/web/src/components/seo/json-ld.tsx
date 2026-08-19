/**
 * One JSON-LD script tag, escaped once.
 *
 * `JSON.stringify` happily emits `</script>` if any string in the graph
 * contains it, which closes the tag early and drops the rest of the page's
 * markup into the document. Escaping every `<` as a unicode escape keeps the
 * value identical to a JSON parser and inert to the HTML tokenizer.
 */
export function JsonLd({ id, data }: { id?: string; data: unknown }) {
  return (
    <script
      id={id}
      type="application/ld+json"
      // Escaped above; the only writer is our own build-time SEO data.
      // threatcrush-disable-next-line js-unescaped-html-sink
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}

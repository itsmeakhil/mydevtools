import { mapStrings, RUN_REQUEST } from "@/lib/terminal/request-curl"

describe("request → terminal", () => {
  it("mapStrings rewrites every string leaf and keeps structure and other values", () => {
    const tab = { url: "{{base}}/x", headers: [{ key: "Auth", value: "{{tok}}", active: true }], body: { raw: "{{b}}" }, n: 3, nil: null }
    const out = mapStrings(tab, (s) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => `<${k}>`))
    expect(out).toEqual({ url: "<base>/x", headers: [{ key: "Auth", value: "<tok>", active: true }], body: { raw: "<b>" }, n: 3, nil: null })
    expect(tab.url).toBe("{{base}}/x") // input untouched
  })
  it("the typed command never contains the request itself", () => {
    expect(RUN_REQUEST).toBe('eval "$REQUEST_CURL"')
  })
})

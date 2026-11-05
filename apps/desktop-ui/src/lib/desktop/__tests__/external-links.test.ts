import { isExternalUrl } from "../external-links"

const BASE = "tauri://localhost/app/terminal"

describe("isExternalUrl", () => {
  it("treats other-origin http(s), mailto and tel as external", () => {
    expect(isExternalUrl("https://github.com/x", BASE)).toBe(true)
    expect(isExternalUrl("http://localhost:8080/", "http://localhost:3000/app")).toBe(true)
    expect(isExternalUrl("mailto:a@b.co", BASE)).toBe(true)
    expect(isExternalUrl("tel:+123", BASE)).toBe(true)
  })

  it("keeps in-app links, same origin, other schemes and garbage internal", () => {
    expect(isExternalUrl("/app/notes", BASE)).toBe(false)
    expect(isExternalUrl("#top", BASE)).toBe(false)
    expect(isExternalUrl("http://localhost:3000/app", "http://localhost:3000/app/terminal")).toBe(false)
    expect(isExternalUrl("javascript:alert(1)", BASE)).toBe(false)
    expect(isExternalUrl("file:///etc/passwd", BASE)).toBe(false)
    expect(isExternalUrl("http://[bad", BASE)).toBe(false)
  })
})

import { formatKeys, matchShortcut } from "../shortcuts"

const ev = (p: Partial<KeyboardEvent>) => ({ key: "", code: "", metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...p })

describe("matchShortcut", () => {
    it("maps mod to ⌘ on macOS and Ctrl elsewhere", () => {
        expect(matchShortcut(ev({ key: "s", code: "KeyS", metaKey: true }), true)).toBe("saveRequest")
        expect(matchShortcut(ev({ key: "s", code: "KeyS", ctrlKey: true }), false)).toBe("saveRequest")
        expect(matchShortcut(ev({ key: "s", code: "KeyS", ctrlKey: true }), true)).toBeNull()
    })

    it("needs exact modifiers", () => {
        expect(matchShortcut(ev({ key: "S", code: "KeyS", metaKey: true, shiftKey: true }), true)).toBeNull()
        expect(matchShortcut(ev({ key: "s", code: "KeyS" }), true)).toBeNull()
    })

    it("matches letters by typed character (Dvorak) but by physical key with ⌥ (macOS symbols)", () => {
        // Dvorak: physical KeyO types "s".
        expect(matchShortcut(ev({ key: "s", code: "KeyO", metaKey: true }), true)).toBe("saveRequest")
        expect(matchShortcut(ev({ key: "o", code: "KeyS", metaKey: true }), true)).toBeNull()
        expect(matchShortcut(ev({ key: "†", code: "KeyT", altKey: true }), true)).toBe("newTab")
    })

    it("matches shifted brackets and the Ctrl+Tab aliases", () => {
        expect(matchShortcut(ev({ key: "}", code: "BracketRight", metaKey: true, shiftKey: true }), true)).toBe("nextTab")
        expect(matchShortcut(ev({ key: "{", code: "BracketLeft", metaKey: true, shiftKey: true }), true)).toBe("prevTab")
        expect(matchShortcut(ev({ key: "Tab", code: "Tab", ctrlKey: true }), true)).toBe("nextTab")
        expect(matchShortcut(ev({ key: "Tab", code: "Tab", ctrlKey: true, shiftKey: true }), false)).toBe("prevTab")
    })

    it("matches Enter and L", () => {
        expect(matchShortcut(ev({ key: "Enter", code: "Enter", metaKey: true }), true)).toBe("sendRequest")
        expect(matchShortcut(ev({ key: "l", code: "KeyL", ctrlKey: true }), false)).toBe("focusUrl")
    })
})

describe("formatKeys", () => {
    it("uses symbols on macOS and plus-joined names elsewhere", () => {
        expect(formatKeys("mod+Shift+]", true)).toBe("⌘⇧]")
        expect(formatKeys("mod+Shift+]", false)).toBe("Ctrl+Shift+]")
        expect(formatKeys("mod+Enter", true)).toBe("⌘↵")
        expect(formatKeys("Alt+T", true)).toBe("⌥T")
    })
})

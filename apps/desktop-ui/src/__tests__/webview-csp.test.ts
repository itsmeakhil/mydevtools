import fs from "node:fs"
import path from "node:path"

/**
 * The desktop CSP (apps/desktop/src-tauri/src/csp.rs) allows Monaco only from the
 * exact jsdelivr package path @monaco-editor/loader defaults to. A loader bump that
 * changes the version would leave every editor on "Loading editor..." in the app.
 */
test("desktop CSP allows the Monaco path the loader actually uses", () => {
    const react = require.resolve("@monaco-editor/react")
    const loaderDir = path.dirname(require.resolve("@monaco-editor/loader/package.json", { paths: [react] }))
    const config = fs.readFileSync(path.join(loaderDir, "lib/cjs/config/index.js"), "utf8")
    const vs = config.match(/vs:\s*'([^']+)'/)?.[1]
    expect(vs).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/npm\/monaco-editor@[\d.]+\/min\/vs$/)

    const csp = fs.readFileSync(path.join(__dirname, "../../../desktop/src-tauri/src/csp.rs"), "utf8")
    const allowed = vs!.replace(/min\/vs$/, "")
    expect(csp).toContain(allowed)
})

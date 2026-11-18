/**
 * Lets Node run the desktop app's TypeScript sources (the runner, scripts,
 * variables, importers) without a build step or new dependencies:
 *  - resolves `@/…` to apps/desktop-ui/src and extensionless TS imports,
 *  - transpiles .ts/.tsx with the TypeScript compiler desktop-ui already has,
 *  - resolves bare packages (undici, js-yaml) from desktop-ui's install.
 *
 * ponytail: transpile-only on every start (~1 s); bundle with esbuild before
 * publishing to npm, since a published package can't reach ../../apps.
 */
import { registerHooks, createRequire } from "node:module"
import { existsSync, readFileSync, statSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"
import path from "node:path"

const here = path.dirname(fileURLToPath(import.meta.url))
const UI = path.resolve(here, "../../apps/desktop-ui")
const UI_SRC = path.join(UI, "src")
const UI_URL = pathToFileURL(path.join(UI, "package.json")).href
const ts = createRequire(path.join(UI, "package.json"))("typescript")

const isFile = (f) => existsSync(f) && statSync(f).isFile()
function withExt(file) {
    if (isFile(file)) return file
    for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) if (isFile(file + ext)) return file + ext
    return null
}
const isTs = (url) => /\.tsx?$/.test(url)

registerHooks({
    resolve(specifier, context, nextResolve) {
        let file = null
        if (specifier.startsWith("@/")) file = withExt(path.join(UI_SRC, specifier.slice(2)))
        else if (/^\.\.?\//.test(specifier) && context.parentURL && isTs(context.parentURL)) {
            file = withExt(path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier))
        }
        if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
        try {
            return nextResolve(specifier, context)
        } catch (e) {
            if (e?.code !== "ERR_MODULE_NOT_FOUND") throw e
            return nextResolve(specifier, { ...context, parentURL: UI_URL })
        }
    },
    load(url, context, nextLoad) {
        if (!isTs(url)) return nextLoad(url, context)
        const fileName = fileURLToPath(url)
        const { outputText } = ts.transpileModule(readFileSync(fileName, "utf8"), {
            fileName,
            compilerOptions: {
                module: ts.ModuleKind.ESNext,
                target: ts.ScriptTarget.ES2022,
                jsx: ts.JsxEmit.ReactJSX,
                esModuleInterop: true,
                inlineSourceMap: true,
            },
        })
        return { format: "module", source: outputText, shortCircuit: true }
    },
})

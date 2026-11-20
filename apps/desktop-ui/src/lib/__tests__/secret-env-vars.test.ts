jest.mock("@/lib/desktop/save-file", () => ({ downloadFile: jest.fn() }))

import { exportPostmanEnvironment } from "../export/postman-env"
import { importPostmanEnvironment } from "../import/postman-env"
import { parseBrunoEnvironment } from "../import/bruno"
import type { Environment } from "@/components/api-client/use-environments"

const SECRET = "sk_live_DO_NOT_LEAK_123"

const env: Environment = {
    id: "e1",
    name: "Prod",
    variables: [
        { id: "1", key: "host", value: "https://api.example.com", enabled: true },
        { id: "2", key: "token", value: SECRET, enabled: true, secret: true },
    ],
}

describe("secret environment variables", () => {
    it("never appear in a Postman environment export; the key survives as type secret", () => {
        const out = exportPostmanEnvironment(env)
        expect(out).not.toContain(SECRET)
        const values = JSON.parse(out).values
        expect(values).toEqual([
            { key: "host", value: "https://api.example.com", enabled: true, type: "default" },
            { key: "token", value: "", enabled: true, type: "secret" },
        ])
    })

    it("keep the flag through Postman import (round-trip loses only the value)", () => {
        const back = importPostmanEnvironment(exportPostmanEnvironment(env))
        expect(back.variables.find((v) => v.key === "token")).toMatchObject({ value: "", secret: true })
        expect(back.variables.find((v) => v.key === "host")?.secret).toBeUndefined()
    })

    it("Bruno vars:secret entries import as secret", () => {
        const parsed = parseBrunoEnvironment("vars {\n  host: https://x\n}\nvars:secret [\n  token\n]\n", "Prod")
        expect(parsed.variables.map((v) => [v.key, !!v.secret])).toEqual([["host", false], ["token", true]])
    })
})

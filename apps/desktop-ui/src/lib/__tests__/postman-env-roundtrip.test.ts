import { exportPostmanEnvironment } from "../export/postman-env"
import { importPostmanEnvironment, looksLikePostmanEnvironment } from "../import/postman-env"
import { detectImportFormat } from "../import/detect"

const env = {
    id: "env-1",
    name: "Prod",
    variables: [
        { id: "a", key: "host", value: "https://api.example.com", enabled: true },
        { id: "b", key: "token", value: "{{vault.prod}}", enabled: false },
        { id: "c", key: "", value: "ignored", enabled: true },
    ],
}

describe("postman environment export/import round-trip", () => {
    it("exports values and re-imports them with enabled flags intact", () => {
        const json = exportPostmanEnvironment(env)
        expect(looksLikePostmanEnvironment(json)).toBe(true)
        expect(detectImportFormat(json)).toBe("postman-env")
        const back = importPostmanEnvironment(json)
        expect(back.name).toBe("Prod")
        expect(back.variables.map((v) => [v.key, v.value, v.enabled])).toEqual([
            ["host", "https://api.example.com", true],
            ["token", "{{vault.prod}}", false],
        ])
    })

    it("does not mistake a Postman collection for an environment", () => {
        const collection = JSON.stringify({ info: { schema: "https://schema.getpostman.com/x" }, item: [] })
        expect(detectImportFormat(collection)).toBe("postman")
    })
})

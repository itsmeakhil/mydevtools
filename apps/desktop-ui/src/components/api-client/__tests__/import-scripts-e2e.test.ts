/**
 * B8 import fidelity: real Bruno / Postman collection text → importer →
 * scripts run in the actual worker module. Catches mapping gaps between what
 * the importers keep and what the sandbox understands.
 */

jest.mock("comlink", () => {
    const captured = { current: null as unknown }
    return { expose: (a: unknown) => { captured.current = a }, __captured: captured }
})

import "../workers/scripts-runner.worker"
import type { ScriptContext, ScriptResult } from "../workers/scripts-runner.worker"
import type { ScriptHost } from "@/lib/api-client/script-sandbox"
import { parseBruRequest } from "@/lib/import/bruno"
import { importPostmanCollection } from "@/lib/import/postman"
import { evaluateAssertions } from "@/lib/api-client/assertions"
import type { CollectionRequest } from "../types"

type Api = { run: (script: string, ctx: ScriptContext, host?: ScriptHost) => Promise<ScriptResult> }
const api = (jest.requireMock("comlink") as { __captured: { current: Api } }).__captured.current

const response = {
    status: 201,
    statusText: "Created",
    headers: { "Content-Type": "application/json", "X-Trace": "t-1" },
    body: JSON.stringify({ id: 7, token: "tok-abc", items: [{ sku: "a" }, { sku: "b" }] }),
    time: 42,
}

const ctx = (over: Partial<ScriptContext> = {}): ScriptContext => ({
    request: { url: "https://api.test/orders", method: "POST", headers: {}, body: '{"qty":1}' },
    environment: { baseUrl: "https://api.test" },
    variables: {},
    ...over,
})

describe("Bruno .bru import → sandbox", () => {
    const bru = `meta {
  name: Create order
  type: http
  seq: 1
}

post {
  url: {{baseUrl}}/orders
  body: json
  auth: none
}

body:json {
  {"qty": 1}
}

assert {
  res.status: eq 201
  res.body.items[1].sku: eq "b"
}

script:pre-request {
  const body = req.getBody();
  body.qty = body.qty + 1;
  req.setBody(body);
  req.setHeader("X-Env", bru.getEnvVar("baseUrl"));
  bru.setVar("startedAt", "now");
}

script:post-response {
  bru.setEnvVar("orderId", res.getBody().id);
  bru.setVar("token", res.body.token);
}

tests {
  test("created", function () {
    expect(res.getStatus()).to.equal(201);
    expect(res.getHeader("content-type")).to.contain("json");
    expect(res.getBody().items).to.have.lengthOf(2);
  });
  test("fast enough", () => expect(res.getResponseTime()).to.be.below(1000));
}
`
    let req: CollectionRequest
    beforeAll(() => { req = parseBruRequest(bru) })

    it("pre-request script edits the outgoing request through req/bru", async () => {
        const r = await api.run(req.preRequestScript!, ctx())
        expect(r.error).toBeUndefined()
        expect(JSON.parse(r.request.body!)).toEqual({ qty: 2 })
        expect(r.request.headers["X-Env"]).toBe("https://api.test")
        expect(r.variables.startedAt).toBe("now")
    })

    it("post-response script + tests block run against res", async () => {
        const r = await api.run(req.testScript!, ctx({ response }))
        expect(r.error).toBeUndefined()
        expect(r.environment.orderId).toBe("7")
        expect(r.variables.token).toBe("tok-abc")
        expect(r.tests).toEqual([
            { name: "created", pass: true },
            { name: "fast enough", pass: true },
        ])
    })

    it("assert block compiles to passing assertions", () => {
        const results = evaluateAssertions(req.assertions, response)
        expect(results.map((t) => t.pass)).toEqual([true, true])
    })
})

describe("Postman v2.1 import → sandbox", () => {
    const collection = importPostmanCollection({
        info: { name: "Shop", schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
        variable: [{ key: "apiVersion", value: "v2" }],
        item: [{
            name: "Create order",
            request: { method: "POST", url: "https://api.test/{{apiVersion}}/orders" },
            event: [
                { listen: "prerequest", script: { exec: [
                    "pm.request.headers.add({ key: 'X-Api', value: pm.collectionVariables.get('apiVersion') });",
                    "pm.request.headers.add({ key: 'X-Region', value: pm.variables.get('region') });",
                ] } },
                { listen: "test", script: { exec: [
                    "const json = pm.response.json();",
                    "pm.test('status is 201', () => pm.response.to.have.status(201));",
                    "pm.test('has id', () => pm.expect(json).to.have.property('id', 7));",
                    "pm.collectionVariables.set('lastOrder', json.id);",
                ] } },
            ],
        }],
    })
    const item = collection.items[0] as CollectionRequest

    it("keeps collection variables on the collection", () => {
        expect(collection.variables?.find((v) => v.key === "apiVersion")?.value).toBe("v2")
    })

    it("pre-request reads collection variables and globals", async () => {
        const r = await api.run(item.preRequestScript!, ctx({
            collectionVariables: { apiVersion: "v2" },
            globals: { region: "eu" },
        }))
        expect(r.error).toBeUndefined()
        expect(r.request.headers).toMatchObject({ "X-Api": "v2", "X-Region": "eu" })
    })

    it("test script passes and collectionVariables.set reaches session variables", async () => {
        const r = await api.run(item.testScript!, ctx({ response, collectionVariables: { apiVersion: "v2" } }))
        expect(r.error).toBeUndefined()
        expect(r.tests.every((t) => t.pass)).toBe(true)
        expect(r.variables.lastOrder).toBe("7")
    })
})

describe("scripts may reuse the Bruno global names", () => {
    it("const res / req / test / bru declarations don't clash", async () => {
        const r = await api.run(
            `const res = pm.response.json(); const req = 1; const bru = 2; function test() { return 3 }
             pm.test("own names", () => pm.expect(res.id + req + bru + test()).to.equal(13))`,
            ctx({ response }),
        )
        expect(r.error).toBeUndefined()
        expect(r.tests).toEqual([{ name: "own names", pass: true }])
    })
})

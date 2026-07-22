import { planVaultMoves } from "../move-to-vault"
import type { Collection, CollectionFolder, CollectionRequest } from "@/components/api-client/types"

const request = (over: Partial<CollectionRequest>): CollectionRequest => ({
    id: "r",
    name: "Req",
    method: "GET",
    url: "https://x",
    params: [],
    headers: [],
    body: { type: "none", content: "" },
    auth: { type: "none" },
    ...over,
})

describe("planVaultMoves", () => {
    test("rewrites literals to {{vault.*}} tokens and plans creates", () => {
        const col: Collection = {
            id: "c",
            name: "c",
            items: [
                request({ id: "r1", name: "Login", auth: { type: "bearer", token: "literal-abc" } }),
            ],
        }
        const plan = planVaultMoves(col, new Map())
        expect(plan.moved).toBe(1)
        expect(plan.creates).toEqual([{ name: "login-token", value: "literal-abc" }])
        expect((plan.collection.items[0] as CollectionRequest).auth.token).toBe("{{vault.login-token}}")
        // original untouched
        expect((col.items[0] as CollectionRequest).auth.token).toBe("literal-abc")
    })

    test("reuses an existing vault entry holding the same value", () => {
        const col: Collection = {
            id: "c",
            name: "c",
            items: [request({ id: "r1", name: "Login", auth: { type: "bearer", token: "shared-secret" } })],
        }
        const plan = planVaultMoves(col, new Map([["prod-api-key", "shared-secret"]]))
        expect(plan.creates).toEqual([])
        expect(plan.moved).toBe(1)
        expect((plan.collection.items[0] as CollectionRequest).auth.token).toBe("{{vault.prod-api-key}}")
    })

    test("suffixes when the name is taken by a different value; dedupes same value across requests", () => {
        const col: Collection = {
            id: "c",
            name: "c",
            items: [
                request({ id: "r1", name: "Login", auth: { type: "bearer", token: "new-secret" } }),
                request({ id: "r2", name: "Login", auth: { type: "bearer", token: "new-secret" } }),
            ],
        }
        const plan = planVaultMoves(col, new Map([["login-token", "different-value"]]))
        expect(plan.creates).toEqual([{ name: "login-token-2", value: "new-secret" }])
        expect(plan.moved).toBe(2)
        const tokens = plan.collection.items.map((i) => (i as CollectionRequest).auth.token)
        expect(tokens).toEqual(["{{vault.login-token-2}}", "{{vault.login-token-2}}"])
    })

    test("covers folder defaultAuth and nested fields; leaves tokens alone", () => {
        const folder: CollectionFolder = {
            id: "f",
            name: "AWS stuff",
            type: "folder",
            items: [
                request({
                    id: "r1",
                    name: "S3",
                    auth: {
                        type: "aws-sigv4",
                        awsSigV4: {
                            accessKeyId: "AKIA1",
                            secretAccessKey: "aws-literal",
                            region: "us-east-1",
                            service: "s3",
                        },
                    },
                }),
                request({ id: "r2", name: "Vaulted", auth: { type: "bearer", token: "{{vault.ok}}" } }),
            ],
            defaultAuth: { type: "basic", username: "bob", password: "hunter2" },
        }
        const col: Collection = { id: "c", name: "c", items: [folder] }
        const plan = planVaultMoves(col, new Map())
        expect(plan.creates.map((c) => c.name).sort()).toEqual(["aws-stuff-password", "s3-secretaccesskey"])
        expect(plan.moved).toBe(2)
        const outFolder = plan.collection.items[0] as CollectionFolder
        expect(outFolder.defaultAuth?.password).toBe("{{vault.aws-stuff-password}}")
        const s3 = outFolder.items[0] as CollectionRequest
        expect(s3.auth.awsSigV4?.secretAccessKey).toBe("{{vault.s3-secretaccesskey}}")
        expect(s3.auth.awsSigV4?.accessKeyId).toBe("AKIA1")
        expect((outFolder.items[1] as CollectionRequest).auth.token).toBe("{{vault.ok}}")
    })
})

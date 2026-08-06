// firestore.tsx imports next-intl's useTranslations and (via its pane)
// @/components/ui/resizable — same mocks as the other adapter tests.
jest.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }))
jest.mock("react-resizable-panels", () => ({
    Panel: () => null,
    PanelGroup: () => null,
    PanelResizeHandle: () => null,
}))

import { firestoreAdapter } from "../adapters/firestore"

const VALID_SA_JSON = JSON.stringify({
    type: "service_account",
    project_id: "my-proj",
    client_email: "svc@my-proj.iam.gserviceaccount.com",
    private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
})

describe("firestore adapter", () => {
    it("starts blank with the default database", () => {
        expect(firestoreAdapter.blankConfig()).toEqual({
            serviceAccountJson: "",
            databaseId: "(default)",
        })
    })

    it("rejects bad configs with the right i18n keys", () => {
        expect(
            firestoreAdapter.validate({ serviceAccountJson: "", databaseId: "(default)" })
        ).toBe("validation.serviceAccountRequired")
        expect(
            firestoreAdapter.validate({ serviceAccountJson: "{bad", databaseId: "(default)" })
        ).toBe("validation.serviceAccountInvalidJson")
        expect(
            firestoreAdapter.validate({
                serviceAccountJson: JSON.stringify({ type: "authorized_user" }),
                databaseId: "(default)",
            })
        ).toBe("validation.serviceAccountNotServiceAccount")
        expect(
            firestoreAdapter.validate({
                serviceAccountJson: VALID_SA_JSON,
                databaseId: "Bad_DB!",
            })
        ).toBe("validation.databaseIdInvalid")
    })

    it("accepts a valid config, with default or named database", () => {
        expect(
            firestoreAdapter.validate({ serviceAccountJson: VALID_SA_JSON, databaseId: "(default)" })
        ).toBeNull()
        expect(
            firestoreAdapter.validate({ serviceAccountJson: VALID_SA_JSON, databaseId: "" })
        ).toBeNull()
        expect(
            firestoreAdapter.validate({ serviceAccountJson: VALID_SA_JSON, databaseId: "my-named-db" })
        ).toBeNull()
    })

    // A misspelled key renders as a broken path to the user — assert every
    // key the adapter can return resolves in en.json.
    it("returns only keys that resolve in messages/en.json", () => {
        const messages = require("../../../../messages/en.json")
        for (const key of [
            "validation.serviceAccountRequired",
            "validation.serviceAccountInvalidJson",
            "validation.serviceAccountNotServiceAccount",
            "validation.serviceAccountBadKey",
            "validation.databaseIdInvalid",
        ]) {
            const resolved = key
                .split(".")
                .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part],
                    messages.DataExplorer)
            expect(typeof resolved).toBe("string")
            expect(resolved).not.toBe("")
        }
    })

    it("identifies itself consistently and satisfies the contract", () => {
        expect(firestoreAdapter.id).toBe("firestore")
        expect(firestoreAdapter.label).toBe("Firestore")
        expect(typeof firestoreAdapter.testConnection).toBe("function")
        expect(firestoreAdapter.ConnectionForm).toBeTruthy()
        expect(firestoreAdapter.SidebarTree).toBeTruthy()
        expect(firestoreAdapter.Pane).toBeTruthy()
    })
})

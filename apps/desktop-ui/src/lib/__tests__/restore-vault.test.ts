import { restoreVault, type RestoreDeps } from "../restore-vault"

const fakeVault = {
    salt: "salt",
    verifier: { encrypted: "enc", iv: "iv" },
} as any

function makeDeps(over: Partial<RestoreDeps> = {}): RestoreDeps {
    return {
        getMasterVaultOrNull: jest.fn().mockResolvedValue(null),
        clearMasterKey: jest.fn().mockResolvedValue(undefined),
        ...over,
    }
}

describe("restoreVault", () => {
    it("returns not-configured when there is no vault on the server", async () => {
        const deps = makeDeps({
            getMasterVaultOrNull: jest.fn().mockResolvedValue(null),
        })
        const result = await restoreVault(deps)
        expect(result).toEqual({ status: "not-configured" })
    })

    it("returns locked and wipes any stale persisted key when a vault exists", async () => {
        const clearMasterKey = jest.fn().mockResolvedValue(undefined)
        const deps = makeDeps({
            getMasterVaultOrNull: jest.fn().mockResolvedValue(fakeVault),
            clearMasterKey,
        })
        const result = await restoreVault(deps)
        // Key is never restored across restarts — always require re-unlock.
        expect(result).toEqual({ status: "locked", vault: fakeVault })
        expect(clearMasterKey).toHaveBeenCalledTimes(1)
    })

    it("returns error when the vault fetch throws", async () => {
        const deps = makeDeps({
            getMasterVaultOrNull: jest.fn().mockRejectedValue(new Error("net down")),
        })
        const result = await restoreVault(deps)
        expect(result).toEqual({ status: "error", message: "net down" })
    })
})

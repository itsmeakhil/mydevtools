import { restoreVault, type RestoreDeps } from "../restore-vault"

const fakeKey = { type: "secret" } as unknown as CryptoKey
const fakeVault = {
    salt: "salt",
    verifier: { encrypted: "enc", iv: "iv" },
} as any

function makeDeps(over: Partial<RestoreDeps> = {}): RestoreDeps {
    return {
        loadMasterKey: jest.fn().mockResolvedValue(null),
        getMasterVaultOrNull: jest.fn().mockResolvedValue(null),
        verifyKey: jest.fn().mockResolvedValue(false),
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

    it("returns unlocked when saved key verifies against the vault", async () => {
        const deps = makeDeps({
            loadMasterKey: jest.fn().mockResolvedValue(fakeKey),
            getMasterVaultOrNull: jest.fn().mockResolvedValue(fakeVault),
            verifyKey: jest.fn().mockResolvedValue(true),
        })
        const result = await restoreVault(deps)
        expect(result).toEqual({
            status: "unlocked",
            vault: fakeVault,
            key: fakeKey,
        })
        expect(deps.clearMasterKey).not.toHaveBeenCalled()
    })

    it("clears the saved key and returns locked when verification fails", async () => {
        const clearMasterKey = jest.fn().mockResolvedValue(undefined)
        const deps = makeDeps({
            loadMasterKey: jest.fn().mockResolvedValue(fakeKey),
            getMasterVaultOrNull: jest.fn().mockResolvedValue(fakeVault),
            verifyKey: jest.fn().mockResolvedValue(false),
            clearMasterKey,
        })
        const result = await restoreVault(deps)
        expect(result).toEqual({ status: "locked", vault: fakeVault })
        expect(clearMasterKey).toHaveBeenCalledTimes(1)
    })

    it("returns locked with the vault cached when no key is stored", async () => {
        const deps = makeDeps({
            loadMasterKey: jest.fn().mockResolvedValue(null),
            getMasterVaultOrNull: jest.fn().mockResolvedValue(fakeVault),
        })
        const result = await restoreVault(deps)
        expect(result).toEqual({ status: "locked", vault: fakeVault })
    })

    it("returns error when the vault fetch throws", async () => {
        const deps = makeDeps({
            getMasterVaultOrNull: jest.fn().mockRejectedValue(new Error("net down")),
        })
        const result = await restoreVault(deps)
        expect(result).toEqual({ status: "error", message: "net down" })
    })
})

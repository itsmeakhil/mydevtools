import { parseCsv, parseCsvEntries, parseImport, NeedsPassphraseError } from "../password-import"

describe("parseCsv", () => {
    it("handles quoted fields, doubled quotes and embedded newlines", () => {
        const rows = parseCsv('name,notes\n"Acme, Inc","He said ""hi""\nsecond line"\n')
        expect(rows).toEqual([
            ["name", "notes"],
            ["Acme, Inc", 'He said "hi"\nsecond line'],
        ])
    })

    it("drops blank lines rather than emitting empty rows", () => {
        expect(parseCsv("a,b\n\n1,2\n")).toEqual([
            ["a", "b"],
            ["1", "2"],
        ])
    })
})

describe("parseCsvEntries", () => {
    it("reads a Bitwarden export", () => {
        const csv = [
            "folder,favorite,type,name,notes,fields,login_uri,login_username,login_password,login_totp",
            "Work,,login,GitHub,note here,,https://github.com,octocat,hunter2,",
        ].join("\n")
        const { entries } = parseCsvEntries(csv)
        expect(entries).toEqual([
            {
                service: "GitHub",
                username: "octocat",
                password: "hunter2",
                url: "https://github.com",
                notes: "note here",
                tags: ["Work"],
            },
        ])
    })

    it("reads a Chrome export", () => {
        const csv = "name,url,username,password\nExample,https://example.com,me@example.com,pw123\n"
        expect(parseCsvEntries(csv).entries[0]).toMatchObject({
            service: "Example",
            username: "me@example.com",
            password: "pw123",
            url: "https://example.com",
        })
    })

    it("reads a 1Password export via its own header names", () => {
        const csv = "Title,Url,Username,Password,Notes\nBank,https://bank.example,alice,s3cret,\n"
        expect(parseCsvEntries(csv).entries[0]).toMatchObject({ service: "Bank", username: "alice" })
    })

    it("counts rows with no password instead of importing them", () => {
        const csv = "name,username,password\nA,a,pw\nB,b,\n"
        const { entries, skipped } = parseCsvEntries(csv)
        expect(entries).toHaveLength(1)
        expect(skipped).toBe(1)
    })

    it("gives up cleanly when the required columns are absent", () => {
        const { entries, skipped } = parseCsvEntries("foo,bar\n1,2\n")
        expect(entries).toHaveLength(0)
        expect(skipped).toBe(1)
    })
})

describe("parseImport", () => {
    const entry = (over: Record<string, unknown> = {}) => ({
        service: "GitHub",
        username: "octocat",
        password: "hunter2",
        ...over,
    })

    it("imports our own JSON export", async () => {
        const parsed = await parseImport(JSON.stringify([entry()]), [])
        expect(parsed.entries).toHaveLength(1)
        expect(parsed.duplicates).toBe(0)
    })

    it("skips entries already in the vault", async () => {
        const parsed = await parseImport(JSON.stringify([entry()]), [entry()])
        expect(parsed.entries).toHaveLength(0)
        expect(parsed.duplicates).toBe(1)
    })

    it("treats a changed password as a different credential", async () => {
        const parsed = await parseImport(
            JSON.stringify([entry({ password: "new" })]),
            [entry()]
        )
        expect(parsed.entries).toHaveLength(1)
    })

    it("dedupes repeats inside one file", async () => {
        const parsed = await parseImport(JSON.stringify([entry(), entry(), entry()]), [])
        expect(parsed.entries).toHaveLength(1)
        expect(parsed.duplicates).toBe(2)
    })

    it("ignores case and surrounding space when matching duplicates", async () => {
        const parsed = await parseImport(
            JSON.stringify([entry({ service: "  github  ", username: "OCTOCAT" })]),
            [entry()]
        )
        expect(parsed.duplicates).toBe(1)
    })

    it("counts rows it cannot use rather than dropping them silently", async () => {
        const parsed = await parseImport(
            JSON.stringify([entry(), { service: "NoPassword" }, { password: "orphan" }, null]),
            []
        )
        expect(parsed.entries).toHaveLength(1)
        expect(parsed.skipped).toBe(3)
    })

    it("asks for a passphrase before touching an encrypted export", async () => {
        const envelope = JSON.stringify({
            format: "mydevtools-password-export",
            version: 1,
            kdf: { name: "PBKDF2-SHA256", salt: "c2FsdA==", iterations: 600000 },
            iv: "aXY=",
            data: "ZGF0YQ==",
        })
        await expect(parseImport(envelope, [])).rejects.toBeInstanceOf(NeedsPassphraseError)
    })

    it("rejects a JSON document that is not a list of entries", async () => {
        await expect(parseImport('{"nope":true}', [])).rejects.toThrow("invalid_format")
    })

    it("returns nothing for empty input", async () => {
        expect(await parseImport("   ", [])).toEqual({ entries: [], skipped: 0, duplicates: 0 })
    })
})

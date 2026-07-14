import { dedupe, clearInflight } from "@/lib/auth-inflight"

describe("dedupe", () => {
    beforeEach(() => clearInflight())

    it("returns the same promise for concurrent callers with the same key", async () => {
        let calls = 0
        const fn = () =>
            new Promise<string>((resolve) =>
                setTimeout(() => {
                    calls += 1
                    resolve("ok")
                }, 20)
            )

        const [a, b, c] = await Promise.all([
            dedupe("k", fn),
            dedupe("k", fn),
            dedupe("k", fn),
        ])

        expect(a).toBe("ok")
        expect(b).toBe("ok")
        expect(c).toBe("ok")
        expect(calls).toBe(1)
    })

    it("runs distinct keys independently", async () => {
        let calls = 0
        const fn = () =>
            new Promise<number>((resolve) => {
                calls += 1
                resolve(calls)
            })

        const [a, b] = await Promise.all([dedupe("x", fn), dedupe("y", fn)])
        expect(a).not.toBe(b)
        expect(calls).toBe(2)
    })

    it("clears the entry after settling (next call re-runs fn)", async () => {
        let calls = 0
        const fn = async () => {
            calls += 1
            return calls
        }

        await dedupe("k", fn)
        await dedupe("k", fn)
        expect(calls).toBe(2)
    })

    it("clears the entry even when the inner fn rejects", async () => {
        let calls = 0
        const fn = async () => {
            calls += 1
            throw new Error("boom")
        }

        await expect(dedupe("k", fn)).rejects.toThrow("boom")
        await expect(dedupe("k", fn)).rejects.toThrow("boom")
        expect(calls).toBe(2)
    })
})

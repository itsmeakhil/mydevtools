import { expect as chai } from "../script-expect"

const fails = (fn: () => unknown, msg?: RegExp) => {
    let err: Error | undefined
    try { fn() } catch (e) { err = e as Error }
    expect(err).toBeDefined()
    if (msg) expect(err!.message).toMatch(msg)
}

describe("chai-style expect", () => {
    it("equal / eql / deep.equal and negation", () => {
        chai(1).to.equal(1)
        chai({ a: [1, { b: 2 }] }).to.eql({ a: [1, { b: 2 }] })
        chai({ a: 1 }).to.deep.equal({ a: 1 })
        chai({ a: 1 }).to.not.equal({ a: 1 })
        fails(() => chai(1).to.equal(2), /expected 1 to equal 2/)
        fails(() => chai({ a: 1 }).to.eql({ a: 2 }), /deeply equal/)
        fails(() => chai(1).to.not.equal(1), /to not equal 1/)
    })

    it("type checks with a/an", () => {
        chai([]).to.be.an("array")
        chai(null).to.be.a("null")
        chai("x").to.be.a("string")
        chai({}).to.be.an("object")
        fails(() => chai([]).to.be.an("object"), /to be an object/)
    })

    it("property assertions", () => {
        chai(1).to.be.ok
        chai(true).to.be.true
        chai(false).to.be.false
        chai(null).to.be.null
        chai(undefined).to.be.undefined
        chai(0).to.exist
        chai([]).to.be.empty
        chai({}).to.be.empty
        chai("a").to.not.be.empty
        fails(() => chai(null).to.exist, /to exist/)
        fails(() => chai([1]).to.be.empty, /to be empty/)
    })

    it("include / contain as method and flag", () => {
        chai("hello world").to.include("world")
        chai([1, 2, 3]).to.contain(2)
        chai({ a: 1, b: 2 }).to.include({ a: 1 })
        chai([{ id: 1 }]).to.deep.include({ id: 1 })
        chai([1, 2, 3]).to.include.members([3, 1])
        chai({ a: 1, b: 2, c: 3 }).to.include.keys("a", "b")
        fails(() => chai([1, 2]).to.include(5), /to include 5/)
    })

    it("property, lengthOf, comparisons, match, oneOf", () => {
        chai({ user: { id: 7 } }).to.have.property("user").that.has.property("id", 7)
        chai([1, 2]).to.have.lengthOf(2)
        chai("abc").to.have.length(3)
        chai(5).to.be.above(4).and.below(6)
        chai(5).to.be.at.least(5).and.at.most(5)
        chai(5).to.be.within(1, 10)
        chai("2026-11-18").to.match(/^\d{4}-/)
        chai("b").to.be.oneOf(["a", "b"])
        fails(() => chai({}).to.have.property("x"), /to have property "x"/)
        fails(() => chai({ x: 1 }).to.have.property("x", 2), /of 2, but got 1/)
        fails(() => chai([1]).to.have.lengthOf(3), /length of 3 but got 1/)
        fails(() => chai(3).to.be.above(4), /to be above 4/)
    })

    it("keys and members exactness", () => {
        chai({ a: 1, b: 2 }).to.have.keys("a", "b")
        chai({ a: 1, b: 2 }).to.have.keys(["b", "a"])
        chai({ a: 1 }).to.have.any.keys("a", "z")
        chai([1, 2]).to.have.members([2, 1])
        fails(() => chai({ a: 1, b: 2 }).to.have.keys("a"), /only keys/)
        fails(() => chai([1, 2, 3]).to.have.members([1, 2]), /same members/)
    })

    it("Postman status and the original jest-style matchers", () => {
        chai({ code: 200, status: "OK" }).to.have.status(200)
        chai({ code: 200, status: "OK" }).to.have.status("OK")
        fails(() => chai({ code: 404 }).to.have.status(200), /status 200 but got 404/)
        chai(2).toBe(2)
        chai({ a: 1 }).toEqual({ a: 1 })
        chai("abc").toMatch(/b/)
        chai([1, 2]).toContain(2)
        chai(3).toBeGreaterThan(2)
        chai({ id: 1 }).toHaveProperty("id")
        chai(1).toBeTruthy()
        chai(0).toBeFalsy()
        chai(1).not.toBe(2)
        fails(() => chai(1).toBe(2), /to be 2/)
    })
})

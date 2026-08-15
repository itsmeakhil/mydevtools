import { insertOrder, needsRespread, ORDER_STEP } from "../statusOrder";

describe("insertOrder", () => {
  it("starts at 0 in an empty column", () => {
    expect(insertOrder([], 0)).toBe(0);
  });

  it("appends a step past the last card", () => {
    expect(insertOrder([0, 1000], 2)).toBe(2000);
  });

  it("prepends a step before the first card", () => {
    expect(insertOrder([0, 1000], 0)).toBe(-ORDER_STEP);
  });

  it("lands between two neighbours", () => {
    expect(insertOrder([0, 1000], 1)).toBe(500);
  });

  it("always returns an integer — Rust reads statusOrder with as_i64", () => {
    // An odd gap must not produce a fraction, or the row is skipped server-side.
    expect(Number.isInteger(insertOrder([0, 1], 1))).toBe(true);
    expect(Number.isInteger(insertOrder([0, 7], 1))).toBe(true);
  });

  it("clamps an out-of-range index instead of returning NaN", () => {
    expect(insertOrder([0, 1000], 99)).toBe(2000);
    expect(insertOrder([0, 1000], -5)).toBe(-ORDER_STEP);
  });

  it("keeps legacy 1/2/3 orders sortable without a migration", () => {
    // Rows written before statusOrder meant "position" are tightly packed.
    const order = insertOrder([1, 2, 3], 3);
    expect(order).toBeGreaterThan(3);
  });
});

describe("needsRespread", () => {
  it("is false when the insert found room", () => {
    expect(needsRespread([0, 1000], 1, 500)).toBe(false);
  });

  it("is true when the gap between neighbours is exhausted", () => {
    // No integer exists strictly between 5 and 6.
    expect(needsRespread([5, 6], 1, insertOrder([5, 6], 1))).toBe(true);
  });

  it("is false at the head of a column, where there is always room", () => {
    expect(needsRespread([0, 1000], 0, -ORDER_STEP)).toBe(false);
  });
});

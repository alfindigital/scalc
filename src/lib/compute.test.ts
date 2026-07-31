import { describe, it, expect } from "vitest";
import { getTickSize, ceilTick, checkLot, computeRows } from "./compute";

describe("getTickSize", () => {
  it("mengikuti band tick IDX", () => {
    expect(getTickSize(50)).toBe(1);
    expect(getTickSize(199)).toBe(1);
    expect(getTickSize(200)).toBe(2);
    expect(getTickSize(499)).toBe(2);
    expect(getTickSize(500)).toBe(5);
    expect(getTickSize(1999)).toBe(5);
    expect(getTickSize(2000)).toBe(10);
    expect(getTickSize(4999)).toBe(10);
    expect(getTickSize(5000)).toBe(25);
    expect(getTickSize(50000)).toBe(25);
  });
});

describe("ceilTick", () => {
  it("naik minimal satu tick di atas harga", () => {
    expect(ceilTick(100, 1)).toBe(101);
    expect(ceilTick(100.4, 1)).toBe(101);
    expect(ceilTick(202, 2)).toBe(204);
    expect(ceilTick(2000, 10)).toBe(2010);
  });
});

describe("checkLot", () => {
  it("true ketika lot besar mendorong avg cukup rendah", () => {
    const profitMul = 1.005;
    expect(checkLot(0, 0, 100, 1_000_000, 1, profitMul)).toBe(true);
  });
  it("false ketika lot terlalu kecil", () => {
    const profitMul = 1.5;
    expect(checkLot(100 * 100, 100, 100, 1, 1, profitMul)).toBe(false);
  });
});

describe("computeRows entry mode", () => {
  it("kembali kosong saat bid invalid", () => {
    expect(computeRows([], 100, 1, 0.5, 0.0015, 0.0025).results).toEqual([]);
    expect(computeRows([0], 100, 1, 0.5, 0.0015, 0.0025).results).toEqual([]);
  });

  it("layer 1 pakai baseLot persis", () => {
    const { results } = computeRows([100], 50, 1, 0.5, 0.0015, 0.0025);
    expect(results).toHaveLength(1);
    expect(results[0].layer).toBe(1);
    expect(results[0].lot).toBe(50);
    expect(results[0].bid).toBe(100);
  });

  it("custom lot override binary search", () => {
    const { results } = computeRows([100, 95], 50, 1, 0.5, 0.0015, 0.0025, null, [50, 77]);
    expect(results[1].lot).toBe(77);
  });

  it("layer berikut menemukan lot yang lulus checkLot", () => {
    const { results } = computeRows([200, 190], 100, 1, 0.5, 0.0015, 0.0025);
    expect(results).toHaveLength(2);
    expect(results[1].lot).toBeGreaterThanOrEqual(100);
    // avg layer 2 harus < bid awal (averaging down)
    expect(results[1].avg).toBeLessThan(200 * 1.01);
  });
});

describe("computeRows position mode", () => {
  it("baris pertama = posisi existing dengan layer 'E'", () => {
    const { results } = computeRows([180], 100, 1, 0.5, 0.0015, 0.0025, { avg: 200, lot: 100 });
    expect(results[0].layer).toBe("E");
    expect(results[0].isExisting).toBe(true);
    expect(results[0].lot).toBe(100);
    expect(results[1].layer).toBe(1);
  });
});

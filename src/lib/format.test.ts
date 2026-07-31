import { describe, it, expect } from "vitest";
import { n, nDec, nShort, terbilang, fmtPct, fmtTime } from "./format";

describe("n / nDec", () => {
  it("format ribuan id-ID", () => {
    expect(n(1234567)).toBe("1.234.567");
    expect(nDec(1234.5)).toBe("1.234,50");
  });
});

describe("nShort", () => {
  it("ringkas nilai besar", () => {
    expect(nShort(500)).toBe("500");
    expect(nShort(1500)).toBe("2rb");
    expect(nShort(2_500_000)).toBe("2.5jt");
    expect(nShort(3_000_000_000)).toBe("3mlr");
    expect(nShort(1_200_000_000_000)).toBe("1.2T");
  });
});

describe("terbilang", () => {
  it("string kosong untuk nilai non-positif", () => {
    expect(terbilang(0)).toBe("");
    expect(terbilang(-100)).toBe("");
  });
  it("ribuan / jutaan / miliar / triliun", () => {
    expect(terbilang(500)).toBe("500");
    expect(terbilang(15_000)).toBe("15 ribu");
    expect(terbilang(2_500_000)).toBe("2 juta 500 ribu");
    expect(terbilang(1_200_000_000)).toBe("1 miliar 200 juta");
    expect(terbilang(3_000_000_000_000)).toBe("3 triliun");
  });
});

describe("fmtPct / fmtTime", () => {
  it("persentase 2 desimal", () => {
    expect(fmtPct(1.234)).toBe("1.23%");
  });
  it("baru saja untuk < 1 menit", () => {
    expect(fmtTime(Date.now() - 5_000)).toBe("baru saja");
  });
  it("menit lalu", () => {
    expect(fmtTime(Date.now() - 5 * 60_000)).toBe("5m lalu");
  });
});

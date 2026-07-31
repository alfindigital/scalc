// Pure validation helpers untuk PYSCAL inputs.
// Setiap field punya hard error (block) dan/atau soft warning (boleh tetap submit).

export interface FieldStatus {
  error?: string;
  warning?: string;
}

const ok: FieldStatus = {};

/** Bid awal & bid layer berikutnya: harga IDX umum 1–50.000, integer > 0. */
export function validateBid(value: number): FieldStatus {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return { error: "Bid wajib diisi angka" };
  }
  if (!Number.isFinite(value)) return { error: "Bid harus berupa angka" };
  if (value <= 0) return { error: "Harga bid harus > 0" };
  if (!Number.isInteger(value)) return { error: "Bid harus bilangan bulat (tanpa koma/desimal)" };
  if (value > 50000) return { error: "Harga di atas 50.000 di luar range IDX" };
  if (value < 50) return { warning: "Harga di bawah 50 jarang ada di IDX" };
  return ok;
}

/** Lot dasar: integer ≥ 1. Non-integer = format error (lot di IDX selalu bulat). */
export function validateLot(value: number): FieldStatus {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return { error: "Lot wajib diisi angka" };
  }
  if (!Number.isFinite(value)) return { error: "Lot harus berupa angka" };
  if (value < 1) return { error: "Lot minimal 1" };
  if (!Number.isInteger(value))
    return { error: "Lot harus bilangan bulat (satuan lot, tanpa desimal)" };
  if (value > 1_000_000) return { warning: "Lot > 1.000.000 tidak realistis untuk retail" };
  return ok;
}

export function validateTargetTicks(value: number): FieldStatus {
  if (!Number.isFinite(value) || value < 1) return { error: "Target tick minimal 1" };
  if (value > 20) return { error: "Target tick maksimal 20" };
  if (value > 10) return { warning: "Target tick > 10 sangat agresif" };
  return ok;
}

export function validateTargetProfit(value: number): FieldStatus {
  if (!Number.isFinite(value) || value < 0) return { error: "Min profit tidak boleh negatif" };
  if (value > 50) return { error: "Min profit > 50% tidak realistis" };
  if (value > 5) return { warning: "Min profit > 5% per pyramid, double-check" };
  return ok;
}

export function validateFee(value: number, side: "buy" | "sell"): FieldStatus {
  if (!Number.isFinite(value) || value < 0) return { error: "Fee tidak boleh negatif" };
  if (value > 1) return { error: "Fee > 1% terlalu tinggi" };
  if (value > 0.5) return { warning: `Fee ${side} tinggi, cek broker` };
  return ok;
}

export function validateBalance(value: number): FieldStatus {
  if (!Number.isFinite(value) || value < 0) return { error: "Balance tidak boleh negatif" };
  return ok;
}

export function validateExistingAvg(value: number, mode: "entry" | "position"): FieldStatus {
  if (mode !== "position") return ok;
  if (!Number.isFinite(value) || value <= 0)
    return { error: "Avg existing wajib > 0 di mode Existing" };
  if (value < 50 || value > 50000) return { warning: "Avg di luar range IDX umum (50–50.000)" };
  return ok;
}

export function validateExistingLot(value: number, mode: "entry" | "position"): FieldStatus {
  if (mode !== "position") return ok;
  if (!Number.isFinite(value) || value < 1)
    return { error: "Lot existing wajib ≥ 1 di mode Existing" };
  return ok;
}

/** True kalau ada error apapun di koleksi status. */
export function hasError(...statuses: FieldStatus[]): boolean {
  return statuses.some((s) => !!s.error);
}

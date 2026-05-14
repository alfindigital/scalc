// PYSCAL compute logic — pure functions, behavior 1:1 dengan versi awal di Pyscal.tsx.
// Tidak boleh import React / DOM apa pun. Aman dipanggil dari Vitest / SSR.

export const getTickSize = (p: number): number =>
  p < 200 ? 1 : p < 500 ? 2 : p < 2000 ? 5 : p < 5000 ? 10 : 25;

export const ceilTick = (price: number, tick: number): number => {
  const r = Math.ceil(price / tick) * tick;
  return r <= price ? r + tick : r;
};

/**
 * Apakah penambahan `lot` di harga `bp` (dengan posisi berjalan aV/aL)
 * masih memenuhi target profit. Tick dihitung dari avg hasil (aturan IDX).
 */
export function checkLot(
  aV: number,
  aL: number,
  bp: number,
  lot: number,
  targetTicks: number,
  profitMul: number,
): boolean {
  const nV = aV + bp * lot;
  const nL = aL + lot;
  const avg = nV / nL;
  const tick = getTickSize(avg);
  const sell = ceilTick(avg, tick) + (targetTicks - 1) * tick;
  return sell >= avg * profitMul;
}

export interface ExistingPosition {
  avg: number;
  lot: number;
}

export interface ComputeRow {
  layer: number | "E";
  isExisting?: boolean;
  bid: number;
  lot: number;
  avg: number;
  sell: number;
  cost: number;
  pl: number;
  pct: number;
}

export interface ComputeResult {
  results: ComputeRow[];
}

export function computeRows(
  bidPrices: number[],
  baseLot: number,
  targetTicks: number,
  targetProfitPct: number,
  feeBuy: number,
  feeSell: number,
  existing: ExistingPosition | null = null,
  customLots: Array<number | null | undefined> | null = null,
): ComputeResult {
  if (!bidPrices.length || bidPrices[0] <= 0) return { results: [] };
  const profitMul = ((1 + feeBuy) / (1 - feeSell)) * (1 + targetProfitPct / 100);
  const results: ComputeRow[] = [];

  let aV = 0;
  let aL = 0;
  let prevLot = baseLot;

  if (existing && existing.lot > 0 && existing.avg > 0) {
    const avgRaw = existing.avg / (1 + feeBuy);
    aV = avgRaw * existing.lot;
    aL = existing.lot;
    prevLot = existing.lot;

    const tickE = getTickSize(avgRaw);
    const sell = ceilTick(avgRaw, tickE) + (targetTicks - 1) * tickE;
    const cost = aV * 100 * (1 + feeBuy);
    const rev = sell * aL * 100 * (1 - feeSell);
    const pl = rev - cost;
    results.push({
      layer: "E",
      isExisting: true,
      bid: existing.avg,
      lot: existing.lot,
      avg: existing.avg,
      sell,
      cost,
      pl,
      pct: (pl / cost) * 100,
    });
  }

  for (let i = 0; i < bidPrices.length; i++) {
    const bp = bidPrices[i];
    if (bp <= 0) break;

    let layerLot: number;
    if (
      customLots &&
      customLots[i] !== undefined &&
      customLots[i] !== null &&
      (customLots[i] as number) > 0
    ) {
      layerLot = customLots[i] as number;
    } else if (i === 0 && !existing) {
      layerLot = baseLot;
    } else if (i === 0 && existing) {
      const minLot = baseLot;
      const maxLot = Math.max(baseLot * 100000, prevLot * 10000);
      let found = -1;
      let lo = minLot;
      let hi = maxLot;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (checkLot(aV, aL, bp, mid, targetTicks, profitMul)) {
          found = mid;
          hi = mid - 1;
        } else {
          lo = mid + 1;
        }
      }
      layerLot = found !== -1 ? found : baseLot;
    } else {
      const minLot = prevLot;
      const maxLot = Math.max(baseLot * 100000, prevLot * 10000);
      let found = -1;
      let lo = minLot;
      let hi = maxLot;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (checkLot(aV, aL, bp, mid, targetTicks, profitMul)) {
          found = mid;
          hi = mid - 1;
        } else {
          lo = mid + 1;
        }
      }
      layerLot = found !== -1 ? found : prevLot;
    }

    aV += bp * layerLot;
    aL += layerLot;
    const avg = aV / aL;
    const tick = getTickSize(avg);
    const sell = ceilTick(avg, tick) + (targetTicks - 1) * tick;
    const costLayer = bp * layerLot * 100 * (1 + feeBuy);
    const costAccum = aV * 100 * (1 + feeBuy);
    const rev = sell * aL * 100 * (1 - feeSell);
    const pl = rev - costAccum;

    results.push({
      layer: i + 1,
      bid: bp,
      lot: layerLot,
      avg: avg * (1 + feeBuy),
      sell,
      cost: costLayer,
      pl,
      pct: (pl / costAccum) * 100,
    });
    prevLot = layerLot;
  }
  return { results };
}
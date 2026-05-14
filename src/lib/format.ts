// Format helpers — pure, locale id-ID. Behavior 1:1 dengan versi awal.

export const n = (v: number): string => Math.round(v).toLocaleString("id-ID");

export const nDec = (v: number): string =>
  v.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const nShort = (v: number): string => {
  const abs = Math.abs(v);
  if (abs >= 1e12) return (v / 1e12).toFixed(1).replace(/\.0$/, "") + "T";
  if (abs >= 1e9) return (v / 1e9).toFixed(1).replace(/\.0$/, "") + "mlr";
  if (abs >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, "") + "jt";
  if (abs >= 1e3) return (v / 1e3).toFixed(0) + "rb";
  return Math.round(v).toString();
};

export const terbilang = (v: number): string => {
  if (!v || v <= 0) return "";
  const trillions = Math.floor(v / 1e12);
  const billions = Math.floor((v % 1e12) / 1e9);
  const millions = Math.floor((v % 1e9) / 1e6);
  const thousands = Math.floor((v % 1e6) / 1e3);
  const ones = Math.floor(v % 1e3);
  const parts: string[] = [];
  if (trillions > 0) parts.push(`${trillions} triliun`);
  if (billions > 0) parts.push(`${billions} miliar`);
  if (millions > 0) parts.push(`${millions} juta`);
  if (thousands > 0) parts.push(`${thousands} ribu`);
  if (ones > 0 && trillions === 0 && billions === 0 && millions === 0)
    parts.push(ones.toString());
  return parts.join(" ");
};

export const fmtPct = (v: number): string => v.toFixed(2) + "%";
export const fmtPL = (v: number): string => nDec(v);

export const fmtTime = (ts: number): string => {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60000) return "baru saja";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m lalu";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "j lalu";
  if (diff < 604800000) return Math.floor(diff / 86400000) + "h lalu";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};
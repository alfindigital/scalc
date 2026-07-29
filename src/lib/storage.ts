// Storage + shortcut helpers — SSR-safe (semua window access dipagari).
// Behavior 1:1 dengan versi awal di Pyscal.tsx.

export interface Shortcut {
  key: string;
  mod?: boolean;
  shift?: boolean;
  alt?: boolean;
  label: string;
}

export type ShortcutMap = Record<string, Shortcut>;

export const DEFAULT_SHORTCUTS: ShortcutMap = {
  addPapan: { key: "n", mod: true, label: "Tambah Papan" },
  copyResults: { key: "c", mod: true, shift: true, label: "Copy Hasil" },
  resetPapan: { key: "r", mod: true, shift: true, label: "Reset Papan" },
  toggleSettings: { key: ",", mod: true, label: "Buka/Tutup Settings" },
  saveTrade: { key: "s", mod: true, shift: true, label: "Simpan ke History" },
  showHistory: { key: "h", mod: true, shift: true, label: "Buka History" },
  focusBidAwal: { key: "k", mod: true, label: "Focus Bid Awal" },
  undo: { key: "z", mod: true, label: "Undo" },
  redo: { key: "z", mod: true, shift: true, label: "Redo" },
};

export function shortcutToString(s: Shortcut | null | undefined): string {
  if (!s) return "";
  const parts: string[] = [];
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad|iPod/.test((navigator.platform || navigator.userAgent || "") as string);
  if (s.mod) parts.push(isMac ? "⌘" : "Ctrl");
  if (s.shift) parts.push("Shift");
  if (s.alt) parts.push("Alt");
  parts.push(s.key.toUpperCase());
  return parts.join(" + ");
}

export interface KeyEventLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export function eventMatchesShortcut(e: KeyEventLike, s: Shortcut | null | undefined): boolean {
  if (!s) return false;
  const modOK = s.mod ? e.ctrlKey || e.metaKey : !(e.ctrlKey || e.metaKey);
  const shiftOK = !!s.shift === e.shiftKey;
  const altOK = !!s.alt === e.altKey;
  const keyOK = e.key.toLowerCase() === s.key.toLowerCase();
  return modOK && shiftOK && altOK && keyOK;
}

export interface PyscalState {
  baseLot: number;
  targetTicks: number;
  targetProfit: number;
  feeBuy: number;
  feeSell: number;
  bids: number[];
  balance: number;
  mode: "entry" | "position";
  existingAvg: number;
  existingLot: number;
  customLot: boolean;
  customLots: Array<number | null | undefined>;
}

export const DEFAULT_STATE: PyscalState = {
  baseLot: 100,
  targetTicks: 1,
  targetProfit: 0.5,
  feeBuy: 0.15,
  feeSell: 0.25,
  bids: [100],
  balance: 0,
  mode: "entry",
  existingAvg: 0,
  existingLot: 0,
  customLot: false,
  customLots: [],
};

const LEGACY_KEY_MAP: Record<string, string> = {
  scalc_state: "pyscal_state",
  scalc_presets: "pyscal_presets",
  scalc_history: "pyscal_history",
  scalc_shortcuts: "pyscal_shortcuts",
  scalc_theme: "pyscal_theme",
};

export function migrateLegacyKeys(): void {
  if (typeof window === "undefined") return;
  try {
    for (const [oldK, newK] of Object.entries(LEGACY_KEY_MAP)) {
      const oldV = localStorage.getItem(oldK);
      if (oldV != null && localStorage.getItem(newK) == null) {
        localStorage.setItem(newK, oldV);
      }
      if (oldV != null) localStorage.removeItem(oldK);
    }
  } catch {
    /* noop */
  }
}

export function loadState(): PyscalState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    migrateLegacyKeys();
    const s = JSON.parse(localStorage.getItem("pyscal_state") || "null");
    if (!s) return DEFAULT_STATE;
    const data = unwrap(s);
    if (!data || typeof data !== "object") return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...(data as Partial<PyscalState>) };
  } catch {
    return DEFAULT_STATE;
  }
}

export function loadShortcuts(): ShortcutMap {
  if (typeof window === "undefined") return DEFAULT_SHORTCUTS;
  try {
    const s = JSON.parse(localStorage.getItem("pyscal_shortcuts") || "null");
    if (!s) return DEFAULT_SHORTCUTS;
    const data = unwrap(s);
    if (!data || typeof data !== "object") return DEFAULT_SHORTCUTS;
    return { ...DEFAULT_SHORTCUTS, ...(data as ShortcutMap) };
  } catch {
    return DEFAULT_SHORTCUTS;
  }
}

/* ==================== SCHEMA VERSIONING ==================== */

// Bump versi tiap kali shape data berubah breaking. Migrasi ditambahkan di
// bawah; loader otomatis menjalankan migrasi v(N) → v(N+1) berurutan.
export const SCHEMA_VERSION = {
  state: 2,
  shortcuts: 2,
  presets: 2,
  history: 2,
} as const;

interface Wrapped<T> {
  version: number;
  data: T;
}

function isWrapped(x: unknown): x is Wrapped<unknown> {
  return (
    !!x &&
    typeof x === "object" &&
    "version" in (x as object) &&
    "data" in (x as object) &&
    typeof (x as { version: unknown }).version === "number"
  );
}

// Unwrap: jika sudah ber-versi, ambil .data; kalau raw legacy (v1), kembalikan apa adanya.
function unwrap<T = unknown>(raw: unknown): T | null {
  if (raw == null) return null;
  if (isWrapped(raw)) return raw.data as T;
  return raw as T;
}

function wrap<T>(version: number, data: T): Wrapped<T> {
  return { version, data };
}

// ================================================================
// Debounced + atomic writer.
// - Debounce: banyak `save*` beruntun di-coalesce jadi satu write per key.
// - Atomic: tulis dulu ke `<key>__next` lalu commit ke `<key>` lalu hapus tmp;
//   loader mem-fallback ke `__next` bila primary corrupt/hilang.
// - Flush otomatis pada visibilitychange=hidden / pagehide / beforeunload
//   supaya tidak ada data yang tertinggal saat tab ditutup.
// ================================================================

const WRITE_DEBOUNCE_MS = 120;
const pendingWrites = new Map<
  string,
  { value: unknown; timer: ReturnType<typeof setTimeout> | null }
>();
let flushHooksInstalled = false;

function installFlushHooks(): void {
  if (flushHooksInstalled || typeof window === "undefined") return;
  flushHooksInstalled = true;
  const flush = () => flushPendingWrites();
  try {
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") flush();
      });
    }
  } catch {
    /* noop */
  }
}

function commitWrite(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  const tmpKey = `${key}__next`;
  try {
    const payload = JSON.stringify(value);
    // Two-phase: tulis tmp dulu → commit primary → bersihkan tmp.
    // Jika crash di antara langkah 2 & 3, primary sudah valid.
    // Jika crash di antara 1 & 2, loader akan fallback ke __next.
    localStorage.setItem(tmpKey, payload);
    localStorage.setItem(key, payload);
    try {
      localStorage.removeItem(tmpKey);
    } catch {
      /* noop */
    }
  } catch (err) {
    try {
      const name = (err as { name?: string })?.name || "";
      const isQuota =
        name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED";
      window.dispatchEvent(
        new CustomEvent("pyscal:storage-error", {
          detail: { key, kind: isQuota ? "quota" : "unavailable" },
        }),
      );
    } catch {
      /* noop */
    }
  }
}

function flushKey(key: string): void {
  const entry = pendingWrites.get(key);
  if (!entry) return;
  if (entry.timer) clearTimeout(entry.timer);
  pendingWrites.delete(key);
  commitWrite(key, entry.value);
}

export function flushPendingWrites(): void {
  for (const key of Array.from(pendingWrites.keys())) flushKey(key);
}

function safeWrite(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  installFlushHooks();
  const existing = pendingWrites.get(key);
  if (existing?.timer) clearTimeout(existing.timer);
  const timer = setTimeout(() => flushKey(key), WRITE_DEBOUNCE_MS);
  pendingWrites.set(key, { value, timer });
}

/** Tulis sinkron tanpa debounce — dipakai loader saat rewrap/migrasi silent. */
function safeWriteImmediate(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  // Drop pending yang sudah stale untuk key ini.
  const existing = pendingWrites.get(key);
  if (existing?.timer) clearTimeout(existing.timer);
  pendingWrites.delete(key);
  commitWrite(key, value);
}

function safeReadJSON(key: string): unknown {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    /* jatuh ke fallback __next */
  }
  // Atomic-write fallback: primary hilang/corrupt → coba tmp yang belum sempat commit.
  try {
    const tmp = localStorage.getItem(`${key}__next`);
    if (!tmp) return null;
    const parsed = JSON.parse(tmp);
    // Promote tmp jadi primary supaya kondisi stabil untuk load berikutnya.
    try {
      localStorage.setItem(key, tmp);
      localStorage.removeItem(`${key}__next`);
    } catch {
      /* noop */
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Generic versioned loader.
 * - Bila storage berisi `{ version, data }`, jalankan rantai migrasi sampai versi terbaru.
 * - Bila storage berisi raw object/array (legacy v1), perlakukan sebagai v1 lalu migrasi ke target.
 * - Bila tidak ada / corrupt, kembalikan defaultValue tanpa menulis apa-apa (write terjadi di save).
 * - Setelah migrasi sukses, tulis-ulang dalam bentuk wrapped supaya next load lebih cepat.
 */
export function loadVersioned<T>(
  key: string,
  targetVersion: number,
  defaultValue: T,
  migrate: (data: unknown, fromVersion: number) => T,
): T {
  const raw = safeReadJSON(key);
  if (raw == null) return defaultValue;
  try {
    const fromVersion = isWrapped(raw) ? raw.version : 1;
    const data = unwrap<unknown>(raw);
    if (data == null) return defaultValue;
    const migrated = fromVersion === targetVersion ? (data as T) : migrate(data, fromVersion);
    if (fromVersion !== targetVersion) {
      safeWriteImmediate(key, wrap(targetVersion, migrated));
    } else if (!isWrapped(raw)) {
      // sama versi tapi belum ter-wrap — wrap diam-diam.
      safeWriteImmediate(key, wrap(targetVersion, migrated));
    }
    return migrated;
  } catch {
    return defaultValue;
  }
}

export function saveVersioned<T>(key: string, version: number, data: T): void {
  safeWrite(key, wrap(version, data));
}

/* --- Migrators per resource --- */

function migrateState(data: unknown, _from: number): PyscalState {
  // v1 (raw) → v2 (wrapped) — shape sama, cukup merge ke default agar field baru terisi.
  if (!data || typeof data !== "object") return DEFAULT_STATE;
  return { ...DEFAULT_STATE, ...(data as Partial<PyscalState>) };
}

function migrateShortcuts(data: unknown, _from: number): ShortcutMap {
  if (!data || typeof data !== "object") return DEFAULT_SHORTCUTS;
  return { ...DEFAULT_SHORTCUTS, ...(data as ShortcutMap) };
}

function migratePresets(data: unknown, _from: number): unknown[] {
  return Array.isArray(data) ? data : [];
}

function migrateHistory(data: unknown, _from: number): unknown[] {
  if (!Array.isArray(data)) return [];
  // v1 → v2: pastikan setiap entry punya `pinned` & `note` opsional ter-normalisasi,
  // dan drop entry yang bentuknya tidak bisa diselamatkan.
  const repaired: unknown[] = [];
  let dropped = 0;
  for (const t of data) {
    const r = repairTrade(t);
    if (r) repaired.push(r);
    else dropped++;
  }
  if (dropped > 0 && typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent("pyscal:storage-repaired", {
          detail: { key: "pyscal_history", dropped, kept: repaired.length },
        }),
      );
    } catch {
      /* noop */
    }
  }
  return repaired;
}

/**
 * Validasi + auto-repair satu entry history.
 * - Field wajib (id, timestamp, bids[], planned{avgFinal,totalLot,totalCost,sellFinal,plFinal})
 *   harus ada & bertipe benar; kalau tidak, entry di-drop (return null).
 * - Field opsional (pinned, note, mode, existing*, targetTicks, targetProfit) diisi default aman.
 */
function repairTrade(t: unknown): Record<string, unknown> | null {
  if (!t || typeof t !== "object") return null;
  const obj = t as Record<string, unknown>;

  const id = typeof obj.id === "string" && obj.id ? obj.id : null;
  const timestamp = typeof obj.timestamp === "number" && isFinite(obj.timestamp) ? obj.timestamp : null;
  const bids = Array.isArray(obj.bids)
    ? obj.bids.filter((b) => typeof b === "number" && isFinite(b))
    : [];
  const planned = obj.planned && typeof obj.planned === "object" ? (obj.planned as Record<string, unknown>) : null;

  if (!id || timestamp == null || !planned) return null;

  const numOr = (v: unknown, d: number) => (typeof v === "number" && isFinite(v) ? v : d);
  const safePlanned = {
    totalLot: numOr(planned.totalLot, 0),
    totalCost: numOr(planned.totalCost, 0),
    avgFinal: numOr(planned.avgFinal, 0),
    sellFinal: numOr(planned.sellFinal, 0),
    plFinal: numOr(planned.plFinal, 0),
    ...planned,
  };

  return {
    ...obj,
    id,
    timestamp,
    bids,
    planned: safePlanned,
    mode: obj.mode === "position" ? "position" : "entry",
    existingAvg: numOr(obj.existingAvg, 0),
    existingLot: numOr(obj.existingLot, 0),
    targetTicks: numOr(obj.targetTicks, 1),
    targetProfit: numOr(obj.targetProfit, 0),
    pinned: typeof obj.pinned === "boolean" ? obj.pinned : false,
    note: typeof obj.note === "string" ? obj.note : "",
  };
}

/* --- Resource-spesifik load/save (dipakai komponen) --- */

export function loadStateVersioned(): PyscalState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  migrateLegacyKeys();
  return loadVersioned("pyscal_state", SCHEMA_VERSION.state, DEFAULT_STATE, migrateState);
}

export function saveState(state: PyscalState): void {
  saveVersioned("pyscal_state", SCHEMA_VERSION.state, state);
}

export function loadShortcutsVersioned(): ShortcutMap {
  if (typeof window === "undefined") return DEFAULT_SHORTCUTS;
  return loadVersioned(
    "pyscal_shortcuts",
    SCHEMA_VERSION.shortcuts,
    DEFAULT_SHORTCUTS,
    migrateShortcuts,
  );
}

export function saveShortcuts(shortcuts: ShortcutMap): void {
  saveVersioned("pyscal_shortcuts", SCHEMA_VERSION.shortcuts, shortcuts);
}

export function loadPresets<T = unknown>(): T[] {
  if (typeof window === "undefined") return [];
  return loadVersioned("pyscal_presets", SCHEMA_VERSION.presets, [], migratePresets) as T[];
}

export function savePresets<T = unknown>(presets: T[]): void {
  saveVersioned("pyscal_presets", SCHEMA_VERSION.presets, presets);
}

export function loadHistory<T = unknown>(): T[] {
  if (typeof window === "undefined") return [];
  const loaded = loadVersioned("pyscal_history", SCHEMA_VERSION.history, [], migrateHistory) as unknown[];
  // Selalu validasi ulang meski versi sudah terbaru — data bisa rusak akibat edit manual,
  // sync antar-tab, atau bug lama. Auto-repair + rewrite kalau ada yang di-drop/diubah.
  const repaired: unknown[] = [];
  let dropped = 0;
  for (const t of loaded) {
    const r = repairTrade(t);
    if (r) repaired.push(r);
    else dropped++;
  }
  const changed = dropped > 0 || repaired.some((r, i) => r !== loaded[i]);
  if (changed) {
    // Repair harus segera persist — jangan sampai window hilang sebelum debounce fire.
    safeWriteImmediate("pyscal_history", wrap(SCHEMA_VERSION.history, repaired));
    if (dropped > 0) {
      try {
        window.dispatchEvent(
          new CustomEvent("pyscal:storage-repaired", {
            detail: { key: "pyscal_history", dropped, kept: repaired.length },
          }),
        );
      } catch {
        /* noop */
      }
    }
  }
  return repaired as T[];
}

export function saveHistory<T = unknown>(history: T[]): void {
  saveVersioned("pyscal_history", SCHEMA_VERSION.history, history);
}
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
    return { ...DEFAULT_STATE, ...s };
  } catch {
    return DEFAULT_STATE;
  }
}

export function loadShortcuts(): ShortcutMap {
  if (typeof window === "undefined") return DEFAULT_SHORTCUTS;
  try {
    const s = JSON.parse(localStorage.getItem("pyscal_shortcuts") || "null");
    if (!s) return DEFAULT_SHORTCUTS;
    return { ...DEFAULT_SHORTCUTS, ...s };
  } catch {
    return DEFAULT_SHORTCUTS;
  }
}
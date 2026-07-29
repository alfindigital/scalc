import { describe, it, expect, beforeEach } from "vitest";
import {
  DEFAULT_STATE,
  DEFAULT_SHORTCUTS,
  loadState,
  loadShortcuts,
  migrateLegacyKeys,
  shortcutToString,
  eventMatchesShortcut,
  loadStateVersioned,
  saveState,
  loadHistory,
  saveHistory,
  loadShortcutsVersioned,
  SCHEMA_VERSION,
} from "./storage";
import { loadPresets, savePresets, saveShortcuts } from "./storage";

// Minimal localStorage shim untuk env "node".
class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? (this.m.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
}

beforeEach(() => {
  (globalThis as unknown as { window: object }).window = globalThis;
  (globalThis as unknown as { localStorage: MemStorage }).localStorage = new MemStorage();
});

describe("loadState", () => {
  it("default ketika storage kosong", () => {
    expect(loadState()).toEqual(DEFAULT_STATE);
  });
  it("merge partial state ke default", () => {
    localStorage.setItem("pyscal_state", JSON.stringify({ baseLot: 200 }));
    const s = loadState();
    expect(s.baseLot).toBe(200);
    expect(s.targetTicks).toBe(DEFAULT_STATE.targetTicks);
  });
  it("default ketika JSON corrupt", () => {
    localStorage.setItem("pyscal_state", "{not json");
    expect(loadState()).toEqual(DEFAULT_STATE);
  });
});

describe("loadShortcuts", () => {
  it("default lengkap saat kosong", () => {
    expect(loadShortcuts()).toEqual(DEFAULT_SHORTCUTS);
  });
});

describe("migrateLegacyKeys", () => {
  it("memindahkan scalc_* ke pyscal_* dan menghapus aslinya", () => {
    localStorage.setItem("scalc_state", '{"baseLot":300}');
    localStorage.setItem("scalc_theme", "dark");
    migrateLegacyKeys();
    expect(localStorage.getItem("pyscal_state")).toBe('{"baseLot":300}');
    expect(localStorage.getItem("pyscal_theme")).toBe("dark");
    expect(localStorage.getItem("scalc_state")).toBeNull();
    expect(localStorage.getItem("scalc_theme")).toBeNull();
  });
  it("tidak menimpa pyscal_* yang sudah ada", () => {
    localStorage.setItem("pyscal_state", '{"keep":1}');
    localStorage.setItem("scalc_state", '{"keep":2}');
    migrateLegacyKeys();
    expect(localStorage.getItem("pyscal_state")).toBe('{"keep":1}');
    expect(localStorage.getItem("scalc_state")).toBeNull();
  });
});

describe("shortcut helpers", () => {
  it("shortcutToString render Ctrl+Shift+S", () => {
    const s = shortcutToString({ key: "s", mod: true, shift: true, label: "" });
    // navigator mungkin Mac di env tertentu — terima salah satu
    expect(s === "Ctrl + Shift + S" || s === "⌘ + Shift + S").toBe(true);
  });
  it("eventMatchesShortcut cocokkan modifier", () => {
    const sc = { key: "n", mod: true, label: "" };
    expect(
      eventMatchesShortcut(
        { key: "n", ctrlKey: true, metaKey: false, shiftKey: false, altKey: false },
        sc,
      ),
    ).toBe(true);
    expect(
      eventMatchesShortcut(
        { key: "n", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false },
        sc,
      ),
    ).toBe(false);
    expect(
      eventMatchesShortcut(
        { key: "n", ctrlKey: true, metaKey: false, shiftKey: true, altKey: false },
        sc,
      ),
    ).toBe(false);
  });
});

describe("schema versioning", () => {
  it("loadStateVersioned baca legacy raw (v1) lalu re-wrap ke v2 di storage", () => {
    localStorage.setItem("pyscal_state", JSON.stringify({ baseLot: 250, bids: [123] }));
    const s = loadStateVersioned();
    expect(s.baseLot).toBe(250);
    expect(s.bids).toEqual([123]);
    // setelah load, storage harus sudah dalam format wrapped
    const reread = JSON.parse(localStorage.getItem("pyscal_state") as string);
    expect(reread.version).toBe(SCHEMA_VERSION.state);
    expect(reread.data.baseLot).toBe(250);
  });

  it("saveState menulis dalam format { version, data }", () => {
    saveState({ ...DEFAULT_STATE, balance: 5_000_000 });
    const raw = JSON.parse(localStorage.getItem("pyscal_state") as string);
    expect(raw.version).toBe(SCHEMA_VERSION.state);
    expect(raw.data.balance).toBe(5_000_000);
  });

  it("loadStateVersioned mengembalikan default ketika storage corrupt", () => {
    localStorage.setItem("pyscal_state", "{not json");
    expect(loadStateVersioned()).toEqual(DEFAULT_STATE);
  });

  it("loadHistory legacy v1 (array raw) → v2 menambah field pinned & note default", () => {
    localStorage.setItem(
      "pyscal_history",
      JSON.stringify([{ id: "tr_1", timestamp: 1, planned: { avgFinal: 100 } }]),
    );
    const h = loadHistory<{ id: string; pinned: boolean; note: string }>();
    expect(h).toHaveLength(1);
    expect(h[0].pinned).toBe(false);
    expect(h[0].note).toBe("");
    // dan ter-rewrap
    const raw = JSON.parse(localStorage.getItem("pyscal_history") as string);
    expect(raw.version).toBe(SCHEMA_VERSION.history);
  });

  it("loadHistory mempertahankan pinned/note yang sudah ada di v2", () => {
    saveHistory([{ id: "tr_2", timestamp: 2, planned: { avgFinal: 200 }, pinned: true, note: "BBRI" }]);
    const h = loadHistory<{ pinned: boolean; note: string }>();
    expect(h[0].pinned).toBe(true);
    expect(h[0].note).toBe("BBRI");
  });

  it("loadShortcutsVersioned memertahankan custom + isi default untuk key baru", () => {
    localStorage.setItem(
      "pyscal_shortcuts",
      JSON.stringify({ addPapan: { key: "p", mod: true, label: "Tambah Papan" } }),
    );
    const s = loadShortcutsVersioned();
    expect(s.addPapan.key).toBe("p");
    expect(s.undo).toEqual(DEFAULT_SHORTCUTS.undo);
  });
});
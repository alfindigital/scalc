import { describe, it, expect, beforeEach } from "vitest";
import {
  DEFAULT_STATE,
  DEFAULT_SHORTCUTS,
  loadState,
  loadShortcuts,
  migrateLegacyKeys,
  shortcutToString,
  eventMatchesShortcut,
} from "./storage";

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
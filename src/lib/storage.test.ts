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

/* ==================== Robustness scenarios ==================== */

// EventTarget shim on globalThis so CustomEvent dispatch survives in node.
function installEventTarget() {
  const et = new EventTarget();
  (globalThis as any).addEventListener = et.addEventListener.bind(et);
  (globalThis as any).removeEventListener = et.removeEventListener.bind(et);
  (globalThis as any).dispatchEvent = et.dispatchEvent.bind(et);
}

describe("multi-version migration", () => {
  it("state: legacy raw (v1) di-rewrap ke v2 dan default field terisi", () => {
    localStorage.setItem("pyscal_state", JSON.stringify({ baseLot: 500 }));
    const s = loadStateVersioned();
    expect(s.baseLot).toBe(500);
    expect(s.mode).toBe(DEFAULT_STATE.mode);
    const raw = JSON.parse(localStorage.getItem("pyscal_state") as string);
    expect(raw.version).toBe(SCHEMA_VERSION.state);
  });

  it("state: wrapped versi lama (v0) tetap dimigrasikan ke versi target", () => {
    localStorage.setItem(
      "pyscal_state",
      JSON.stringify({ version: 0, data: { baseLot: 700 } }),
    );
    const s = loadStateVersioned();
    expect(s.baseLot).toBe(700);
    const raw = JSON.parse(localStorage.getItem("pyscal_state") as string);
    expect(raw.version).toBe(SCHEMA_VERSION.state);
  });

  it("presets: legacy array raw → wrapped v2", () => {
    localStorage.setItem("pyscal_presets", JSON.stringify([{ name: "A" }]));
    const p = loadPresets<{ name: string }>();
    expect(p).toHaveLength(1);
    expect(p[0].name).toBe("A");
    const raw = JSON.parse(localStorage.getItem("pyscal_presets") as string);
    expect(raw.version).toBe(SCHEMA_VERSION.presets);
  });

  it("shortcuts: wrapped v1 → v2 mempertahankan custom, mengisi key baru", () => {
    localStorage.setItem(
      "pyscal_shortcuts",
      JSON.stringify({
        version: 1,
        data: { undo: { key: "u", mod: true, label: "Undo" } },
      }),
    );
    const s = loadShortcutsVersioned();
    expect(s.undo.key).toBe("u");
    expect(s.redo).toEqual(DEFAULT_SHORTCUTS.redo);
    const raw = JSON.parse(localStorage.getItem("pyscal_shortcuts") as string);
    expect(raw.version).toBe(SCHEMA_VERSION.shortcuts);
  });

  it("history: mix legacy entry valid + corrupt → drop yang rusak, isi field opsional", () => {
    installEventTarget();
    localStorage.setItem(
      "pyscal_history",
      JSON.stringify([
        { id: "ok", timestamp: 1, planned: { avgFinal: 10 } },
        { id: "no-timestamp", planned: { avgFinal: 10 } },
        null,
        "garbage",
        { id: "no-planned", timestamp: 2 },
      ]),
    );
    const h = loadHistory<{ id: string; pinned: boolean; note: string }>();
    expect(h).toHaveLength(1);
    expect(h[0].id).toBe("ok");
    expect(h[0].pinned).toBe(false);
  });
});

describe("delete + undo flow (persistence contract)", () => {
  // Meniru logika komponen: hapus entry lalu re-insert (undo) — history harus
  // konsisten & urutan pinned-first tetap dijaga oleh consumer, tapi storage
  // wajib round-trip apa adanya.
  it("saveHistory setelah delete lalu undo mengembalikan state persis", () => {
    const entries = [
      { id: "a", timestamp: 1, planned: { avgFinal: 1 }, pinned: false, note: "" },
      { id: "b", timestamp: 2, planned: { avgFinal: 2 }, pinned: true, note: "keep" },
      { id: "c", timestamp: 3, planned: { avgFinal: 3 }, pinned: false, note: "" },
    ];
    saveHistory(entries);

    // delete "b"
    const removed = entries.find((e) => e.id === "b")!;
    const afterDelete = entries.filter((e) => e.id !== "b");
    saveHistory(afterDelete);
    expect(loadHistory()).toHaveLength(2);

    // undo (re-insert)
    saveHistory([...afterDelete, removed]);
    const restored = loadHistory<{ id: string; pinned: boolean; note: string }>();
    expect(restored.map((e) => e.id).sort()).toEqual(["a", "b", "c"]);
    const b = restored.find((e) => e.id === "b")!;
    expect(b.pinned).toBe(true);
    expect(b.note).toBe("keep");
  });
});

describe("cross-tab sync (storage event payload)", () => {
  // Handler cross-tab di Pyscal.tsx melakukan JSON.parse → loadHistory().
  // Test ini memastikan payload yang ditulis di "tab lain" bisa dibaca
  // kembali via loader — kontrak minimum untuk sinkronisasi.
  it("tulis di 'tab lain' terbaca oleh loadHistory di tab ini", () => {
    // tab A menulis via API resmi
    saveHistory([
      { id: "x", timestamp: 1, planned: { avgFinal: 5 }, pinned: false, note: "" },
    ]);
    // tab B menimpa storage secara mentah (mirip event.newValue)
    const newPayload = {
      version: SCHEMA_VERSION.history,
      data: [
        { id: "x", timestamp: 1, planned: { avgFinal: 5 }, pinned: false, note: "" },
        { id: "y", timestamp: 2, planned: { avgFinal: 6 }, pinned: false, note: "new" },
      ],
    };
    localStorage.setItem("pyscal_history", JSON.stringify(newPayload));
    const h = loadHistory<{ id: string; note: string }>();
    expect(h.map((e) => e.id)).toEqual(["x", "y"]);
    expect(h[1].note).toBe("new");
  });

  it("payload cross-tab rusak → loader tidak throw, kembalikan []/default", () => {
    localStorage.setItem("pyscal_history", "{corrupt");
    expect(() => loadHistory()).not.toThrow();
    expect(loadHistory()).toEqual([]);
  });
});

describe("quota / private mode / storage unavailable", () => {
  function withQuotaStorage(fn: () => void) {
    const orig = (globalThis as any).localStorage;
    (globalThis as any).localStorage = {
      getItem: () => null,
      removeItem: () => {},
      setItem: () => {
        const err = new Error("quota") as Error & { name: string };
        err.name = "QuotaExceededError";
        throw err;
      },
    };
    try {
      fn();
    } finally {
      (globalThis as any).localStorage = orig;
    }
  }

  it("saveState pada quota exceeded mem-broadcast event pyscal:storage-error", () => {
    installEventTarget();
    const events: Array<{ key: string; kind: string }> = [];
    (globalThis as any).addEventListener("pyscal:storage-error", (e: any) => {
      events.push(e.detail);
    });
    withQuotaStorage(() => {
      saveState({ ...DEFAULT_STATE, baseLot: 999 });
    });
    expect(events.length).toBe(1);
    expect(events[0].key).toBe("pyscal_state");
    expect(events[0].kind).toBe("quota");
  });

  it("private mode (setItem throws generic) → event dengan kind=unavailable", () => {
    installEventTarget();
    const events: Array<{ key: string; kind: string }> = [];
    (globalThis as any).addEventListener("pyscal:storage-error", (e: any) => {
      events.push(e.detail);
    });
    const orig = (globalThis as any).localStorage;
    (globalThis as any).localStorage = {
      getItem: () => null,
      removeItem: () => {},
      setItem: () => {
        throw new Error("private");
      },
    };
    try {
      saveHistory([{ id: "z", timestamp: 1, planned: { avgFinal: 0 } }]);
    } finally {
      (globalThis as any).localStorage = orig;
    }
    expect(events.length).toBe(1);
    expect(events[0].kind).toBe("unavailable");
  });

  it("save saat storage error tidak crash caller", () => {
    withQuotaStorage(() => {
      expect(() => savePresets([{ name: "X" }])).not.toThrow();
      expect(() => saveShortcuts(DEFAULT_SHORTCUTS)).not.toThrow();
    });
  });
});

describe("data corruption resilience", () => {
  it("history dengan entry rusak → loadHistory drop + broadcast pyscal:storage-repaired", () => {
    installEventTarget();
    const events: Array<{ dropped: number; kept: number }> = [];
    (globalThis as any).addEventListener("pyscal:storage-repaired", (e: any) => {
      events.push(e.detail);
    });
    // Simpan dalam bentuk wrapped v2 supaya migrator tidak jalan, lalu paksa
    // validator ulang di loadHistory menemukan entry rusak.
    localStorage.setItem(
      "pyscal_history",
      JSON.stringify({
        version: SCHEMA_VERSION.history,
        data: [
          { id: "ok", timestamp: 1, planned: { avgFinal: 1 } },
          { id: null, timestamp: 2, planned: { avgFinal: 2 } },
          { foo: "bar" },
        ],
      }),
    );
    const h = loadHistory();
    expect(h).toHaveLength(1);
    expect(events.length).toBe(1);
    expect(events[0].dropped).toBe(2);
    expect(events[0].kept).toBe(1);
  });

  it("state JSON corrupt → loadStateVersioned default, tidak menulis apa-apa", () => {
    localStorage.setItem("pyscal_state", "###not-json###");
    expect(loadStateVersioned()).toEqual(DEFAULT_STATE);
    // storage tetap ada apa adanya (tidak overwrite otomatis pada load-null-path)
    expect(localStorage.getItem("pyscal_state")).toBe("###not-json###");
  });

  it("shortcuts wrapped berisi data non-object → default", () => {
    localStorage.setItem(
      "pyscal_shortcuts",
      JSON.stringify({ version: SCHEMA_VERSION.shortcuts, data: 42 }),
    );
    // migrator akan menerima 42 dan kembalikan DEFAULT_SHORTCUTS
    const s = loadShortcutsVersioned();
    expect(s).toEqual(DEFAULT_SHORTCUTS);
  });
});
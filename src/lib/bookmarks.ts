// Local bookmark + "last read" tracker for tutorial pages.
// SSR-safe: every window access is guarded.

export interface TutorialBookmark {
  path: string;
  title: string;
  savedAt: number;
}

export interface LastReadTutorial {
  path: string;
  title: string;
  visitedAt: number;
  scrollY?: number;
}

const BOOKMARKS_KEY = "pyscal_tutorial_bookmarks";
const LAST_READ_KEY = "pyscal_tutorial_last_read";
const POSITIONS_KEY = "pyscal_tutorial_positions";
const RESUME_FLAG_KEY = "pyscal_resume_target";

function safeRead(key: string): unknown {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

export function loadBookmarks(): TutorialBookmark[] {
  const raw = safeRead(BOOKMARKS_KEY);
  return Array.isArray(raw) ? (raw as TutorialBookmark[]) : [];
}

export function isBookmarked(path: string): boolean {
  return loadBookmarks().some((b) => b.path === path);
}

export function toggleBookmark(path: string, title: string): boolean {
  const list = loadBookmarks();
  const idx = list.findIndex((b) => b.path === path);
  let nowSaved: boolean;
  if (idx >= 0) {
    list.splice(idx, 1);
    nowSaved = false;
  } else {
    list.unshift({ path, title, savedAt: Date.now() });
    nowSaved = true;
  }
  safeWrite(BOOKMARKS_KEY, list);
  try {
    window.dispatchEvent(new CustomEvent("pyscal:bookmarks-changed"));
  } catch {
    /* noop */
  }
  return nowSaved;
}

export function loadLastRead(): LastReadTutorial | null {
  const raw = safeRead(LAST_READ_KEY);
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<LastReadTutorial>;
  if (typeof obj.path !== "string" || typeof obj.title !== "string") return null;
  return {
    path: obj.path,
    title: obj.title,
    visitedAt: obj.visitedAt ?? 0,
    scrollY: typeof obj.scrollY === "number" ? obj.scrollY : 0,
  };
}

export function setLastRead(path: string, title: string): void {
  const y = loadPosition(path);
  safeWrite(LAST_READ_KEY, { path, title, visitedAt: Date.now(), scrollY: y });
}

/* ---- Scroll position per tutorial ---- */

function loadPositions(): Record<string, number> {
  const raw = safeRead(POSITIONS_KEY);
  return raw && typeof raw === "object" ? (raw as Record<string, number>) : {};
}

export function loadPosition(path: string): number {
  const y = loadPositions()[path];
  return typeof y === "number" && y > 0 ? y : 0;
}

export function savePosition(path: string, y: number): void {
  const map = loadPositions();
  if (y < 40) {
    delete map[path];
  } else {
    map[path] = Math.round(y);
  }
  safeWrite(POSITIONS_KEY, map);
}

/* ---- Resume-target flag (survives one navigation) ---- */

export function markResumeTarget(path: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(RESUME_FLAG_KEY, path);
  } catch {
    /* noop */
  }
}

export function consumeResumeTarget(path: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const flag = sessionStorage.getItem(RESUME_FLAG_KEY);
    if (flag === path) {
      sessionStorage.removeItem(RESUME_FLAG_KEY);
      return true;
    }
  } catch {
    /* noop */
  }
  return false;
}
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
}

const BOOKMARKS_KEY = "pyscal_tutorial_bookmarks";
const LAST_READ_KEY = "pyscal_tutorial_last_read";

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
  return { path: obj.path, title: obj.title, visitedAt: obj.visitedAt ?? 0 };
}

export function setLastRead(path: string, title: string): void {
  safeWrite(LAST_READ_KEY, { path, title, visitedAt: Date.now() });
}
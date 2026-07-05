import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  isBookmarked,
  loadLastRead,
  setLastRead,
  toggleBookmark,
} from "@/lib/bookmarks";

interface Props {
  path: string;
  title: string;
}

export function TutorialBookmark({ path, title }: Props) {
  const [saved, setSaved] = useState(false);
  const [resume, setResume] = useState<{ path: string; title: string } | null>(null);

  useEffect(() => {
    // Track last-read only on real navigation, not on future turns.
    const prev = loadLastRead();
    if (prev && prev.path !== path) setResume(prev);
    setLastRead(path, title);
    setSaved(isBookmarked(path));

    const onChange = () => setSaved(isBookmarked(path));
    window.addEventListener("pyscal:bookmarks-changed", onChange);
    return () => window.removeEventListener("pyscal:bookmarks-changed", onChange);
  }, [path, title]);

  return (
    <div className="pyscal-bookmark">
      {resume ? (
        <Link
          to={resume.path}
          className="pyscal-bookmark__resume"
          aria-label={`Lanjutkan tutorial: ${resume.title}`}
          title={`Lanjutkan: ${resume.title}`}
        >
          <span className="pyscal-bookmark__resume-label">Lanjutkan</span>
          <span className="pyscal-bookmark__resume-title">{resume.title}</span>
        </Link>
      ) : null}
      <button
        type="button"
        onClick={() => setSaved(toggleBookmark(path, title))}
        className="pyscal-bookmark__btn"
        aria-pressed={saved}
        aria-label={saved ? "Hapus bookmark" : "Simpan bookmark"}
        title={saved ? "Tersimpan — klik untuk hapus" : "Simpan tutorial ini"}
        data-saved={saved ? "true" : "false"}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={saved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        <span className="pyscal-bookmark__btn-label">
          {saved ? "Tersimpan" : "Simpan"}
        </span>
      </button>
    </div>
  );
}
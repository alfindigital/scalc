import { useCallback, useRef, useState, type KeyboardEvent } from "react";

export interface TagChip {
  label: string;
  variant?: "default" | "muted";
}

interface Props {
  items: TagChip[];
  ariaLabel?: string;
}

/**
 * Roving-tabindex chip group. Only the active chip is in the tab order;
 * Arrow keys / Home / End move focus among chips. Order stays visual/DOM,
 * so wrapping to 2 rows keeps a predictable left-to-right, top-to-bottom flow.
 */
export function TagChips({ items, ariaLabel = "Kategori" }: Props) {
  const [active, setActive] = useState(0);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusAt = useCallback((i: number) => {
    const n = items.length;
    if (n === 0) return;
    const next = ((i % n) + n) % n;
    setActive(next);
    refs.current[next]?.focus();
  }, [items.length]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        focusAt(active + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        focusAt(active - 1);
        break;
      case "Home":
        e.preventDefault();
        focusAt(0);
        break;
      case "End":
        e.preventDefault();
        focusAt(items.length - 1);
        break;
    }
  };

  return (
    <div
      className="pyscal-article__tags"
      role="toolbar"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      onKeyDown={onKey}
    >
      {items.map((t, i) => (
        <button
          key={t.label}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          className="pyscal-article__tag"
          data-variant={t.variant ?? "default"}
          tabIndex={i === active ? 0 : -1}
          onFocus={() => setActive(i)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
import { useEffect, useRef, useState } from "react";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";

/**
 * Floating on-screen scroll pad. Scrolls the nearest scrollable ancestor of
 * <main>, falling back to the window. Useful on touch devices and when the
 * page has both horizontal and vertical overflow (e.g. the world map).
 */
export function ScrollControls() {
  const [visible, setVisible] = useState(true);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Hide on very small heights (virtual keyboard etc.)
    const onResize = () => setVisible(window.innerHeight > 380);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const findScroller = (dir: "x" | "y"): HTMLElement | Window => {
    // Walk up from the pad's parent looking for an overflowing ancestor.
    let el: HTMLElement | null = ref.current?.parentElement ?? null;
    while (el && el !== document.body) {
      const style = window.getComputedStyle(el);
      const overflow = dir === "y" ? style.overflowY : style.overflowX;
      const scrollable =
        (overflow === "auto" || overflow === "scroll") &&
        (dir === "y"
          ? el.scrollHeight > el.clientHeight
          : el.scrollWidth > el.clientWidth);
      if (scrollable) return el;
      el = el.parentElement;
    }
    return window;
  };

  const scroll = (dx: number, dy: number) => {
    const target = findScroller(dy !== 0 ? "y" : "x");
    if (target === window) {
      window.scrollBy({ left: dx, top: dy, behavior: "smooth" });
    } else {
      (target as HTMLElement).scrollBy({ left: dx, top: dy, behavior: "smooth" });
    }
  };

  if (!visible) return null;

  const step = 320;

  const btn =
    "size-9 rounded-md bg-surface/90 backdrop-blur border border-border text-foreground hover:bg-surface-elevated hover:text-brand active:scale-95 transition flex items-center justify-center shadow-lg";

  return (
    <div
      ref={ref}
      aria-label="Scroll controls"
      className="fixed bottom-4 right-4 z-40 grid grid-cols-3 grid-rows-3 gap-1 p-1.5 rounded-xl bg-background/60 backdrop-blur-md border border-border shadow-xl"
    >
      <div />
      <button
        aria-label="Scroll up"
        onClick={() => scroll(0, -step)}
        className={btn}
      >
        <ArrowUp className="size-4" />
      </button>
      <div />

      <button
        aria-label="Scroll left"
        onClick={() => scroll(-step, 0)}
        className={btn}
      >
        <ArrowLeft className="size-4" />
      </button>
      <button
        aria-label="Scroll to top"
        onClick={() => {
          const t = findScroller("y");
          if (t === window) window.scrollTo({ top: 0, behavior: "smooth" });
          else (t as HTMLElement).scrollTo({ top: 0, behavior: "smooth" });
        }}
        className="size-9 rounded-md bg-brand/15 border border-brand/30 text-brand hover:bg-brand/25 transition flex items-center justify-center text-[10px] font-bold"
      >
        TOP
      </button>
      <button
        aria-label="Scroll right"
        onClick={() => scroll(step, 0)}
        className={btn}
      >
        <ArrowRight className="size-4" />
      </button>

      <div />
      <button
        aria-label="Scroll down"
        onClick={() => scroll(0, step)}
        className={btn}
      >
        <ArrowDown className="size-4" />
      </button>
      <div />
    </div>
  );
}

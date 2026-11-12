import { type ReactElement, useEffect, useRef } from "react";

/**
 * Ambient drift: a handful of feather-leaves floating down the page margins, like the quill's own barbs let
 * loose. They drift on their own and lean gently with the mouse (deeper leaves move more). Purely decorative:
 * behind the content, never catching clicks, hidden for reduced motion.
 */
interface Leaf {
    readonly side: "left" | "right";
    readonly x: number; // 0..100, position inside the margin
    readonly size: number; // px
    readonly duration: number; // s for one drift
    readonly delay: number; // s, negative so the sky is already populated
    readonly sway: number; // px
    readonly spin: number; // deg
    readonly tone: number; // 0..1 opacity scale
    readonly depth: number; // 0..1, how much the mouse moves it
}

const LEAVES: readonly Leaf[] = [
    { side: "left", x: 30, size: 26, duration: 26, delay: -4, sway: 18, spin: 40, tone: 0.9, depth: 0.6 },
    { side: "left", x: 70, size: 18, duration: 34, delay: -19, sway: 24, spin: -60, tone: 0.6, depth: 0.3 },
    { side: "left", x: 50, size: 34, duration: 44, delay: -31, sway: 14, spin: 25, tone: 0.5, depth: 1 },
    { side: "right", x: 35, size: 22, duration: 30, delay: -11, sway: 20, spin: -35, tone: 0.8, depth: 0.5 },
    { side: "right", x: 65, size: 30, duration: 40, delay: -26, sway: 16, spin: 55, tone: 0.55, depth: 0.9 },
    { side: "right", x: 50, size: 16, duration: 24, delay: -7, sway: 26, spin: -20, tone: 0.7, depth: 0.25 }
];

function FeatherLeaf({ size }: { size: number }): ReactElement {
    return (
        <svg viewBox="0 0 64 64" width={size} height={size * 1.4} aria-hidden="true" focusable="false">
            <path d="M8 60 C10 36 24 16 60 4 C52 28 40 44 20 56 C16 58 12 60 8 60 Z" fill="currentColor" />
            <path
                d="M8 60 C22 44 36 30 54 12"
                stroke="var(--verse-paper)"
                strokeWidth="1.6"
                fill="none"
                strokeLinecap="round"
                opacity="0.7"
            />
        </svg>
    );
}

export function Ambient(): ReactElement {
    const ref = useRef<HTMLDivElement>(null);

    // the mouse leans the leaves: -1..1 across the window, written as CSS variables once per frame
    useEffect(() => {
        const el = ref.current;
        if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            return undefined;
        }
        let frame = 0;
        let mx = 0;
        let my = 0;
        const onMove = (e: MouseEvent) => {
            mx = (e.clientX / window.innerWidth) * 2 - 1;
            my = (e.clientY / window.innerHeight) * 2 - 1;
            if (!frame) {
                frame = requestAnimationFrame(() => {
                    frame = 0;
                    el.style.setProperty("--mx", mx.toFixed(3));
                    el.style.setProperty("--my", my.toFixed(3));
                });
            }
        };
        const onLeave = () => {
            el.style.setProperty("--mx", "0");
            el.style.setProperty("--my", "0");
        };
        window.addEventListener("mousemove", onMove, { passive: true });
        document.addEventListener("mouseleave", onLeave);
        return () => {
            window.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseleave", onLeave);
            if (frame) {
                cancelAnimationFrame(frame);
            }
        };
    }, []);

    return (
        <div className="verse-ambient" aria-hidden="true" ref={ref}>
            {LEAVES.map((leaf, i) => (
                <span
                    key={i}
                    className={`verse-leaf verse-leaf--${leaf.side}`}
                    style={
                        {
                            "--pos": leaf.x / 100,
                            "--dur": `${leaf.duration}s`,
                            "--delay": `${leaf.delay}s`,
                            "--sway": `${leaf.sway}px`,
                            "--spin": `${leaf.spin}deg`,
                            "--tone": leaf.tone,
                            "--depth": leaf.depth
                        } as React.CSSProperties
                    }>
                    <span className="verse-leaf-lean">
                        <FeatherLeaf size={leaf.size} />
                    </span>
                </span>
            ))}
        </div>
    );
}

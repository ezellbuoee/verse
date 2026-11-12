import { type FeedPost, MOOD_LABELS } from "./feedApi";

/** A poem or quote as a picture people can post: title, the words, the poet and a Verse mark. */
export type ShareStyle = "paper" | "night" | "terracotta";
export type ShareFormat = "square" | "portrait" | "story";

export interface ShareOptions {
    readonly style: ShareStyle;
    readonly format: ShareFormat;
}

interface Palette {
    readonly ground: string;
    readonly ink: string;
    readonly soft: string;
    readonly accent: string;
    readonly line: string;
    readonly wash: string;
}

const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif';
const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const SIZES: Record<ShareFormat, { w: number; h: number }> = {
    square: { w: 1080, h: 1080 },
    portrait: { w: 1080, h: 1350 },
    story: { w: 1080, h: 1920 }
};

const WASH: Record<string, [string, string]> = {
    LOVE: ["#f3d4d0", "#4a2a2b"],
    GRIEF: ["#d9d6e4", "#33304a"],
    JOY: ["#f7e5b8", "#4a3c1e"],
    NATURE: ["#d6e5d0", "#27392a"],
    HOPE: ["#fbe1c4", "#4b321d"],
    NIGHT: ["#cfd6e6", "#232c44"]
};

function palette(style: ShareStyle, mood: string | null): Palette {
    const wash = mood ? WASH[mood] : undefined;
    switch (style) {
        case "night":
            return {
                ground: "#15120f",
                ink: "#f1eae0",
                soft: "#a79c90",
                accent: "#e0775c",
                line: "#2e2721",
                wash: wash ? wash[1] : "#3a241d"
            };
        case "terracotta":
            return {
                ground: "#b5533c",
                ink: "#fff7ef",
                soft: "#f3d3c8",
                accent: "#ffe3d6",
                line: "#c9705a",
                wash: "#d17a62"
            };
        default:
            return {
                ground: "#faf6ef",
                ink: "#221d1a",
                soft: "#6e655c",
                accent: "#b5533c",
                line: "#e9e1d6",
                wash: wash ? wash[0] : "#f6e3dc"
            };
    }
}

/** Break one line of text into lines no wider than `max`. Long words are split rather than overflow. */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
        const probe = line ? `${line} ${word}` : word;
        if (ctx.measureText(probe).width <= max) {
            line = probe;
            continue;
        }
        if (line) {
            lines.push(line);
        }
        if (ctx.measureText(word).width <= max) {
            line = word;
        } else {
            let chunk = "";
            for (const ch of word) {
                if (ctx.measureText(chunk + ch).width > max) {
                    lines.push(chunk);
                    chunk = ch;
                } else {
                    chunk += ch;
                }
            }
            line = chunk;
        }
    }
    if (line) {
        lines.push(line);
    }
    return lines;
}

interface Laid {
    /** Rows to draw; null = stanza gap. */
    readonly rows: (string | null)[];
    readonly size: number;
    readonly lineHeight: number;
    readonly truncated: boolean;
    readonly height: number;
}

/** Fit the body into `maxHeight`, shrinking the type down to `minSize` before cutting lines. */
function layoutBody(
    ctx: CanvasRenderingContext2D,
    body: string,
    maxWidth: number,
    maxHeight: number,
    font: (size: number) => string,
    startSize: number,
    minSize: number
): Laid {
    const paragraphs = body.replace(/\r/g, "").split(/\n\s*\n/);
    for (let size = startSize; size >= minSize; size -= 2) {
        ctx.font = font(size);
        const lineHeight = Math.round(size * 1.5);
        const rows: (string | null)[] = [];
        paragraphs.forEach((p, i) => {
            if (i > 0) {
                rows.push(null);
            }
            p.split("\n").forEach((l) => rows.push(...(l.trim() ? wrap(ctx, l.trim(), maxWidth) : [""])));
        });
        const height = rows.reduce((h, r) => h + (r === null ? lineHeight * 0.6 : lineHeight), 0);
        if (height <= maxHeight) {
            return { rows, size, lineHeight, truncated: false, height };
        }
        if (size - 2 < minSize) {
            // cut at the last whole line that fits, leave room for the "…" line
            const keep: (string | null)[] = [];
            let h = 0;
            for (const r of rows) {
                const add = r === null ? lineHeight * 0.6 : lineHeight;
                if (h + add + lineHeight > maxHeight) {
                    break;
                }
                keep.push(r);
                h += add;
            }
            while (keep.length && keep[keep.length - 1] === null) {
                keep.pop();
            }
            keep.push("…");
            return { rows: keep, size, lineHeight, truncated: true, height: h + lineHeight };
        }
    }
    return { rows: [], size: minSize, lineHeight: minSize, truncated: true, height: 0 };
}

function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
    const s = size / 120;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = color;
    ctx.fill(new Path2D("M12 22 L32 22 L52 82 L46 100 Z"));
    ctx.fill(new Path2D("M50 94 C52 62 68 34 108 10 C102 36 92 58 74 80 C68 88 60 94 50 94 Z"));
    ctx.beginPath();
    ctx.arc(44, 110, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

/** Renders the picture. Pure canvas, no network, so it also works offline and on phones. */
export function renderShareImage(post: FeedPost, options: ShareOptions, host: string): HTMLCanvasElement {
    const { w, h } = SIZES[options.format];
    const p = palette(options.style, post.mood);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        return canvas;
    }
    const isQuote = post.kind === "QUOTE";
    const margin = 96;
    const inner = w - margin * 2;

    // ground and a soft wash in the top corner
    ctx.fillStyle = p.ground;
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w * 0.92, h * 0.04, 0, w * 0.92, h * 0.04, w * 0.75);
    g.addColorStop(0, p.wash);
    g.addColorStop(1, `${p.ground}00`);
    ctx.fillStyle = g;
    ctx.globalAlpha = options.style === "terracotta" ? 0.5 : 0.9;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;

    // thin frame
    ctx.strokeStyle = p.line;
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, w - 80, h - 80);

    // footer first, so the body knows how much room it has
    const footerY = h - margin - 20;
    drawLogo(ctx, margin, footerY - 44, 56, p.accent);
    ctx.fillStyle = p.ink;
    ctx.font = `700 34px ${SERIF}`;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillText("Verse", margin + 62, footerY);
    ctx.fillStyle = p.soft;
    ctx.font = `400 22px ${SANS}`;
    ctx.textAlign = "right";
    ctx.fillText(host, w - margin, footerY);
    ctx.textAlign = "left";

    // kicker: drawn inside each branch, because a short poem may be shifted down a little
    let y = margin + 36;
    const moodLabel = post.mood ? (MOOD_LABELS[post.mood] ?? post.mood.toLowerCase()) : null;
    const kicker = `${isQuote ? "QUOTE" : "POEM"}${moodLabel ? `  ·  ${moodLabel.toUpperCase()}` : ""}`;
    const drawKicker = (x: number, at: number, align: CanvasTextAlign) => {
        ctx.fillStyle = p.accent;
        ctx.font = `600 22px ${SANS}`;
        ctx.letterSpacing = "4px";
        ctx.textAlign = align;
        ctx.fillText(kicker, x, at);
        ctx.letterSpacing = "0px";
        ctx.textAlign = "left";
    };

    // author line goes under the text; reserve its height
    const authorBlock = 130;
    const ornament = 64;

    if (isQuote) {
        drawKicker(w / 2, y, "center");
        y += 48;
        // big opening quote mark
        ctx.fillStyle = p.wash === p.ground ? p.line : options.style === "terracotta" ? p.line : p.wash;
        ctx.font = `700 260px ${SERIF}`;
        ctx.textAlign = "center";
        ctx.globalAlpha = options.style === "paper" ? 1 : 0.9;
        ctx.fillText("“", w / 2, y + 150);
        ctx.globalAlpha = 1;
        y += 60;
        const avail = footerY - 120 - authorBlock - y;
        const laid = layoutBody(ctx, post.body, inner - 40, avail, (s) => `italic 400 ${s}px ${SERIF}`, 64, 34);
        // vertically centre the quote in the available space
        let ty = y + Math.max(0, (avail - laid.height) / 2) + laid.size;
        ctx.fillStyle = p.ink;
        ctx.font = `italic 400 ${laid.size}px ${SERIF}`;
        ctx.textAlign = "center";
        for (const r of laid.rows) {
            if (r === null) {
                ty += laid.lineHeight * 0.6;
                continue;
            }
            ctx.fillText(r, w / 2, ty);
            ty += laid.lineHeight;
        }
        // author
        ty += 24;
        ctx.fillStyle = p.accent;
        ctx.fillRect(w / 2 - 40, ty - 2, 80, 3);
        ty += 48;
        ctx.fillStyle = p.ink;
        ctx.font = `700 36px ${SERIF}`;
        ctx.fillText(`— ${post.authorName}`, w / 2, ty);
    } else {
        // measure the title first
        let titleSize = 72;
        let titleLines: string[] = [];
        for (; titleSize >= 44; titleSize -= 4) {
            ctx.font = `700 ${titleSize}px ${SERIF}`;
            titleLines = wrap(ctx, post.title ?? "Untitled", inner);
            if (titleLines.length <= 3) {
                break;
            }
        }
        const titleHeight = titleSize + titleLines.length * Math.round(titleSize * 1.12) + 8 + ornament;
        // then the body, so a short poem on a tall picture can sit a little lower instead of hugging the top
        const availAll = footerY - 110 - authorBlock - (y + 48) - titleHeight;
        const laid = layoutBody(ctx, post.body, inner, availAll, (s) => `400 ${s}px ${SERIF}`, 44, 28);
        const spare = Math.max(0, availAll - laid.height);
        y += Math.min(spare * 0.4, h * 0.18);
        drawKicker(margin, y, "left");
        y += 48;

        ctx.fillStyle = p.ink;
        ctx.font = `700 ${titleSize}px ${SERIF}`;
        y += titleSize;
        for (const l of titleLines) {
            ctx.fillText(l, margin, y);
            y += Math.round(titleSize * 1.12);
        }
        // ornament rule
        y += 8;
        ctx.strokeStyle = p.line;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(margin, y);
        ctx.lineTo(margin + 90, y);
        ctx.stroke();
        ctx.fillStyle = p.accent;
        ctx.font = `400 30px ${SERIF}`;
        ctx.fillText("❧", margin + 104, y + 10);
        y += ornament;

        ctx.fillStyle = p.ink;
        ctx.font = `400 ${laid.size}px ${SERIF}`;
        let ty = y + laid.size;
        for (const r of laid.rows) {
            if (r === null) {
                ty += laid.lineHeight * 0.6;
                continue;
            }
            ctx.fillText(r, margin, ty);
            ty += laid.lineHeight;
        }
        if (laid.truncated) {
            ctx.fillStyle = p.soft;
            ctx.font = `400 22px ${SANS}`;
            ctx.fillText("Read the whole poem on Verse", margin, ty + 6);
            ty += 30;
        }
        // author
        ty += 36;
        ctx.fillStyle = p.accent;
        ctx.fillRect(margin, ty - 2, 60, 3);
        ty += 44;
        ctx.fillStyle = p.ink;
        ctx.font = `700 34px ${SERIF}`;
        ctx.fillText(`— ${post.authorName}`, margin, ty);
    }
    return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not make the picture"))), "image/png")
    );
}

/** verse-son-of-klay.png */
export function shareFileName(post: FeedPost): string {
    const base = (post.kind === "QUOTE" ? post.body.slice(0, 40) : (post.title ?? "poem"))
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    return `verse-${base || "poem"}.png`;
}

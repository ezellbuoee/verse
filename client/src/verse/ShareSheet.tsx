import { type ReactElement, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import type { FeedPost } from "./feedApi";
import { toPath } from "./router";
import { canvasToBlob, renderShareImage, type ShareFormat, type ShareStyle, shareFileName } from "./shareImage";

interface Props {
    readonly post: FeedPost;
    readonly onClose: () => void;
}

const STYLES: readonly [ShareStyle, string][] = [
    ["paper", "Paper"],
    ["night", "Night"],
    ["terracotta", "Terracotta"]
];
const FORMATS: readonly [ShareFormat, string][] = [
    ["square", "Square"],
    ["portrait", "Portrait"],
    ["story", "Story"]
];

/** "Share" for a poem or quote: a picture to post, the link to copy, and the phone's own share sheet. */
export function ShareSheet({ post, onClose }: Props): ReactElement {
    const [style, setStyle] = useState<ShareStyle>("paper");
    const [format, setFormat] = useState<ShareFormat>("square");
    const [note, setNote] = useState<string | null>(null);
    const link = `${window.location.origin}${toPath({ kind: "poem", id: post.id })}`;
    const host = window.location.host;

    const canvas = useMemo(() => renderShareImage(post, { style, format }, host), [post, style, format, host]);
    const preview = useMemo(() => canvas.toDataURL("image/png"), [canvas]);
    const canNativeShare = typeof navigator.share === "function";

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") {
                onClose();
            }
        }
        document.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose]);

    useEffect(() => {
        if (!note) {
            return undefined;
        }
        const t = window.setTimeout(() => setNote(null), 2200);
        return () => window.clearTimeout(t);
    }, [note]);

    async function download() {
        const blob = await canvasToBlob(canvas);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = shareFileName(post);
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setNote("Saved to your downloads");
    }

    async function copyImage() {
        try {
            const blob = await canvasToBlob(canvas);
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            setNote("Picture copied");
        } catch {
            setNote("Your browser cannot copy pictures. Download it instead.");
        }
    }

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(link);
            setNote("Link copied");
        } catch {
            window.prompt("Copy this link", link);
        }
    }

    async function nativeShare() {
        try {
            const blob = await canvasToBlob(canvas);
            const file = new File([blob], shareFileName(post), { type: "image/png" });
            const title =
                post.kind === "QUOTE"
                    ? `A quote by ${post.authorName}`
                    : `${post.title ?? "A poem"} by ${post.authorName}`;
            if (navigator.canShare?.({ files: [file] })) {
                await navigator.share({ files: [file], title, text: link });
            } else {
                await navigator.share({ title, text: title, url: link });
            }
        } catch {
            // the person closed the sheet; nothing to say
        }
    }

    // rendered on <body>: an animated ancestor would otherwise trap the fixed backdrop inside the article
    return createPortal(
        <div className="verse-share-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <div className="verse-share" role="dialog" aria-modal="true" aria-label="Share this piece">
                <div className="verse-share-head">
                    <div>
                        <p className="verse-kicker">Share</p>
                        <h2 className="verse-share-title">
                            {post.kind === "QUOTE" ? "This quote" : (post.title ?? "This poem")}
                            <span className="verse-share-by"> · {post.authorName}</span>
                        </h2>
                    </div>
                    <button type="button" className="verse-share-close" aria-label="Close" onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className="verse-share-body">
                    <figure className={`verse-share-preview verse-share-preview--${format}`}>
                        <img src={preview} alt={`Picture of ${post.kind === "QUOTE" ? "the quote" : "the poem"}`} />
                    </figure>

                    <div className="verse-share-controls">
                        <div className="verse-share-group">
                            <span className="verse-share-label">Look</span>
                            <div className="verse-segmented" role="radiogroup" aria-label="Look">
                                {STYLES.map(([key, label]) => (
                                    <button
                                        type="button"
                                        key={key}
                                        role="radio"
                                        aria-checked={style === key}
                                        className={style === key ? "is-on" : ""}
                                        onClick={() => setStyle(key)}>
                                        <span className={`verse-swatch verse-swatch--${key}`} aria-hidden="true" />
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="verse-share-group">
                            <span className="verse-share-label">Shape</span>
                            <div className="verse-segmented" role="radiogroup" aria-label="Shape">
                                {FORMATS.map(([key, label]) => (
                                    <button
                                        type="button"
                                        key={key}
                                        role="radio"
                                        aria-checked={format === key}
                                        className={format === key ? "is-on" : ""}
                                        onClick={() => setFormat(key)}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="verse-share-actions">
                            <button type="button" className="verse-primary" onClick={download}>
                                ⤓ Download picture
                            </button>
                            {canNativeShare && (
                                <button type="button" className="verse-secondary" onClick={nativeShare}>
                                    ⤴ Share…
                                </button>
                            )}
                            <button type="button" className="verse-secondary" onClick={copyImage}>
                                Copy picture
                            </button>
                            <button type="button" className="verse-secondary" onClick={copyLink}>
                                Copy link
                            </button>
                        </div>
                        <p className="verse-share-hint">
                            Square and portrait fit a post, story fits a phone screen. Long poems are shortened and
                            point to the full text on Verse.
                        </p>
                        <p className="verse-share-note" aria-live="polite">
                            {note ?? ""}
                        </p>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

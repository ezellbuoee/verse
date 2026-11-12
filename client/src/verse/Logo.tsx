import type { ReactElement } from "react";

interface Props {
    readonly size?: number;
    /** Heavier cut without barbs, for small sizes. */
    readonly simple?: boolean;
    readonly className?: string;
}

/** The Verse mark: a V whose right stroke is a quill. Inherits the text colour. */
export function Logo({ size = 28, simple = false, className }: Props): ReactElement {
    return (
        <svg
            className={className}
            viewBox="0 0 120 120"
            width={size}
            height={size}
            aria-hidden="true"
            focusable="false"
            style={{ display: "block", flexShrink: 0 }}>
            {simple ? (
                <>
                    <path d="M12 22 L32 22 L52 82 L46 100 Z" fill="currentColor" />
                    <path d="M50 94 C52 62 68 34 108 10 C102 36 92 58 74 80 C68 88 60 94 50 94 Z" fill="currentColor" />
                    <circle cx="44" cy="110" r="4" fill="currentColor" />
                </>
            ) : (
                <>
                    <path d="M14 24 L30 24 L52 84 L46 100 Z" fill="currentColor" />
                    <path d="M52 92 C54 64 68 36 106 12 C100 36 92 56 76 78 C70 86 62 92 52 92 Z" fill="currentColor" />
                    <path
                        d="M66 70 L92 36 M62 78 L84 50 M58 86 L76 64"
                        stroke="var(--verse-paper)"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        opacity="0.85"
                    />
                    <path d="M52 92 C50 96 48 100 46 104" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="44" cy="110" r="3.4" fill="currentColor" />
                </>
            )}
        </svg>
    );
}

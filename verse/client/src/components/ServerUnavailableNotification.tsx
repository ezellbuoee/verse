import type { ReactElement } from "react";

import { Logo } from "../verse/Logo";

/** Shown when the server did not answer at startup. */
export function ServerUnavailableNotification(): ReactElement {
    return (
        <div className="verse-page">
            <div className="verse-sheet">
                <div className="verse-form" role="alert">
                    <Logo size={48} className="verse-sheet-mark" />
                    <h1 className="verse-form-title">Verse is not reachable</h1>
                    <p className="verse-form-hint">
                        The server did not answer. It may be starting or being updated. Please try again in a moment.
                    </p>
                    <button type="button" className="verse-primary" onClick={() => globalThis.location.reload()}>
                        Try again
                    </button>
                </div>
            </div>
        </div>
    );
}

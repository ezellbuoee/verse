import { type ReactElement, useEffect, useState } from "react";

import { timeAgo } from "./feedApi";
import { dismissReport, type OpenReport, openReports, removePost } from "./rpc";

/** Admin: the list of open reports, each with Remove post / Dismiss. */
export function ReportsView(): ReactElement {
    const [reports, setReports] = useState<OpenReport[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    function refresh() {
        openReports()
            .then(setReports)
            .catch((e: Error) => setError(e.message));
    }

    useEffect(refresh, []);

    async function act(report: OpenReport, action: "remove" | "dismiss") {
        setBusy(report.id);
        setError(null);
        try {
            if (action === "remove") {
                await removePost(report.postId);
            } else {
                await dismissReport(report.id);
            }
            refresh();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(null);
        }
    }

    return (
        <div className="verse-view">
            <div className="verse-chats">
                <h1 className="verse-form-title">Reports</h1>
                {error && <p className="verse-status verse-status--error">{error}</p>}
                {reports === null && !error && <p className="verse-status">Loading…</p>}
                {reports && reports.length === 0 && <p className="verse-status">Nothing reported. Enjoy the quiet.</p>}
                {reports?.map((r) => (
                    <section className="verse-card verse-report" key={r.id}>
                        <p className="verse-report-head">
                            <strong>{r.reporterName}</strong> reported this {timeAgo(r.createdAt)}
                            {r.reason ? `: “${r.reason}”` : "."}
                        </p>
                        {r.post ? (
                            <blockquote className="verse-report-post">
                                {r.post.title && <strong>{r.post.title}</strong>}
                                <p className="verse-poem-body">{r.post.body}</p>
                                <footer className="verse-form-hint">by {r.post.authorName}</footer>
                            </blockquote>
                        ) : (
                            <p className="verse-form-hint">The post is already gone.</p>
                        )}
                        <div className="verse-confirm-actions">
                            <button
                                type="button"
                                className="verse-secondary verse-primary--small"
                                disabled={busy === r.id}
                                onClick={() => act(r, "dismiss")}>
                                Dismiss
                            </button>
                            {r.post && (
                                <button
                                    type="button"
                                    className="verse-primary verse-primary--small verse-danger"
                                    disabled={busy === r.id}
                                    onClick={() => act(r, "remove")}>
                                    Remove post
                                </button>
                            )}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}

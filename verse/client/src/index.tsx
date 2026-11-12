import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ServerUnavailableNotification } from "./components/ServerUnavailableNotification";
import { App } from "./verse/App";
import { ThemeProvider } from "./verse/theme";
import "./base.css";
import "./verse/verse.css";

const HEALTH_PATH = "/api/actuator/health";
const SERVER_STATUS_UP = "UP";

const INITIAL_POLL_MS = 500;
const MAX_POLL_MS = 3_000;
const TIMEOUT_MS = 30_000;

async function isServerAvailable(): Promise<boolean> {
    try {
        const response = await fetch(HEALTH_PATH);
        if (!response.ok) {
            return false;
        }
        const data = (await response.json()) as { status?: string };
        return data.status === SERVER_STATUS_UP;
    } catch {
        return false;
    }
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** The server may still be starting (first deploy, migrations): wait for it a little before giving up. */
async function waitForServerAvailable(): Promise<boolean> {
    const timeoutAt = Date.now() + TIMEOUT_MS;
    let pollInterval = INITIAL_POLL_MS;

    do {
        if (await isServerAvailable()) {
            return true;
        }
        await delay(pollInterval);
        pollInterval = Math.min(pollInterval * 2, MAX_POLL_MS);
    } while (Date.now() < timeoutAt);

    return false;
}

const mountPoint = document.getElementById("root");
if (mountPoint) {
    const root = createRoot(mountPoint);
    const available = await waitForServerAvailable();
    root.render(
        <StrictMode>
            <ThemeProvider>{available ? <App /> : <ServerUnavailableNotification />}</ThemeProvider>
        </StrictMode>
    );
}

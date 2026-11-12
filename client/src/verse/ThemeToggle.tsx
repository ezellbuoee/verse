import type { ReactElement } from "react";

import { useTheme } from "./theme";

/** Sun / moon switch between the light and the dark look. */
export function ThemeToggle(): ReactElement {
    const { theme, setTheme } = useTheme();
    const dark = theme === "dark";
    return (
        <button
            type="button"
            className="verse-iconbtn"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            title={dark ? "Light mode" : "Dark mode"}
            onClick={() => setTheme(dark ? "light" : "dark")}>
            <span aria-hidden="true">{dark ? "☀" : "☾"}</span>
        </button>
    );
}

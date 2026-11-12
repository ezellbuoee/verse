import {
    createContext,
    type PropsWithChildren,
    type ReactElement,
    useContext,
    useEffect,
    useMemo,
    useState
} from "react";

export type ThemeName = "light" | "dark";

const THEME_KEY = "theme";

interface ThemeContextType {
    readonly theme: ThemeName;
    readonly setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: "light", setTheme: () => undefined });

/** The stored choice, else the system colour scheme. "Verse"/"VerseDark" are the values older versions stored. */
function initialTheme(): ThemeName {
    let stored: string | null = null;
    try {
        stored = localStorage.getItem(THEME_KEY);
    } catch {
        // private mode
    }
    if (stored === "dark" || stored === "VerseDark") {
        return "dark";
    }
    if (stored === "light" || stored === "Verse") {
        return "light";
    }
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Light or dark look; plain CSS reads it from <html data-theme="…"> (see verse.css). */
export function ThemeProvider({ children }: PropsWithChildren): ReactElement {
    const [theme, setThemeState] = useState<ThemeName>(initialTheme);

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
    }, [theme]);

    const value = useMemo<ThemeContextType>(
        () => ({
            theme,
            setTheme: (next) => {
                setThemeState(next);
                try {
                    localStorage.setItem(THEME_KEY, next);
                } catch {
                    // private mode: the choice just does not persist
                }
            }
        }),
        [theme]
    );
    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextType {
    return useContext(ThemeContext);
}

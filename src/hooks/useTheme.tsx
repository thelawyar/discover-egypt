import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "durtown:theme";

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  mode: "system",
  isDark: false,
  setMode: () => {},
  toggle: () => {},
});

/**
 * Inline script applied before hydration so the saved preference never flashes.
 * Kept in sync with STORAGE_KEY above.
 */
export const themeBootstrapScript = `(function(){try{var m=localStorage.getItem('${STORAGE_KEY}')||'system';var d=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

function systemPrefersDark() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply(mode: ThemeMode) {
  const dark = mode === "dark" || (mode === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  return dark;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [isDark, setIsDark] = useState(false);

  // Read the stored preference after hydration to avoid SSR mismatches.
  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? "system";
    setModeState(stored);
    setIsDark(apply(stored));
  }, []);

  // Follow the OS when the user chose "system".
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setIsDark(apply("system"));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, next);
    setModeState(next);
    setIsDark(apply(next));
  }, []);

  const toggle = useCallback(() => {
    setMode(
      (document.documentElement.classList.contains("dark") ? "light" : "dark") as ThemeMode,
    );
  }, [setMode]);

  return (
    <ThemeContext.Provider value={{ mode, isDark, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

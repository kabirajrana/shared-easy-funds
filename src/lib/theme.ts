export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "sajha.theme";

export function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") return;

  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function saveTheme(theme: ThemeMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
}

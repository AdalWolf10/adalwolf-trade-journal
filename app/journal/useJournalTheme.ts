"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type ThemeMode = "dark" | "light";

const themeStorageKey = "adalwolf-journal-theme";
const themeChangedEvent = "adalwolf-journal-theme-change";

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "dark" || value === "light";
}

function preferredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }

  const storedTheme = window.localStorage.getItem(themeStorageKey);
  if (isThemeMode(storedTheme)) {
    return storedTheme;
  }

  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function subscribeToThemeChange(onChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("storage", onChange);
  window.addEventListener(themeChangedEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(themeChangedEvent, onChange);
  };
}

export function useJournalTheme() {
  const theme = useSyncExternalStore(subscribeToThemeChange, preferredTheme, () => "dark");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    window.localStorage.setItem(themeStorageKey, nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.dispatchEvent(new Event(themeChangedEvent));
  }, []);

  const toggleTheme = useCallback(() => {
    const nextTheme = preferredTheme() === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  }, [setTheme]);

  return { setTheme, theme, toggleTheme };
}

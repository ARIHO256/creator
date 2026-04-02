import { describe, expect, it } from "vitest";
import {
  applyResolvedThemeToDocument,
  readThemeModeFromStorage,
  resolveThemeMode,
} from "./themeMode";

describe("resolveThemeMode", () => {
  it("returns explicit light mode unchanged", () => {
    expect(resolveThemeMode("light", true)).toBe("light");
    expect(resolveThemeMode("light", false)).toBe("light");
  });

  it("returns explicit dark mode unchanged", () => {
    expect(resolveThemeMode("dark", true)).toBe("dark");
    expect(resolveThemeMode("dark", false)).toBe("dark");
  });

  it("resolves system mode from prefers-color-scheme", () => {
    expect(resolveThemeMode("system", true)).toBe("dark");
    expect(resolveThemeMode("system", false)).toBe("light");
  });

  it("falls back to legacy storage when current key is invalid", () => {
    localStorage.clear();
    localStorage.setItem("theme_mode", "unexpected");
    localStorage.setItem("evzone_supplierhub_theme_mode_v1", "\"dark\"");

    expect(readThemeModeFromStorage(localStorage)).toBe("dark");
  });
});

describe("applyResolvedThemeToDocument", () => {
  it("applies dark class, color scheme, and css variables", () => {
    const root = document.createElement("html");
    applyResolvedThemeToDocument("dark", root);

    expect(root.classList.contains("dark")).toBe(true);
    expect(root.style.colorScheme).toBe("dark");
    expect(root.getAttribute("data-shell-theme")).toBe("dark");
    expect(root.style.getPropertyValue("--bg-default")).toBeTruthy();
  });
});

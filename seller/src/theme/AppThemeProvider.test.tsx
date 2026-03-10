import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { AppBar, Button, Card } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppThemeProvider } from "./AppThemeProvider";
import { useThemeMode } from "./themeMode";

type MatchMediaController = {
  setMatches: (matches: boolean) => void;
};

function installMatchMedia(initialMatches: boolean): MatchMediaController {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mediaQueryList = {
    matches: initialMatches,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: (event: string, listener: (event: MediaQueryListEvent) => void) => {
      if (event === "change") listeners.add(listener);
    },
    removeEventListener: (event: string, listener: (event: MediaQueryListEvent) => void) => {
      if (event === "change") listeners.delete(listener);
    },
    addListener: (listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    },
    removeListener: (listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    },
    dispatchEvent: () => true,
  } as MediaQueryList;

  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation(() => mediaQueryList)
  );

  return {
    setMatches: (matches: boolean) => {
      (mediaQueryList as { matches: boolean }).matches = matches;
      const event = { matches, media: mediaQueryList.media } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    },
  };
}

function ThemeProbe() {
  const { mode, resolvedMode, toggleMode } = useThemeMode();
  const theme = useTheme();

  return (
    <div>
      <div data-testid="mode">{mode}</div>
      <div data-testid="resolved-mode">{resolvedMode}</div>
      <div data-testid="mui-mode">{theme.palette.mode}</div>
      <button type="button" onClick={toggleMode}>
        Toggle Theme
      </button>
      <Button variant="contained">MUI Button</Button>
      <Card>MUI Card</Card>
      <AppBar position="static">MUI AppBar</AppBar>
      <div data-testid="tailwind-probe" className="bg-white dark:bg-slate-900">
        Tailwind probe
      </div>
    </div>
  );
}

describe("AppThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "";
    document.documentElement.removeAttribute("data-shell-theme");
  });

  it("defaults to system mode and applies system dark preference on first load", () => {
    installMatchMedia(true);

    render(
      <AppThemeProvider>
        <ThemeProbe />
      </AppThemeProvider>
    );

    expect(screen.getByTestId("mode").textContent).toBe("system");
    expect(screen.getByTestId("resolved-mode").textContent).toBe("dark");
    expect(screen.getByTestId("mui-mode").textContent).toBe("dark");
    expect(localStorage.getItem("theme_mode")).toBe("system");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-shell-theme")).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(screen.getByRole("button", { name: "MUI Button" })).toBeTruthy();
    expect(screen.getByText("MUI Card")).toBeTruthy();
    expect(screen.getByText("MUI AppBar")).toBeTruthy();
  });

  it("toggle updates MUI mode, Tailwind dark class, and persistence", () => {
    installMatchMedia(true);

    render(
      <AppThemeProvider>
        <ThemeProbe />
      </AppThemeProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Toggle Theme" }));

    expect(screen.getByTestId("mode").textContent).toBe("light");
    expect(screen.getByTestId("resolved-mode").textContent).toBe("light");
    expect(screen.getByTestId("mui-mode").textContent).toBe("light");
    expect(localStorage.getItem("theme_mode")).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.getAttribute("data-shell-theme")).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("reacts to system changes only when mode is system", () => {
    const media = installMatchMedia(false);

    render(
      <AppThemeProvider>
        <ThemeProbe />
      </AppThemeProvider>
    );

    expect(screen.getByTestId("mode").textContent).toBe("system");
    expect(screen.getByTestId("resolved-mode").textContent).toBe("light");

    act(() => {
      media.setMatches(true);
    });

    expect(screen.getByTestId("resolved-mode").textContent).toBe("dark");
    expect(screen.getByTestId("mui-mode").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Toggle Theme" }));

    expect(screen.getByTestId("mode").textContent).toBe("light");
    expect(screen.getByTestId("resolved-mode").textContent).toBe("light");

    act(() => {
      media.setMatches(false);
    });

    expect(screen.getByTestId("resolved-mode").textContent).toBe("light");
    expect(screen.getByTestId("mui-mode").textContent).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

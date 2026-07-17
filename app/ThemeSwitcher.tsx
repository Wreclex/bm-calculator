"use client";

import { useSyncExternalStore } from "react";

type Theme = "warm" | "business" | "dark";

const THEMES: { id: Theme; label: string; dot: string }[] = [
  { id: "warm", label: "Тёплая", dot: "#C2703D" },
  { id: "business", label: "Деловая", dot: "#0071E3" },
  { id: "dark", label: "Тёмная", dot: "#3A3532" },
];

/* Тема живёт в DOM (data-theme на <html>) и localStorage — т.е. во внешней
   системе. Читаем её через useSyncExternalStore: это каноничный способ React
   подписываться на внешние системы (и он проходит строгие правила линтера). */

const EVENT = "bm-theme-change";

function applyDomTheme(t: Theme) {
  if (t === "warm") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = t;
  }
  try {
    localStorage.setItem("bm-theme", t);
  } catch {
    /* приватный режим — просто не запоминаем */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

function getSnapshot(): Theme {
  const t = document.documentElement.dataset.theme;
  return t === "business" || t === "dark" ? t : "warm";
}

function getServerSnapshot(): Theme {
  return "warm";
}

/** Переключатель палитры: пишет data-theme на <html> и запоминает выбор. */
export default function ThemeSwitcher() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div
      role="group"
      aria-label="Цветовая тема"
      suppressHydrationWarning
      className="inline-flex items-center gap-1 rounded-xl border border-sand-dark bg-card p-1 shadow-sm"
    >
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => applyDomTheme(t.id)}
          title={t.label}
          aria-pressed={theme === t.id}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
            theme === t.id
              ? "bg-terra-50 text-terra-dark ring-1 ring-terra-100"
              : "text-taupe hover:bg-terra-50/60 hover:text-cocoa-soft"
          }`}
        >
          <span
            className="h-3 w-3 rounded-full ring-1 ring-black/10"
            style={{ background: t.dot }}
          />
          <span className="hidden md:inline">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

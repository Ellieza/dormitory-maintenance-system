"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("dms-theme") as "light" | "dark" | null;
    const initial = saved ?? "light";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
    setMounted(true);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("dms-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  if (!mounted) return null;

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="fixed top-4 right-4 z-50 w-10 h-10 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 shadow-sm hover:shadow-md transition-all"
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Moon className="w-4 h-4" />
      )}
    </button>
  );
}
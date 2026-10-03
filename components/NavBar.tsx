"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Building2, LogOut, LayoutDashboard, Sun, Moon } from "lucide-react";

export default function NavBar() {
  const [email, setEmail] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const router = useRouter();
  const pathname = usePathname();

  // Re-sync theme from localStorage on every route change
  // This keeps the NavBar in lockstep with the floating ThemeToggle
  useEffect(() => {
    const saved = localStorage.getItem("dms-theme") as "light" | "dark" | null;
    const initial = saved ?? "light";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, [pathname]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("dms-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setEmail(null);
        setFullName(null);
        setLoading(false);
        return;
      }

      setEmail(user.email ?? null);
      const { data } = await supabase
        .from("users")
        .select("full_name")
        .eq("user_id", user.id)
        .single();
      setFullName(data?.full_name ?? null);
      setLoading(false);
    }
    load();
  }, [pathname]);

  async function handleLogout() {
    localStorage.removeItem("dms-theme");
    document.documentElement.classList.remove("dark");
    setTheme("light");

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const isAuthPage =
    pathname === "/" || pathname === "/login" || pathname === "/signup";
  if (isAuthPage) return null;

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-slate-700/60 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-blue-600 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:shadow-lg group-hover:shadow-indigo-500/40 transition-all group-hover:scale-105">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
              DMS
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              PNGUoT
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={
              theme === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          {!loading && email && (
            <>
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>

              <div className="hidden md:block text-right pl-3 border-l border-slate-200 dark:border-slate-700">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200 leading-tight">
                  {fullName}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  {email}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Building2, LogOut, LayoutDashboard } from "lucide-react";

export default function NavBar() {
  const [email, setEmail] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

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
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  // Hide nav on auth pages (home, login, signup)
  const isAuthPage =
    pathname === "/" || pathname === "/login" || pathname === "/signup";
  if (isAuthPage) return null;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-800 leading-tight">
              DMS
            </p>
            <p className="text-[10px] text-slate-500 leading-tight">PNGUoT</p>
          </div>
        </Link>

        {!loading && email && (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>

            <div className="hidden md:block text-right pl-3 border-l border-slate-200">
              <p className="text-xs font-medium text-slate-700 leading-tight">
                {fullName}
              </p>
              <p className="text-[10px] text-slate-500 leading-tight">
                {email}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
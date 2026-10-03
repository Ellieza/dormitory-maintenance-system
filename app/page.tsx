import Link from "next/link";
import { Building2, ArrowRight, Wrench, Sparkles } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      <ThemeToggle />

      {/* Floating decorative shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-16 w-72 h-72 rounded-full bg-gradient-to-br from-indigo-400/20 to-blue-400/20 blur-3xl animate-float" />
        <div
          className="absolute bottom-1/4 -right-16 w-80 h-80 rounded-full bg-gradient-to-br from-purple-400/20 to-pink-400/20 blur-3xl animate-float"
          style={{ animationDelay: "1.5s" }}
        />
        <div
          className="absolute top-1/3 right-1/3 w-40 h-40 rounded-full bg-gradient-to-br from-blue-400/20 to-cyan-400/20 blur-2xl animate-pulse-glow"
          style={{ animationDelay: "0.5s" }}
        />
      </div>

      <div className="relative text-center max-w-lg animate-fade-in">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-blue-600 flex items-center justify-center shadow-xl shadow-indigo-500/30 animate-float">
          <Building2 className="w-10 h-10 text-white" />
        </div>

        <div className="inline-flex items-center gap-2 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/60 rounded-full px-4 py-1.5 mb-5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Dormitory Maintenance System
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 dark:text-slate-100 mb-4 tracking-tight leading-tight">
          Report. Track.
          <br />
          <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-600 dark:from-indigo-400 dark:via-purple-400 dark:to-blue-400 bg-clip-text text-transparent animate-gradient">
            Resolve.
          </span>
        </h1>

        <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
          PNG University of Technology
        </p>

        <p className="text-sm text-slate-500 dark:text-slate-400 mb-10 max-w-md mx-auto leading-relaxed">
          Report maintenance issues in your dormitory — plumbing, electrical,
          pest control and more — with fast-track alerts for critical issues.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-blue-700 font-medium shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all"
          >
            Log In
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-300/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 px-6 py-3 rounded-xl hover:bg-white dark:hover:bg-slate-800 font-medium shadow-sm hover:shadow-md transition-all"
          >
            Sign Up
          </Link>
        </div>

        <div className="flex items-center justify-center gap-6 mt-12 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5" />
            <span>5 user roles</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-400" />
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fast-track alerts</span>
          </div>
        </div>
      </div>
    </main>
  );
}
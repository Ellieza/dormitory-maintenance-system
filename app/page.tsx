import Link from "next/link";
import { Building2, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-lg animate-fade-in">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Building2 className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-3 tracking-tight">
          Dormitory Maintenance System
        </h1>

        <p className="text-lg text-slate-600 mb-6">
          PNG University of Technology
        </p>

        <p className="text-sm text-slate-500 mb-10 max-w-md mx-auto leading-relaxed">
          Report and track maintenance issues in your dormitory — plumbing,
          electrical, pest control and more — with fast-track alerts for
          critical issues.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="group inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 font-medium shadow-sm hover:shadow-md transition-all"
          >
            Log In
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center bg-white border border-slate-300 text-slate-700 px-6 py-3 rounded-xl hover:bg-slate-50 font-medium shadow-sm hover:shadow-md transition-all"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  );
}
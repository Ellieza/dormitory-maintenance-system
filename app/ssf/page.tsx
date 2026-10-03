"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Attachments from "@/components/Attachments";
import {
  BarChart3,
  ArrowLeft,
  FileText,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Calendar,
} from "lucide-react";

type RequestRow = {
  request_id: string;
  description: string;
  status: string;
  urgency_level: string;
  is_fast_track: boolean;
  date_reported: string;
  date_resolved: string | null;
  student: { full_name: string; contact_number: string | null } | null;
  dormitory: { name: string } | null;
  category: { category_name: string } | null;
};

type Stat = { name: string; count: number };

const statusColor: Record<string, string> = {
  submitted:
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  confirmed:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50",
  approved:
    "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50",
  in_progress:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50",
  resolved:
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50",
};

const statusLabel: Record<string, string> = {
  submitted: "Submitted",
  confirmed: "Confirmed",
  approved: "Approved",
  in_progress: "In Progress",
  resolved: "Resolved",
};

function computeStats(
  requests: RequestRow[],
  key: "category" | "dormitory"
): Stat[] {
  const counts: Record<string, number> = {};
  for (const r of requests) {
    const name =
      key === "category"
        ? r.category?.category_name ?? "Unknown"
        : r.dormitory?.name ?? "Unknown dorm";
    counts[name] = (counts[name] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export default function SSFStatsPage() {
  const [all, setAll] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!profile || profile.role !== "ssf") {
        setError("This page is only for Student Support & Facilities");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("maintenance_request")
        .select(
          "request_id, description, status, urgency_level, is_fast_track, date_reported, date_resolved, student:student_id (full_name, contact_number), dormitory:dormitory_id (name), category:category_id (category_name)"
        )
        .order("date_reported", { ascending: false })
        .limit(500);

      if (fetchError) setError(fetchError.message);
      else if (data) setAll(data as unknown as RequestRow[]);
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-500 dark:text-slate-400 text-sm">
          Loading...
        </div>
      </main>
    );
  }

  const total = all.length;
  const resolvedCount = all.filter((r) => r.status === "resolved").length;
  const activeCount = total - resolvedCount;
  const criticalActive = all.filter(
    (r) =>
      (r.is_fast_track || r.urgency_level === "critical") &&
      r.status !== "resolved"
  ).length;

  const categoryStats = computeStats(all, "category");
  const dormStats = computeStats(all, "dormitory");
  const maxCategory = Math.max(...categoryStats.map((s) => s.count), 1);
  const maxDorm = Math.max(...dormStats.map((s) => s.count), 1);

  const uniqueCategories = Array.from(
    new Set(all.map((r) => r.category?.category_name ?? "Unknown"))
  );

  const filteredReports = all.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (
      categoryFilter !== "all" &&
      (r.category?.category_name ?? "Unknown") !== categoryFilter
    )
      return false;
    return true;
  });

  const selectClass =
    "text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500";

  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="max-w-5xl mx-auto animate-fade-in">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                SSF — Overview & Statistics
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                All reports across every dormitory — for maintenance planning
              </p>
            </div>
          </div>
          <Link
            href="/ssf/yearly"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-2 rounded-xl hover:from-indigo-700 hover:to-blue-700 font-medium text-sm shadow-lg shadow-indigo-500/20 hover:shadow-xl transition-all"
          >
            <Calendar className="w-4 h-4" />
            Annual Report
          </Link>
        </div>

        {error && (
          <div className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-4 border-l-4 border-l-blue-500">
            <div className="flex items-center gap-1.5 mb-1">
              <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                TOTAL REPORTS
              </p>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {total}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-4 border-l-4 border-l-amber-500">
            <div className="flex items-center gap-1.5 mb-1">
              <Activity className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                ACTIVE
              </p>
            </div>
            <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">
              {activeCount}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-4 border-l-4 border-l-emerald-500">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                RESOLVED
              </p>
            </div>
            <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
              {resolvedCount}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-4 border-l-4 border-l-red-500">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                CRITICAL ACTIVE
              </p>
            </div>
            <p className="text-3xl font-bold text-red-700 dark:text-red-400">
              {criticalActive}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Reports by Category
            </h2>
            {categoryStats.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No data yet.
              </p>
            ) : (
              <div className="space-y-3">
                {categoryStats.map((s) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="w-24 text-sm text-slate-700 dark:text-slate-300 capitalize truncate">
                      {s.name}
                    </span>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-lg h-5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-blue-500 h-full rounded-lg"
                        style={{
                          width: `${(s.count / maxCategory) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-8 text-sm text-slate-700 dark:text-slate-300 text-right font-semibold">
                      {s.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Reports by Dormitory (top 10)
            </h2>
            {dormStats.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No data yet.
              </p>
            ) : (
              <div className="space-y-3">
                {dormStats.slice(0, 10).map((s) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="w-32 text-sm text-slate-700 dark:text-slate-300 truncate">
                      {s.name}
                    </span>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-lg h-5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-lg"
                        style={{
                          width: `${(s.count / maxDorm) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-8 text-sm text-slate-700 dark:text-slate-300 text-right font-semibold">
                      {s.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            All Reports ({filteredReports.length})
          </h2>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={selectClass}
            >
              <option value="all">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="confirmed">Confirmed</option>
              <option value="approved">Approved</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`${selectClass} capitalize`}
            >
              <option value="all">All categories</option>
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredReports.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-8 text-center">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              No reports match the current filter.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredReports.map((r) => (
              <div
                key={r.request_id}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-4"
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 capitalize">
                    {r.category?.category_name ?? "Unknown"}
                  </span>
                  <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                    {r.dormitory?.name ?? "Unknown dorm"}
                  </span>
                  {r.is_fast_track && (
                    <span className="text-xs bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-md font-medium">
                      FAST-TRACK
                    </span>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-md font-medium border ${
                      statusColor[r.status] ??
                      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                    }`}
                  >
                    {statusLabel[r.status] ?? r.status}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {r.urgency_level.toUpperCase()}
                  </span>
                </div>
                <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
                  {r.description}
                </p>
                <Attachments requestId={r.request_id} />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  By {r.student?.full_name ?? "Unknown"} ·{" "}
                  {new Date(r.date_reported).toLocaleDateString()}
                  {r.date_resolved &&
                    ` · ✅ resolved ${new Date(
                      r.date_resolved
                    ).toLocaleDateString()}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
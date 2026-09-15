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
  submitted: "bg-slate-100 text-slate-700 border-slate-200",
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  approved: "bg-indigo-100 text-indigo-700 border-indigo-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  resolved: "bg-emerald-100 text-emerald-700 border-emerald-200",
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
        <div className="animate-pulse text-slate-500 text-sm">Loading...</div>
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

  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="max-w-5xl mx-auto animate-fade-in">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-indigo-600 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              SSF — Overview & Statistics
            </h1>
            <p className="text-sm text-slate-500">
              All reports across every dormitory — for maintenance planning
            </p>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4 border-l-4 border-l-blue-500">
            <div className="flex items-center gap-1.5 mb-1">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <p className="text-xs text-slate-500 font-medium">
                TOTAL REPORTS
              </p>
            </div>
            <p className="text-3xl font-bold text-slate-900">{total}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4 border-l-4 border-l-amber-500">
            <div className="flex items-center gap-1.5 mb-1">
              <Activity className="w-3.5 h-3.5 text-amber-600" />
              <p className="text-xs text-slate-500 font-medium">ACTIVE</p>
            </div>
            <p className="text-3xl font-bold text-amber-700">{activeCount}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4 border-l-4 border-l-emerald-500">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <p className="text-xs text-slate-500 font-medium">RESOLVED</p>
            </div>
            <p className="text-3xl font-bold text-emerald-700">
              {resolvedCount}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4 border-l-4 border-l-red-500">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              <p className="text-xs text-slate-500 font-medium">
                CRITICAL ACTIVE
              </p>
            </div>
            <p className="text-3xl font-bold text-red-700">{criticalActive}</p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              Reports by Category
            </h2>
            {categoryStats.length === 0 ? (
              <p className="text-sm text-slate-500">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {categoryStats.map((s) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="w-24 text-sm text-slate-700 capitalize truncate">
                      {s.name}
                    </span>
                    <div className="flex-1 bg-slate-100 rounded-lg h-5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-blue-500 h-full transition-all rounded-lg"
                        style={{
                          width: `${(s.count / maxCategory) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <span className="w-8 text-sm text-slate-700 text-right font-semibold">
                      {s.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              Reports by Dormitory (top 10)
            </h2>
            {dormStats.length === 0 ? (
              <p className="text-sm text-slate-500">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {dormStats.slice(0, 10).map((s) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="w-32 text-sm text-slate-700 truncate">
                      {s.name}
                    </span>
                    <div className="flex-1 bg-slate-100 rounded-lg h-5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all rounded-lg"
                        style={{
                          width: `${(s.count / maxDorm) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <span className="w-8 text-sm text-slate-700 text-right font-semibold">
                      {s.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* All Reports */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            All Reports ({filteredReports.length})
          </h2>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
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
              className="text-sm border border-slate-300 rounded-xl px-3 py-1.5 capitalize focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
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
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8 text-center">
            <p className="text-slate-500 text-sm">
              No reports match the current filter.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredReports.map((r) => (
              <div
                key={r.request_id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4"
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs font-medium text-slate-500 capitalize">
                    {r.category?.category_name ?? "Unknown"}
                  </span>
                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                    {r.dormitory?.name ?? "Unknown dorm"}
                  </span>
                  {r.is_fast_track && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-md font-medium">
                      FAST-TRACK
                    </span>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-md font-medium border ${
                      statusColor[r.status] ??
                      "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {statusLabel[r.status] ?? r.status}
                  </span>
                  <span className="text-xs text-slate-400">
                    {r.urgency_level.toUpperCase()}
                  </span>
                </div>
                <p className="text-slate-800 text-sm leading-relaxed">
                  {r.description}
                </p>
                <Attachments requestId={r.request_id} />
                <p className="text-xs text-slate-500 mt-2">
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
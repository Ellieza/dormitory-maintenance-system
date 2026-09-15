"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Attachments from "@/components/Attachments";
import Link from "next/link";

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
  submitted: "bg-gray-100 text-gray-800",
  confirmed: "bg-blue-100 text-blue-800",
  approved: "bg-indigo-100 text-indigo-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
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

export default function SSFPage() {
  const [all, setAll] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const router = useRouter();

  async function loadRequests() {
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

    const selectFields =
      "request_id, description, status, urgency_level, is_fast_track, date_reported, date_resolved, student:student_id (full_name, contact_number), dormitory:dormitory_id (name), category:category_id (category_name)";

    // Fetch ALL reports — SSF has full visibility
    const { data, error: fetchError } = await supabase
      .from("maintenance_request")
      .select(selectFields)
      .order("date_reported", { ascending: false })
      .limit(500);

    if (fetchError) {
      setError(fetchError.message);
    } else if (data) {
      setAll(data as unknown as RequestRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-gray-600">Loading...</p>
      </main>
    );
  }

  // ============ Computed stats ============
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

  const activeCriticalReports = all.filter(
    (r) =>
      (r.is_fast_track || r.urgency_level === "critical") &&
      r.status !== "resolved"
  );

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
    <main className="min-h-screen bg-blue-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-900">
              SSF — Overview & Statistics
            </h1>
            <p className="text-sm text-gray-500">
              All reports across every dormitory — for maintenance planning
            </p>
          </div>
          <Link
            href="/ssf"
            className="bg-white border border-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-50 font-medium text-sm"
          >
            ← Back to Active Reports
          </Link>
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 p-3 rounded mb-4">
            {error}
          </p>
        )}

        {/* ============ SUMMARY CARDS ============ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-l-blue-500">
            <p className="text-xs text-gray-500 font-medium">TOTAL REPORTS</p>
            <p className="text-3xl font-bold text-blue-900">{total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-l-yellow-500">
            <p className="text-xs text-gray-500 font-medium">ACTIVE</p>
            <p className="text-3xl font-bold text-yellow-700">{activeCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-l-green-500">
            <p className="text-xs text-gray-500 font-medium">RESOLVED</p>
            <p className="text-3xl font-bold text-green-700">
              {resolvedCount}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-l-red-500">
            <p className="text-xs text-gray-500 font-medium">CRITICAL ACTIVE</p>
            <p className="text-3xl font-bold text-red-700">{criticalActive}</p>
          </div>
        </div>

        {/* ============ CATEGORY + DORM BREAKDOWN ============ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Category frequency */}
          <div className="bg-white rounded-lg shadow-sm p-5">
            <h2 className="text-lg font-semibold text-blue-900 mb-4">
              Reports by Category
            </h2>
            {categoryStats.length === 0 ? (
              <p className="text-sm text-gray-500">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {categoryStats.map((s) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="w-24 text-sm text-gray-700 capitalize truncate">
                      {s.name}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded h-5 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full transition-all"
                        style={{
                          width: `${(s.count / maxCategory) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <span className="w-8 text-sm text-gray-700 text-right font-medium">
                      {s.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dorm frequency */}
          <div className="bg-white rounded-lg shadow-sm p-5">
            <h2 className="text-lg font-semibold text-blue-900 mb-4">
              Reports by Dormitory (top 10)
            </h2>
            {dormStats.length === 0 ? (
              <p className="text-sm text-gray-500">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {dormStats.slice(0, 10).map((s) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="w-32 text-sm text-gray-700 truncate">
                      {s.name}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded h-5 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full transition-all"
                        style={{
                          width: `${(s.count / maxDorm) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <span className="w-8 text-sm text-gray-700 text-right font-medium">
                      {s.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ============ CRITICAL ALERTS ============ */}
        <h2 className="text-lg font-semibold text-red-700 mb-3">
          🚨 Active Critical Alerts ({activeCriticalReports.length})
        </h2>
        {activeCriticalReports.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center mb-8">
            <p className="text-gray-500 text-sm">
              ✅ No active critical alerts. All clear.
            </p>
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {activeCriticalReports.map((r) => (
              <div
                key={r.request_id}
                className="bg-white rounded-lg shadow-sm p-5 border-l-4 border-l-red-500"
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-500 capitalize">
                    {r.category?.category_name ?? "Unknown"}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                    {r.dormitory?.name ?? "Unknown dorm"}
                  </span>
                  {r.is_fast_track && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                      FAST-TRACK
                    </span>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${
                      statusColor[r.status] ?? "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {r.status.replace("_", " ").toUpperCase()}
                  </span>
                </div>
                <p className="text-gray-800 mb-3">{r.description}</p>
                <Attachments requestId={r.request_id} />
                <div className="text-xs text-gray-500 space-y-1">
                  <p>
                    Reported by{" "}
                    <strong>{r.student?.full_name ?? "Unknown"}</strong>
                    {r.student?.contact_number &&
                      ` · ${r.student.contact_number}`}
                  </p>
                  <p>{new Date(r.date_reported).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ============ ALL REPORTS WITH FILTERS ============ */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <h2 className="text-lg font-semibold text-blue-900">
            All Reports ({filteredReports.length})
          </h2>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
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
              className="text-sm border border-gray-300 rounded px-2 py-1 capitalize"
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
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-500 text-sm">
              No reports match the current filter.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredReports.map((r) => (
              <div
                key={r.request_id}
                className="bg-white rounded-lg shadow-sm p-4 border border-gray-100"
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs font-medium text-gray-500 capitalize">
                    {r.category?.category_name ?? "Unknown"}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                    {r.dormitory?.name ?? "Unknown dorm"}
                  </span>
                  {r.is_fast_track && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                      FAST-TRACK
                    </span>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${
                      statusColor[r.status] ?? "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {r.status.replace("_", " ").toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-400">
                    {r.urgency_level.toUpperCase()}
                  </span>
                </div>
                <p className="text-gray-800 text-sm">{r.description}</p>
                <Attachments requestId={r.request_id} />
                <p className="text-xs text-gray-500 mt-2">
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
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Attachments from "@/components/Attachments";

type RequestRow = {
  request_id: string;
  description: string;
  status: string;
  urgency_level: string;
  is_fast_track: boolean;
  date_reported: string;
  student: { full_name: string; contact_number: string | null } | null;
  dormitory: { name: string } | null;
  category: { category_name: string } | null;
};

const statusColor: Record<string, string> = {
  submitted: "bg-gray-100 text-gray-800",
  confirmed: "bg-blue-100 text-blue-800",
  approved: "bg-indigo-100 text-indigo-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
};

const urgencyOrder: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export default function SSFAlertsPage() {
  const [active, setActive] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
          "request_id, description, status, urgency_level, is_fast_track, date_reported, student:student_id (full_name, contact_number), dormitory:dormitory_id (name), category:category_id (category_name)"
        )
        .neq("status", "resolved")
        .order("date_reported", { ascending: false })
        .limit(200);

      if (fetchError) {
        setError(fetchError.message);
      } else if (data) {
        const rows = (data as unknown as RequestRow[]).sort((a, b) => {
          if (a.is_fast_track && !b.is_fast_track) return -1;
          if (!a.is_fast_track && b.is_fast_track) return 1;
          const uDiff =
            (urgencyOrder[a.urgency_level] ?? 99) -
            (urgencyOrder[b.urgency_level] ?? 99);
          if (uDiff !== 0) return uDiff;
          return (
            new Date(b.date_reported).getTime() -
            new Date(a.date_reported).getTime()
          );
        });
        setActive(rows);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-gray-600">Loading...</p>
      </main>
    );
  }

  const criticalCount = active.filter(
    (r) => r.is_fast_track || r.urgency_level === "critical"
  ).length;

  return (
    <main className="min-h-screen bg-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-900">
              SSF — Active Reports
            </h1>
            <p className="text-sm text-gray-500">
              All unresolved reports across every dormitory
            </p>
          </div>
          <Link
            href="/ssf/stats"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium text-sm"
          >
            📊 View Statistics
          </Link>
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 p-3 rounded mb-4">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-l-yellow-500">
            <p className="text-xs text-gray-500 font-medium">ACTIVE REPORTS</p>
            <p className="text-3xl font-bold text-yellow-700">
              {active.length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-l-red-500">
            <p className="text-xs text-gray-500 font-medium">
              CRITICAL / FAST-TRACK
            </p>
            <p className="text-3xl font-bold text-red-700">{criticalCount}</p>
          </div>
        </div>

        {active.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500">
              ✅ No active reports. All caught up.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((r) => {
              const isCritical =
                r.is_fast_track || r.urgency_level === "critical";
              return (
                <div
                  key={r.request_id}
                  className={`bg-white rounded-lg shadow-sm p-5 border-l-4 ${
                    isCritical
                      ? "border-l-red-500"
                      : r.urgency_level === "high"
                      ? "border-l-orange-400"
                      : r.urgency_level === "medium"
                      ? "border-l-blue-400"
                      : "border-l-gray-300"
                  }`}
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
                    <span className="text-xs text-gray-400">
                      {r.urgency_level.toUpperCase()}
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
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
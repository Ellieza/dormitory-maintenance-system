"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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

const statusColor: Record<string, string> = {
  submitted: "bg-gray-100 text-gray-800",
  confirmed: "bg-blue-100 text-blue-800",
  approved: "bg-indigo-100 text-indigo-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
};

export default function SSFPage() {
  const [active, setActive] = useState<RequestRow[]>([]);
  const [resolved, setResolved] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

    // Show all fast-track (pest) or critical requests
    const { data, error: fetchError } = await supabase
      .from("maintenance_request")
      .select(selectFields)
      .or("is_fast_track.eq.true,urgency_level.eq.critical")
      .order("date_reported", { ascending: false })
      .limit(100);

    if (fetchError) {
      setError(fetchError.message);
    } else if (data) {
      const rows = data as unknown as RequestRow[];
      setActive(
        rows.filter(
          (r) =>
            r.status !== "resolved" &&
            r.status !== "approved" &&
            r.status !== "in_progress"
        )
      );
      // Also include in-progress in "active" bucket — SSF wants to see the whole picture
      setActive(
        rows.filter((r) => r.status !== "resolved")
      );
      setResolved(rows.filter((r) => r.status === "resolved"));
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

  return (
    <main className="min-h-screen bg-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-blue-900">
            Critical Alerts — SSF
          </h1>
          <p className="text-sm text-gray-500">
            All fast-track and critical requests across all dormitories
          </p>
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 p-3 rounded mb-4">
            {error}
          </p>
        )}

        {/* ============ Active Alerts ============ */}
        <h2 className="text-lg font-semibold text-blue-900 mb-3">
          Active Alerts ({active.length})
        </h2>
        {active.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center mb-8">
            <p className="text-gray-500 text-sm">
              ✅ No active critical alerts. All clear.
            </p>
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {active.map((r) => (
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

                <div className="text-xs text-gray-500 space-y-1">
                  <p>
                    Reported by{" "}
                    <strong>{r.student?.full_name ?? "Unknown"}</strong>
                    {r.student?.contact_number &&
                      ` · ${r.student.contact_number}`}
                  </p>
                  <p>
                    {new Date(r.date_reported).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ============ Resolved ============ */}
        <h2 className="text-lg font-semibold text-blue-900 mb-3">
          Resolved ({resolved.length})
        </h2>
        {resolved.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-500 text-sm">None resolved yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {resolved.map((r) => (
              <div
                key={r.request_id}
                className="bg-white rounded-lg shadow-sm p-4 border border-green-100"
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-medium text-gray-500 capitalize">
                    {r.category?.category_name ?? "Unknown"}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                    {r.dormitory?.name ?? "Unknown dorm"}
                  </span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded font-medium">
                    RESOLVED
                  </span>
                </div>
                <p className="text-gray-800 text-sm">{r.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  By {r.student?.full_name ?? "Unknown"}
                  {r.date_resolved &&
                    ` · resolved ${new Date(
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
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Attachments from "@/components/Attachments";

type RequestRow = {
  request_id: string;
  description: string;
  status: string;
  urgency_level: string;
  is_fast_track: boolean;
  date_reported: string;
  approved_at: string | null;
  date_resolved: string | null;
  student: { full_name: string; contact_number: string | null } | null;
  dormitory: { name: string } | null;
  category: { category_name: string } | null;
};

const statusColor: Record<string, string> = {
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

export default function MaintenancePage() {
  const [queue, setQueue] = useState<RequestRow[]>([]);
  const [inProgress, setInProgress] = useState<RequestRow[]>([]);
  const [resolved, setResolved] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function sortRequests(list: RequestRow[]) {
    return [...list].sort((a, b) => {
      if (a.is_fast_track && !b.is_fast_track) return -1;
      if (!a.is_fast_track && b.is_fast_track) return 1;
      return (
        (urgencyOrder[a.urgency_level] ?? 99) -
        (urgencyOrder[b.urgency_level] ?? 99)
      );
    });
  }

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

    if (!profile || profile.role !== "maintenance") {
      setError("This page is only for the Maintenance / Project Team");
      setLoading(false);
      return;
    }

    const selectFields =
      "request_id, description, status, urgency_level, is_fast_track, date_reported, approved_at, date_resolved, student:student_id (full_name, contact_number), dormitory:dormitory_id (name), category:category_id (category_name)";

    const { data, error: fetchError } = await supabase
      .from("maintenance_request")
      .select(selectFields)
      .in("status", ["approved", "in_progress", "resolved"])
      .order("approved_at", { ascending: false })
      .limit(100);

    if (fetchError) {
      setError(fetchError.message);
    } else if (data) {
      const rows = data as unknown as RequestRow[];
      setQueue(sortRequests(rows.filter((r) => r.status === "approved")));
      setInProgress(
        sortRequests(rows.filter((r) => r.status === "in_progress"))
      );
      setResolved(rows.filter((r) => r.status === "resolved"));
    }
    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateStatus(
    requestId: string,
    newStatus: "in_progress" | "resolved",
    fromList: "queue" | "inProgress"
  ) {
    setActionLoading(requestId);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const update: Record<string, unknown> = { status: newStatus };
    if (newStatus === "resolved") {
      update.date_resolved = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("maintenance_request")
      .update(update)
      .eq("request_id", requestId);

    if (updateError) {
      setError(updateError.message);
      setActionLoading(null);
      return;
    }

    const oldStatus = fromList === "queue" ? "approved" : "in_progress";
    await supabase.from("status_update").insert({
      request_id: requestId,
      updated_by: user.id,
      old_status: oldStatus,
      new_status: newStatus,
      notes:
        newStatus === "in_progress"
          ? "Work started by Maintenance"
          : "Marked as resolved by Maintenance",
    });

    // Update local state
    if (fromList === "queue" && newStatus === "in_progress") {
      const moved = queue.find((r) => r.request_id === requestId);
      setQueue((prev) => prev.filter((r) => r.request_id !== requestId));
      if (moved) {
        moved.status = "in_progress";
        setInProgress((prev) => [moved, ...prev]);
      }
    } else if (fromList === "inProgress" && newStatus === "resolved") {
      const moved = inProgress.find((r) => r.request_id === requestId);
      setInProgress((prev) => prev.filter((r) => r.request_id !== requestId));
      if (moved) {
        moved.status = "resolved";
        moved.date_resolved = new Date().toISOString();
        setResolved((prev) => [moved, ...prev]);
      }
    }

    setActionLoading(null);
  }

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
            Maintenance Queue
          </h1>
          <p className="text-sm text-gray-500">
            Prioritized work — fast-track and critical first
          </p>
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 p-3 rounded mb-4">
            {error}
          </p>
        )}

        {/* ============ Queue ============ */}
        <h2 className="text-lg font-semibold text-blue-900 mb-3">
          Waiting for Work ({queue.length})
        </h2>
        {queue.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center mb-8">
            <p className="text-gray-500 text-sm">Queue is empty.</p>
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {queue.map((r) => (
              <div
                key={r.request_id}
                className={`bg-white rounded-lg shadow-sm p-5 border-l-4 ${
                  r.is_fast_track
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
                  <span className="text-xs text-gray-400">
                    {r.urgency_level.toUpperCase()}
                  </span>
                </div>

                <p className="text-gray-800 mb-3">{r.description}</p>
                <Attachments requestId={r.request_id} />

                <p className="text-xs text-gray-500 mb-4">
                  Reported by <strong>{r.student?.full_name ?? "Unknown"}</strong>
                  {r.student?.contact_number &&
                    ` · ${r.student.contact_number}`}
                </p>

                <button
                  onClick={() =>
                    updateStatus(r.request_id, "in_progress", "queue")
                  }
                  disabled={actionLoading === r.request_id}
                  className="w-full bg-yellow-500 text-white py-2 rounded hover:bg-yellow-600 disabled:opacity-50 font-medium text-sm"
                >
                  {actionLoading === r.request_id
                    ? "Updating..."
                    : "▶ Start Work"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ============ In Progress ============ */}
        <h2 className="text-lg font-semibold text-blue-900 mb-3">
          In Progress ({inProgress.length})
        </h2>
        {inProgress.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center mb-8">
            <p className="text-gray-500 text-sm">Nothing in progress.</p>
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {inProgress.map((r) => (
              <div
                key={r.request_id}
                className="bg-white rounded-lg shadow-sm p-5 border border-yellow-200"
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-500 capitalize">
                    {r.category?.category_name ?? "Unknown"}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                    {r.dormitory?.name ?? "Unknown dorm"}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${
                      statusColor[r.status] ?? ""
                    }`}
                  >
                    IN PROGRESS
                  </span>
                </div>
                <p className="text-gray-800 mb-3">{r.description}</p>
                <button
                  onClick={() =>
                    updateStatus(r.request_id, "resolved", "inProgress")
                  }
                  disabled={actionLoading === r.request_id}
                  className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50 font-medium text-sm"
                >
                  {actionLoading === r.request_id
                    ? "Updating..."
                    : "✓ Mark as Resolved"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ============ Resolved ============ */}
        <h2 className="text-lg font-semibold text-blue-900 mb-3">
          Recently Resolved ({resolved.length})
        </h2>
        {resolved.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-500 text-sm">Nothing resolved yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {resolved.slice(0, 10).map((r) => (
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
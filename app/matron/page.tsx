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
  confirmed_at: string | null;
  approved_at: string | null;
  date_resolved: string | null;
  student: { full_name: string; contact_number: string | null } | null;
  dormitory: { name: string } | null;
  category: { category_name: string } | null;
  confirmer: { full_name: string } | null;
};

const statusColor: Record<string, string> = {
  submitted: "bg-gray-100 text-gray-800",
  confirmed: "bg-blue-100 text-blue-800",
  approved: "bg-indigo-100 text-indigo-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
};

export default function MatronPage() {
  const [pending, setPending] = useState<RequestRow[]>([]);
  const [forwarded, setForwarded] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
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

    if (!profile || profile.role !== "matron_patron") {
      setError("This page is only for Dorm Matrons / Patrons");
      setLoading(false);
      return;
    }

    const selectFields =
      "request_id, description, status, urgency_level, is_fast_track, date_reported, confirmed_at, approved_at, date_resolved, student:student_id (full_name, contact_number), dormitory:dormitory_id (name), category:category_id (category_name), confirmer:confirmed_by (full_name)";

    // Pending: confirmed, waiting for approval
    const { data: pendingData, error: pendingErr } = await supabase
      .from("maintenance_request")
      .select(selectFields)
      .eq("status", "confirmed")
      .order("is_fast_track", { ascending: false })
      .order("confirmed_at", { ascending: true });

    // Forwarded: approved or beyond
    const { data: forwardedData, error: forwardedErr } = await supabase
      .from("maintenance_request")
      .select(selectFields)
      .in("status", ["approved", "in_progress", "resolved"])
      .order("approved_at", { ascending: false })
      .limit(50);

    if (pendingErr || forwardedErr) {
      setError((pendingErr || forwardedErr)?.message ?? "Failed to load");
    } else {
      if (pendingData) setPending(pendingData as unknown as RequestRow[]);
      if (forwardedData) setForwarded(forwardedData as unknown as RequestRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleApprove(requestId: string) {
    setActionLoading(requestId);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error: updateError } = await supabase
      .from("maintenance_request")
      .update({
        status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("request_id", requestId);

    if (updateError) {
      setError(updateError.message);
      setActionLoading(null);
      return;
    }

    await supabase.from("status_update").insert({
      request_id: requestId,
      updated_by: user.id,
      old_status: "confirmed",
      new_status: "approved",
      notes: "Approved and forwarded to Maintenance by Matron/Patron",
    });

    // Move it to the forwarded list (locally)
    const moved = pending.find((r) => r.request_id === requestId);
    setPending((prev) => prev.filter((r) => r.request_id !== requestId));
    if (moved) {
      moved.status = "approved";
      moved.approved_at = new Date().toISOString();
      setForwarded((prev) => [moved, ...prev]);
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
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-blue-900">
            Matron / Patron Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            All dorms · confirmed reports awaiting approval, and forwarded ones
          </p>
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 p-3 rounded mb-4">
            {error}
          </p>
        )}

        {/* ============ SECTION 1: Awaiting approval ============ */}
        <h2 className="text-lg font-semibold text-blue-900 mb-3">
          Awaiting Your Approval ({pending.length})
        </h2>

        {pending.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center mb-8">
            <p className="text-gray-500 text-sm">
              ✅ No confirmed reports waiting.
            </p>
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {pending.map((r) => (
              <div
                key={r.request_id}
                className="bg-white rounded-lg shadow-sm p-5 border border-gray-100"
              >
                <div className="flex items-center gap-2 mb-2">
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

                <div className="text-xs text-gray-500 space-y-1 mb-4">
                  <p>
                    Reported by <strong>{r.student?.full_name ?? "Unknown"}</strong>
                    {r.student?.contact_number &&
                      ` · ${r.student.contact_number}`}
                  </p>
                  <p>
                    Confirmed by <strong>{r.confirmer?.full_name ?? "Unknown"}</strong>
                    {r.confirmed_at &&
                      ` · ${new Date(r.confirmed_at).toLocaleString()}`}
                  </p>
                </div>

                <button
                  onClick={() => handleApprove(r.request_id)}
                  disabled={actionLoading === r.request_id}
                  className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
                >
                  {actionLoading === r.request_id
                    ? "Approving..."
                    : "✓ Approve & Forward to Maintenance"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ============ SECTION 2: Forwarded ============ */}
        <h2 className="text-lg font-semibold text-blue-900 mb-3">
          Sent to Maintenance ({forwarded.length})
        </h2>

        {forwarded.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-500 text-sm">
              Nothing has been forwarded to Maintenance yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {forwarded.map((r) => (
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
                </div>
                <p className="text-gray-800 text-sm">{r.description}</p>
                <p className="text-xs text-gray-500 mt-2">
                  By {r.student?.full_name ?? "Unknown"}
                  {r.approved_at &&
                    ` · forwarded ${new Date(r.approved_at).toLocaleDateString()}`}
                  {r.date_resolved &&
                    ` · ✅ resolved ${new Date(r.date_resolved).toLocaleDateString()}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
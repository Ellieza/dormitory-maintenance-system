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
  student: { full_name: string; contact_number: string | null } | null;
  category: { category_name: string } | null;
};

export default function SubWardenPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
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

    // Get this sub-warden's dormitory
    const { data: profile } = await supabase
      .from("users")
      .select("dormitory_id, role")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.role !== "sub_warden") {
      setError("This page is only for Sub-Wardens");
      setLoading(false);
      return;
    }

    // Load requests for their dorm that need confirmation
    const { data, error: fetchError } = await supabase
      .from("maintenance_request")
      .select(
        "request_id, description, status, urgency_level, is_fast_track, date_reported, student:student_id (full_name, contact_number), category:category_id (category_name)"
      )
      .eq("dormitory_id", profile.dormitory_id)
      .eq("status", "submitted")
      .order("is_fast_track", { ascending: false })
      .order("date_reported", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else if (data) {
      setRequests(data as unknown as RequestRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConfirm(requestId: string) {
    setActionLoading(requestId);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // Update the request
    const { error: updateError } = await supabase
      .from("maintenance_request")
      .update({
        status: "confirmed",
        confirmed_by: user.id,
        confirmed_at: new Date().toISOString(),
      })
      .eq("request_id", requestId);

    if (updateError) {
      setError(updateError.message);
      setActionLoading(null);
      return;
    }

    // Log the status change
    await supabase.from("status_update").insert({
      request_id: requestId,
      updated_by: user.id,
      old_status: "submitted",
      new_status: "confirmed",
      notes: "Confirmed by Sub-Warden",
    });

    // Remove from list
    setRequests((prev) => prev.filter((r) => r.request_id !== requestId));
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
            Sub-Warden Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            Reports waiting for your confirmation
          </p>
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 p-3 rounded mb-4">
            {error}
          </p>
        )}

        {requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600">
              ✅ No reports waiting. You&apos;re all caught up.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div
                key={r.request_id}
                className="bg-white rounded-lg shadow-sm p-5 border border-gray-100"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-500 capitalize">
                        {r.category?.category_name ?? "Unknown"}
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
                    <p className="text-gray-800">{r.description}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      By <strong>{r.student?.full_name ?? "Unknown"}</strong>
                      {r.student?.contact_number &&
                        ` · ${r.student.contact_number}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(r.date_reported).toLocaleString()}
                    </p>
                    <Attachments requestId={r.request_id} />
                  </div>
                </div>

                <button
                  onClick={() => handleConfirm(r.request_id)}
                  disabled={actionLoading === r.request_id}
                  className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
                >
                  {actionLoading === r.request_id
                    ? "Confirming..."
                    : "✓ Confirm Issue is Genuine"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
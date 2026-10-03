"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Attachments from "@/components/Attachments";
import {
  CheckCircle2,
  ArrowLeft,
  AlertTriangle,
  User,
  Clock,
  MessageSquare,
} from "lucide-react";

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
  const [comments, setComments] = useState<Record<string, string>>({});
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
      .select("dormitory_id, role")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.role !== "sub_warden") {
      setError("This page is only for Sub-Wardens");
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("maintenance_request")
      .select(
        "request_id, description, status, urgency_level, is_fast_track, date_reported, student:student_id (full_name, contact_number), category:category_id (category_name)"
      )
      .eq("dormitory_id", profile.dormitory_id)
      .eq("status", "submitted")
      .order("is_fast_track", { ascending: false })
      .order("date_reported", { ascending: true });

    if (fetchError) setError(fetchError.message);
    else if (data) setRequests(data as unknown as RequestRow[]);
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

    const comment = comments[requestId]?.trim() || null;

    const { error: updateError } = await supabase
      .from("maintenance_request")
      .update({
        status: "confirmed",
        confirmed_by: user.id,
        confirmed_at: new Date().toISOString(),
        sub_warden_comment: comment,
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
      old_status: "submitted",
      new_status: "confirmed",
      notes: comment
        ? `Confirmed by Sub-Warden: ${comment}`
        : "Confirmed by Sub-Warden",
    });

    setRequests((prev) => prev.filter((r) => r.request_id !== requestId));
    setActionLoading(null);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-500 text-sm">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="max-w-3xl mx-auto animate-fade-in">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-indigo-600 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Sub-Warden Dashboard
            </h1>
            <p className="text-sm text-slate-500">
              Reports waiting for your confirmation ({requests.length})
            </p>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {requests.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-12 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="text-slate-700 font-medium mb-1">All caught up!</p>
            <p className="text-sm text-slate-500">
              No reports waiting for confirmation.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div
                key={r.request_id}
                className={`bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 border-l-4 ${
                  r.is_fast_track
                    ? "border-l-red-500"
                    : r.urgency_level === "high"
                    ? "border-l-orange-400"
                    : r.urgency_level === "medium"
                    ? "border-l-blue-400"
                    : "border-l-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-sm font-medium text-slate-600 capitalize">
                    {r.category?.category_name ?? "Unknown"}
                  </span>
                  {r.is_fast_track && (
                    <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-md font-medium">
                      <AlertTriangle className="w-3 h-3" />
                      FAST-TRACK
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {r.urgency_level.toUpperCase()}
                  </span>
                </div>

                <p className="text-slate-800 mb-3 leading-relaxed">
                  {r.description}
                </p>

                <Attachments requestId={r.request_id} />

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-3 mb-4">
                  <span className="inline-flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <strong className="text-slate-700">
                      {r.student?.full_name ?? "Unknown"}
                    </strong>
                    {r.student?.contact_number &&
                      ` · ${r.student.contact_number}`}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(r.date_reported).toLocaleString()}
                  </span>
                </div>

                {/* NEW: Comment field */}
                <div className="mb-3">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Add a note (optional)
                  </label>
                  <textarea
                    value={comments[r.request_id] ?? ""}
                    onChange={(e) =>
                      setComments((prev) => ({
                        ...prev,
                        [r.request_id]: e.target.value,
                      }))
                    }
                    placeholder="e.g. Verified with student — the pipe under the sink is indeed leaking."
                    rows={2}
                    className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none"
                  />
                </div>

                <button
                  onClick={() => handleConfirm(r.request_id)}
                  disabled={actionLoading === r.request_id}
                  className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 font-medium text-sm shadow-sm hover:shadow-md transition-all"
                >
                  {actionLoading === r.request_id
                    ? "Confirming..."
                    : "Confirm Issue is Genuine"}
                  {actionLoading !== r.request_id && (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Attachments from "@/components/Attachments";
import FeedbackBlock from "@/components/FeedbackBlock";
import {
  Send,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Inbox,
  User,
  Filter,
} from "lucide-react";

type RequestRow = {
  request_id: string;
  student_id: string;
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
  confirmed: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50",
  approved: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50",
  resolved: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50",
};

const statusLabel: Record<string, string> = {
  confirmed: "Confirmed",
  approved: "Approved",
  in_progress: "In Progress",
  resolved: "Resolved",
};

export default function MatronPage() {
  const [pending, setPending] = useState<RequestRow[]>([]);
  const [forwarded, setForwarded] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");

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
      "request_id, student_id, description, status, urgency_level, is_fast_track, date_reported, confirmed_at, approved_at, date_resolved, student:student_id (full_name, contact_number), dormitory:dormitory_id (name), category:category_id (category_name), confirmer:confirmed_by (full_name)";

    const { data: pendingData, error: pendingErr } = await supabase
      .from("maintenance_request")
      .select(selectFields)
      .eq("status", "confirmed")
      .order("confirmed_at", { ascending: false });

    const { data: forwardedData, error: forwardedErr } = await supabase
      .from("maintenance_request")
      .select(selectFields)
      .in("status", ["approved", "in_progress", "resolved"])
      .order("approved_at", { ascending: false })
      .limit(100);

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

    const moved = pending.find((r) => r.request_id === requestId);
    setPending((prev) => prev.filter((r) => r.request_id !== requestId));
    if (moved) {
      moved.status = "approved";
      moved.approved_at = new Date().toISOString();
      setForwarded((prev) => [moved, ...prev]);
    }
    setActionLoading(null);
  }

  const filterAndSort = (list: RequestRow[]) => {
    let filtered = list;
    if (statusFilter !== "all" && list !== pending) {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    if (categoryFilter !== "all") {
      filtered = filtered.filter(r => r.category?.category_name === categoryFilter);
    }
    return filtered.sort((a, b) => {
      const dateA = new Date(a.date_reported).getTime();
      const dateB = new Date(b.date_reported).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
  };

  const displayPending = filterAndSort(pending);
  const displayForwarded = filterAndSort(forwarded);

  const uniqueCategories = Array.from(
    new Set([...pending, ...forwarded].map((r) => r.category?.category_name).filter(Boolean))
  );

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-500 dark:text-slate-400 text-sm">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="max-w-3xl mx-auto animate-fade-in">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
            <Send className="w-5 h-5 text-red-800 dark:text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Matron / Patron Dashboard
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              All dorms · review and forward to Maintenance
            </p>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {/* FILTERS */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-4 mb-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filter:</span>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-900 dark:text-slate-100"
          >
            <option value="all">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-900 dark:text-slate-100 capitalize"
          >
            <option value="all">All Categories</option>
            {uniqueCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-900 dark:text-slate-100"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>

        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 px-1 inline-flex items-center gap-2">
          <Inbox className="w-5 h-5 text-red-800 dark:text-red-500" />
          Awaiting Your Approval ({displayPending.length})
        </h2>

        {displayPending.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-8 text-center mb-8">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              ✅ No confirmed reports waiting.
            </p>
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {displayPending.map((r) => (
              <div
                key={r.request_id}
                className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-5 border-l-4 ${
                  r.is_fast_track ? "border-l-red-500" : r.urgency_level === "high" ? "border-l-orange-400" : "border-l-blue-400"
                }`}
              >
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400 capitalize">{r.category?.category_name ?? "Unknown"}</span>
                  <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">{r.dormitory?.name ?? "Unknown"}</span>
                  {r.is_fast_track && (
                    <span className="inline-flex items-center gap-1 text-xs bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-md font-medium">
                      <AlertTriangle className="w-3 h-3" /> FAST-TRACK
                    </span>
                  )}
                  <span className="text-xs text-slate-400 dark:text-slate-500">{r.urgency_level.toUpperCase()}</span>
                </div>
                <p className="text-slate-800 dark:text-slate-200 mb-3 leading-relaxed">{r.description}</p>
                <Attachments requestId={r.request_id} />
                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 mt-3 mb-4">
                  <p className="inline-flex items-center gap-1">
                    <User className="w-3 h-3" /> Reported by <strong className="text-slate-700 dark:text-slate-200">{r.student?.full_name ?? "Unknown"}</strong>
                  </p>
                  <p>Confirmed by <strong className="text-slate-700 dark:text-slate-200">{r.confirmer?.full_name ?? "Unknown"}</strong> {r.confirmed_at && ` · ${new Date(r.confirmed_at).toLocaleString()}`}</p>
                </div>
                <button
                  onClick={() => handleApprove(r.request_id)}
                  disabled={actionLoading === r.request_id}
                  className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-800 to-red-900 text-white py-2.5 rounded-xl hover:from-red-900 hover:to-amber-700 disabled:opacity-50 font-medium text-sm shadow-lg transition-all"
                >
                  {actionLoading === r.request_id ? "Approving..." : "Approve & Forward"}
                  {actionLoading !== r.request_id && <Send className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        )}

        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 px-1 inline-flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          Sent to Maintenance ({displayForwarded.length})
        </h2>

        {displayForwarded.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-8 text-center">
            <p className="text-slate-500 dark:text-slate-400 text-sm">No reports match filters.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayForwarded.map((r) => (
              <div key={r.request_id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-4">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 capitalize">{r.category?.category_name ?? "Unknown"}</span>
                  <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">{r.dormitory?.name ?? "Unknown"}</span>
                  {r.is_fast_track && <span className="text-xs bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-md font-medium">FAST-TRACK</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium border ${statusColor[r.status] ?? ""}`}>
                    {statusLabel[r.status] ?? r.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed">{r.description}</p>
                {r.status === "resolved" && <FeedbackBlock requestId={r.request_id} studentId={r.student_id} />}
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  By {r.student?.full_name ?? "Unknown"} {r.approved_at && `· forwarded ${new Date(r.approved_at).toLocaleDateString()}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
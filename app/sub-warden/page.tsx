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
  Filter,
} from "lucide-react";

type RequestRow = {
  request_id: string;
  description: string;
  status: string;
  urgency_level: string;
  is_fast_track: boolean;
  date_reported: string;
  sub_warden_comment: string | null;
  student: { full_name: string; contact_number: string | null } | null;
  category: { category_name: string } | null;
};

const statusColor: Record<string, string> = {
  submitted: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  approved: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
};

export default function SubWardenPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");

  const router = useRouter();

  async function loadRequests() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

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
      .select("request_id, description, status, urgency_level, is_fast_track, date_reported, sub_warden_comment, student:student_id (full_name, contact_number), category:category_id (category_name)")
      .eq("dormitory_id", profile.dormitory_id)
      .order("date_reported", { ascending: false });

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const comment = comments[requestId]?.trim() || null;

    const { error: updateError } = await supabase
      .from("maintenance_request")
      .update({ status: "confirmed", confirmed_by: user.id, confirmed_at: new Date().toISOString(), sub_warden_comment: comment })
      .eq("request_id", requestId);

    if (updateError) { setError(updateError.message); setActionLoading(null); return; }

    await supabase.from("status_update").insert({
      request_id: requestId,
      updated_by: user.id,
      old_status: "submitted",
      new_status: "confirmed",
      notes: comment ? `Confirmed by Sub-Warden: ${comment}` : "Confirmed by Sub-Warden",
    });

    setRequests((prev) => prev.map((r) => r.request_id === requestId ? { ...r, status: "confirmed", sub_warden_comment: comment } : r));
    setActionLoading(null);
  }

  const filteredRequests = requests
    .filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (categoryFilter !== "all" && r.category?.category_name !== categoryFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date_reported).getTime();
      const dateB = new Date(b.date_reported).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  const uniqueCategories = Array.from(new Set(requests.map((r) => r.category?.category_name).filter(Boolean)));

  if (loading) return <main className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-slate-500 text-sm">Loading...</div></main>;

  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="max-w-3xl mx-auto animate-fade-in">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-red-800 dark:hover:text-red-400 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-red-800 dark:text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sub-Warden Dashboard</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">All reports from your dormitory</p>
          </div>
        </div>

        {error && <div className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-3 rounded-xl mb-4">{error}</div>}

        {/* FILTERS */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-4 mb-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Filter className="w-4 h-4" /> <span className="text-sm font-medium">Filter:</span>
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-900 dark:text-slate-100">
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted (Needs Action)</option>
            <option value="confirmed">Confirmed</option>
            <option value="approved">Approved</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-900 dark:text-slate-100 capitalize">
            <option value="all">All Categories</option>
            {uniqueCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-900 dark:text-slate-100">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-12 text-center">
            <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto mb-4" />
            <p className="text-slate-700 dark:text-slate-300 font-medium mb-1">No reports found</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((r) => (
              <div key={r.request_id} className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-5 border-l-4 ${r.is_fast_track ? "border-l-red-500" : r.urgency_level === "high" ? "border-l-orange-400" : r.urgency_level === "medium" ? "border-l-blue-400" : "border-l-slate-300"}`}>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400 capitalize">{r.category?.category_name ?? "Unknown"}</span>
                  {r.is_fast_track && <span className="inline-flex items-center gap-1 text-xs bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-md font-medium"><AlertTriangle className="w-3 h-3" /> FAST-TRACK</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${statusColor[r.status] || "bg-slate-100"}`}>{r.status.replace("_", " ").toUpperCase()}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">{r.urgency_level.toUpperCase()}</span>
                </div>
                <p className="text-slate-800 dark:text-slate-200 mb-3 leading-relaxed">{r.description}</p>
                <Attachments requestId={r.request_id} />
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-3 mb-4">
                  <span className="inline-flex items-center gap-1"><User className="w-3 h-3" /> <strong className="text-slate-700 dark:text-slate-200">{r.student?.full_name ?? "Unknown"}</strong></span>
                  <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(r.date_reported).toLocaleString()}</span>
                </div>
                {r.sub_warden_comment && (
                  <div className="mb-4 text-sm bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Sub-Warden Note:</p>
                    <p className="text-slate-700 dark:text-slate-300 italic">"{r.sub_warden_comment}"</p>
                  </div>
                )}
                {r.status === "submitted" ? (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"><MessageSquare className="w-3.5 h-3.5" /> Add a note (optional)</label>
                    <textarea value={comments[r.request_id] ?? ""} onChange={(e) => setComments((prev) => ({ ...prev, [r.request_id]: e.target.value }))} placeholder="e.g. Verified with student..." rows={2} className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-800/30 focus:border-red-800 resize-none text-slate-900 dark:text-slate-100 mb-3" />
                    <button onClick={() => handleConfirm(r.request_id)} disabled={actionLoading === r.request_id} className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-800 to-red-900 text-white py-2.5 rounded-xl hover:from-red-900 hover:to-amber-700 disabled:opacity-50 font-medium text-sm shadow-lg shadow-red-900/20 hover:shadow-xl hover:shadow-amber-500/30 transition-all">
                      {actionLoading === r.request_id ? "Confirming..." : "Confirm Issue is Genuine"} {actionLoading !== r.request_id && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                  </div>
                ) : (
                   <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Processed.</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
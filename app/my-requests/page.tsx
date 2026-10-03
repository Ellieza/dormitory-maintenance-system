"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Attachments from "@/components/Attachments";
import FeedbackBlock from "@/components/FeedbackBlock";
import {
  ClipboardList,
  Plus,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";

type RequestRow = {
  request_id: string;
  student_id: string;
  description: string;
  status: string;
  urgency_level: string;
  is_fast_track: boolean;
  date_reported: string;
  category: { category_name: string } | null;
};

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

const urgencyColor: Record<string, string> = {
  low: "text-slate-500",
  medium: "text-blue-600",
  high: "text-orange-600",
  critical: "text-red-600 font-semibold",
};

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
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

      const { data } = await supabase
        .from("maintenance_request")
        .select(
          "request_id, student_id, description, status, urgency_level, is_fast_track, date_reported, category:category_id (category_name)"
        )
        .eq("student_id", user.id)
        .order("date_reported", { ascending: false });

      if (data) setRequests(data as unknown as RequestRow[]);
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

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">My Reports</h1>
              <p className="text-sm text-slate-500">
                {requests.length}{" "}
                {requests.length === 1 ? "report" : "reports"} submitted
              </p>
            </div>
          </div>
          <Link
            href="/report"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 text-sm font-medium shadow-sm hover:shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            New Report
          </Link>
        </div>

        {requests.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-12 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-slate-100 flex items-center justify-center">
              <ClipboardList className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-slate-700 font-medium mb-1">
              No reports yet
            </p>
            <p className="text-sm text-slate-500 mb-6">
              Report a maintenance issue and it will show up here.
            </p>
            <Link
              href="/report"
              className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
            >
              Submit your first report
              <Plus className="w-4 h-4" />
            </Link>
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
                <div className="flex justify-between items-start gap-4 mb-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-600 capitalize">
                      {r.category?.category_name ?? "Unknown"}
                    </span>
                    {r.is_fast_track && (
                      <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-md font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        FAST-TRACK
                      </span>
                    )}
                    <span
                      className={`text-xs ${
                        urgencyColor[r.urgency_level] ?? "text-slate-500"
                      }`}
                    >
                      {r.urgency_level.toUpperCase()}
                    </span>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium border ${
                      statusColor[r.status] ??
                      "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {statusLabel[r.status] ?? r.status}
                  </span>
                </div>

                <p className="text-slate-800 mb-3 leading-relaxed">
                  {r.description}
                </p>

                <Attachments requestId={r.request_id} />

                {/* Feedback — only for resolved reports */}
                {r.status === "resolved" && (
                  <FeedbackBlock
                    requestId={r.request_id}
                    studentId={r.student_id}
                  />
                )}

                <p className="text-xs text-slate-400 mt-3">
                  Reported {new Date(r.date_reported).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
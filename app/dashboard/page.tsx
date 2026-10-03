"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Attachments from "@/components/Attachments";
import {
  FileWarning,
  ClipboardList,
  CheckCircle2,
  Send,
  Wrench,
  BarChart3,
  User,
  Mail,
} from "lucide-react";

type Profile = {
  full_name: string;
  role: string;
  dormitory_id: string | null;
};

type ActiveReport = {
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
  submitted:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  confirmed:
    "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  approved:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
  in_progress:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  resolved:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
};

const roleLabels: Record<string, string> = {
  student: "Student",
  sub_warden: "Sub-Warden",
  matron_patron: "Matron / Patron",
  maintenance: "Maintenance Team",
  ssf: "Student Support & Facilities",
};

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<ActiveReport[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setEmail(user.email ?? null);

      const { data } = await supabase
        .from("users")
        .select("full_name, role, dormitory_id")
        .eq("user_id", user.id)
        .single();

      setProfile(data);

      if (data?.role === "ssf") {
        const { data: alerts } = await supabase
          .from("maintenance_request")
          .select(
            "request_id, description, status, urgency_level, is_fast_track, date_reported, student:student_id (full_name, contact_number), dormitory:dormitory_id (name), category:category_id (category_name)"
          )
          .neq("status", "resolved")
          .order("date_reported", { ascending: false })
          .limit(50);
        if (alerts) setActiveAlerts(alerts as unknown as ActiveReport[]);
      }

      setLoading(false);
    }

    load();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-500 dark:text-slate-400 text-sm">
          Loading...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="max-w-3xl mx-auto animate-fade-in">
        {/* Welcome card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
            Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Welcome back,{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {profile?.full_name}
            </span>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700/50">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  ROLE
                </p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {roleLabels[profile?.role ?? ""] ?? profile?.role}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700/50">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  EMAIL
                </p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {email}
                </p>
              </div>
            </div>
          </div>

          {/* Role actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {profile?.role === "student" && (
              <>
                <Link
                  href="/report"
                  className="group flex items-center gap-3 bg-indigo-600 text-white p-4 rounded-xl hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                    <FileWarning className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Report an Issue</p>
                    <p className="text-xs text-white/80">
                      Submit a new maintenance report
                    </p>
                  </div>
                </Link>
                <Link
                  href="/my-requests"
                  className="group flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all shadow-sm hover:shadow-md"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">My Reports</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Track your submitted reports
                    </p>
                  </div>
                </Link>
              </>
            )}

            {profile?.role === "sub_warden" && (
              <Link
                href="/sub-warden"
                className="group flex items-center gap-3 bg-indigo-600 text-white p-4 rounded-xl hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Confirm Reports</p>
                  <p className="text-xs text-white/80">
                    Verify issues from your dormitory
                  </p>
                </div>
              </Link>
            )}

            {profile?.role === "matron_patron" && (
              <Link
                href="/matron"
                className="group flex items-center gap-3 bg-indigo-600 text-white p-4 rounded-xl hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Review Reports</p>
                  <p className="text-xs text-white/80">
                    Approve and forward to Maintenance
                  </p>
                </div>
              </Link>
            )}

            {profile?.role === "maintenance" && (
              <Link
                href="/maintenance"
                className="group flex items-center gap-3 bg-indigo-600 text-white p-4 rounded-xl hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Maintenance Queue</p>
                  <p className="text-xs text-white/80">
                    Work prioritized reports
                  </p>
                </div>
              </Link>
            )}

            {profile?.role === "ssf" && (
              <Link
                href="/ssf"
                className="group flex items-center gap-3 bg-indigo-600 text-white p-4 rounded-xl hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">
                    Overview & Statistics
                  </p>
                  <p className="text-xs text-white/80">
                    Reports and analysis across all dorms
                  </p>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* SSF: Active reports inline */}
        {profile?.role === "ssf" && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 px-1">
              Active Reports ({activeAlerts.length})
            </h2>
            {activeAlerts.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-8 text-center">
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  ✅ No active reports. All caught up.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeAlerts.map((r) => {
                  const isCritical =
                    r.is_fast_track || r.urgency_level === "critical";
                  return (
                    <div
                      key={r.request_id}
                      className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-5 border-l-4 ${
                        isCritical
                          ? "border-l-red-500"
                          : r.urgency_level === "high"
                          ? "border-l-orange-400"
                          : r.urgency_level === "medium"
                          ? "border-l-blue-400"
                          : "border-l-slate-300 dark:border-l-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 capitalize">
                          {r.category?.category_name ?? "Unknown"}
                        </span>
                        <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                          {r.dormitory?.name ?? "Unknown dorm"}
                        </span>
                        {r.is_fast_track && (
                          <span className="text-xs bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-md font-medium">
                            FAST-TRACK
                          </span>
                        )}
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                            statusColor[r.status] ??
                            "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {r.status.replace("_", " ").toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {r.urgency_level.toUpperCase()}
                        </span>
                      </div>

                      <p className="text-slate-800 dark:text-slate-200 mb-3">
                        {r.description}
                      </p>
                      <Attachments requestId={r.request_id} />

                      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                        <p>
                          Reported by{" "}
                          <strong className="text-slate-700 dark:text-slate-200">
                            {r.student?.full_name ?? "Unknown"}
                          </strong>
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
        )}
      </div>
    </main>
  );
}
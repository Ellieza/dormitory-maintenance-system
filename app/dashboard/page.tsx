"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Attachments from "@/components/Attachments";

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
  submitted: "bg-gray-100 text-gray-800",
  confirmed: "bg-blue-100 text-blue-800",
  approved: "bg-indigo-100 text-indigo-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
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

      // SSF: also fetch active (unresolved) reports to show inline
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

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
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
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-blue-900">Dashboard</h1>
            <p className="text-gray-700 mt-1">
              Welcome,{" "}
              <span className="font-semibold">{profile?.full_name}</span>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 hover:text-red-800 border border-red-200 rounded px-3 py-1"
          >
            Log Out
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Role:</span>{" "}
            {profile?.role?.replace("_", " ")}
          </p>
          <p className="text-sm text-gray-700 mt-1">
            <span className="font-semibold">Email:</span> {email}
          </p>
        </div>

        {/* Role-specific quick actions */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {profile?.role === "student" && (
            <>
              <Link
                href="/report"
                className="block bg-blue-600 text-white text-center py-3 rounded hover:bg-blue-700 font-medium"
              >
                Report an Issue
              </Link>
              <Link
                href="/my-requests"
                className="block bg-white border border-gray-300 text-gray-800 text-center py-3 rounded hover:bg-gray-50 font-medium"
              >
                My Reports
              </Link>
            </>
          )}

          {profile?.role === "sub_warden" && (
            <Link
              href="/sub-warden"
              className="block bg-blue-600 text-white text-center py-3 rounded hover:bg-blue-700 font-medium"
            >
              Confirm Reports
            </Link>
          )}

          {profile?.role === "matron_patron" && (
            <Link
              href="/matron"
              className="block bg-blue-600 text-white text-center py-3 rounded hover:bg-blue-700 font-medium"
            >
              Review Reports
            </Link>
          )}

          {profile?.role === "maintenance" && (
            <Link
              href="/maintenance"
              className="block bg-blue-600 text-white text-center py-3 rounded hover:bg-blue-700 font-medium"
            >
              Maintenance Queue
            </Link>
          )}

          {profile?.role === "ssf" && (
            <Link
              href="/ssf"
              className="block bg-blue-600 text-white text-center py-3 rounded hover:bg-blue-700 font-medium"
            >
              📊 Overview & Statistics
            </Link>
          )}
        </div>
      </div>

      {/* SSF: Active reports shown inline on the dashboard */}
      {profile?.role === "ssf" && (
        <div className="max-w-3xl mx-auto mt-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">
            Active Reports ({activeAlerts.length})
          </h2>
          {activeAlerts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <p className="text-gray-500 text-sm">
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
      )}
    </main>
  );
}
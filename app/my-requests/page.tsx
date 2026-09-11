"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

type RequestRow = {
  request_id: string;
  description: string;
  status: string;
  urgency_level: string;
  is_fast_track: boolean;
  date_reported: string;
  category: { category_name: string } | null;
};

const statusColor: Record<string, string> = {
  submitted: "bg-gray-100 text-gray-800",
  confirmed: "bg-blue-100 text-blue-800",
  approved: "bg-indigo-100 text-indigo-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
};

const urgencyColor: Record<string, string> = {
  low: "text-gray-500",
  medium: "text-blue-600",
  high: "text-orange-600",
  critical: "text-red-600 font-bold",
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
          "request_id, description, status, urgency_level, is_fast_track, date_reported, category:category_id (category_name)"
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
      <main className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-gray-600">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-blue-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-blue-900">My Reports</h1>
          <Link
            href="/report"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium"
          >
            + New Report
          </Link>
        </div>

        {requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 mb-4">
              You haven&apos;t submitted any reports yet.
            </p>
            <Link
              href="/report"
              className="text-blue-600 hover:underline font-medium"
            >
              Submit your first report →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div
                key={r.request_id}
                className="bg-white rounded-lg shadow-sm p-5 border border-gray-100"
              >
                <div className="flex justify-between items-start gap-4">
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
                      <span
                        className={`text-xs ${
                          urgencyColor[r.urgency_level] ?? "text-gray-500"
                        }`}
                      >
                        {r.urgency_level.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-800">{r.description}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      Reported {new Date(r.date_reported).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded font-medium whitespace-nowrap ${
                      statusColor[r.status] ?? "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {r.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
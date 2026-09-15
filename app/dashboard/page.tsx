"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Profile = {
  full_name: string;
  role: string;
  dormitory_id: string | null;
};

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
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
              SSF Overview
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
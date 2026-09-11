"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Dormitory = {
  dormitory_id: string;
  name: string;
  type: string;
};

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [dormitoryId, setDormitoryId] = useState("");
  const [dormitories, setDormitories] = useState<Dormitory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    async function loadDorms() {
      const { data, error } = await supabase
        .from("dormitory")
        .select("dormitory_id, name, type");

      console.log("Dorm fetch:", { data, error });

      if (error) {
        console.error("Supabase dorm error:", error);
        return;
      }

      if (data) setDormitories(data);
    }

    loadDorms();
  }, []);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError("Signup failed — no user returned");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from("users").insert({
      user_id: authData.user.id,
      full_name: fullName,
      email,
      role,
      dormitory_id:
        role === "student" || role === "sub_warden" ? dormitoryId : null,
    });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  const needsDorm = role === "student" || role === "sub_warden";

  return (
    <main className="min-h-screen flex items-center justify-center bg-blue-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-1 text-center text-blue-900">
          Dormitory Maintenance System
        </h1>
        <p className="text-center text-sm text-gray-500 mb-6">
          Create your account
        </p>

        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
          />

          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
          />

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="student">Student</option>
            <option value="sub_warden">Sub-Warden</option>
            <option value="matron_patron">Matron / Patron</option>
            <option value="maintenance">Maintenance Team</option>
            <option value="ssf">Student Support & Facilities</option>
          </select>

          {needsDorm && (
            <select
              value={dormitoryId}
              onChange={(e) => setDormitoryId(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="">Select your dormitory</option>
              {dormitories.map((d) => (
                <option key={d.dormitory_id} value={d.dormitory_id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}

          {error && (
            <p className="text-red-600 text-sm bg-red-50 p-2 rounded">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>
      </div>
    </main>
  );
}
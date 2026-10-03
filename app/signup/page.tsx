"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  User,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Hash,
  DoorOpen,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

type Dormitory = {
  dormitory_id: string;
  name: string;
  type: "boys" | "girls";
};

const STUDENT_ROLES = ["student", "sub_warden"];
const DORM_ROLES = ["student", "sub_warden"];

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [gender, setGender] = useState<"" | "male" | "female">("");
  const [tafNumber, setTafNumber] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [dormitoryId, setDormitoryId] = useState("");
  const [dormitories, setDormitories] = useState<Dormitory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isStudentRole = STUDENT_ROLES.includes(role);
  const needsDorm = DORM_ROLES.includes(role);

  useEffect(() => {
    const supabase = createClient();
    async function loadDorms() {
      const { data } = await supabase
        .from("dormitory")
        .select("dormitory_id, name, type")
        .order("name");
      if (data) setDormitories(data as Dormitory[]);
    }
    loadDorms();
  }, []);

  useEffect(() => {
    setDormitoryId("");
  }, [gender]);

  const filteredDorms = gender
    ? dormitories.filter((d) =>
        gender === "male" ? d.type === "boys" : d.type === "girls"
      )
    : [];

  function validateEmail(email: string, forStudent: boolean): boolean {
    const trimmed = email.trim().toLowerCase();
    if (forStudent) return trimmed.endsWith("@student.pnguot.ac.pg");
    return (
      trimmed.endsWith("@pnguot.ac.pg") &&
      !trimmed.endsWith("@student.pnguot.ac.pg")
    );
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!validateEmail(email, isStudentRole)) {
      setError(
        isStudentRole
          ? "Students and Sub-Wardens must use a @student.pnguot.ac.pg email address."
          : "Staff must use a @pnguot.ac.pg email address."
      );
      setLoading(false);
      return;
    }
    if (isStudentRole && !gender) {
      setError("Please select your gender.");
      setLoading(false);
      return;
    }
    if (isStudentRole && (!tafNumber.trim() || !roomNumber.trim())) {
      setError(
        "TAF number and room number are required for students and sub-wardens."
      );
      setLoading(false);
      return;
    }
    if (needsDorm && !dormitoryId) {
      setError("Please select your dormitory.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
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
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      role,
      gender: isStudentRole ? gender : null,
      taf_number: isStudentRole ? tafNumber.trim() : null,
      room_number: isStudentRole ? roomNumber.trim() : null,
      dormitory_id: needsDorm ? dormitoryId : null,
    });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  const inputClass =
    "w-full pl-10 pr-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500";
  const selectClass =
    "w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-sm text-slate-900 dark:text-slate-100";

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 py-8 overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      <ThemeToggle />

      <div className="absolute top-1/4 -left-16 w-72 h-72 rounded-full bg-indigo-400/10 dark:bg-indigo-500/10 blur-3xl animate-float pointer-events-none" />
      <div
        className="absolute bottom-1/4 -right-16 w-80 h-80 rounded-full bg-purple-400/10 dark:bg-purple-500/10 blur-3xl animate-float pointer-events-none"
        style={{ animationDelay: "1.5s" }}
      />

      <div className="relative w-full max-w-md animate-fade-in">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 mb-6 group"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:shadow-xl transition-all group-hover:scale-105">
            <Building2 className="w-6 h-6 text-white" />
          </div>
        </Link>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-700/60 p-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 text-center mb-1">
            Create your account
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
            Dormitory Maintenance System · PNGUoT
          </p>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                University Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="email"
                  placeholder={
                    isStudentRole
                      ? "yourname@student.pnguot.ac.pg"
                      : "yourname@pnguot.ac.pg"
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isStudentRole
                  ? "Must end with @student.pnguot.ac.pg"
                  : "Must end with @pnguot.ac.pg"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setGender("");
                  setTafNumber("");
                  setRoomNumber("");
                  setDormitoryId("");
                }}
                className={selectClass}
              >
                <option value="student">Student</option>
                <option value="sub_warden">Sub-Warden</option>
                <option value="matron_patron">Matron / Patron</option>
                <option value="maintenance">Maintenance Team</option>
                <option value="ssf">Student Support & Facilities</option>
              </select>
            </div>

            {isStudentRole && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) =>
                      setGender(e.target.value as "" | "male" | "female")
                    }
                    required
                    className={selectClass}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    TAF Number
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      placeholder="e.g. 22201881"
                      value={tafNumber}
                      onChange={(e) => setTafNumber(e.target.value)}
                      required
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Room Number
                  </label>
                  <div className="relative">
                    <DoorOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      placeholder="e.g. 12B"
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      required
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Dormitory
                  </label>
                  <select
                    value={dormitoryId}
                    onChange={(e) => setDormitoryId(e.target.value)}
                    required
                    disabled={!gender}
                    className={`${selectClass} disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed disabled:text-slate-400`}
                  >
                    <option value="">
                      {gender ? "Select your dormitory" : "Select gender first"}
                    </option>
                    {filteredDorms.map((d) => (
                      <option key={d.dormitory_id} value={d.dormitory_id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-3 rounded-xl">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-xl hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 font-medium shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 transition-all"
            >
              {loading ? "Creating account..." : "Sign Up"}
              {!loading && (
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-6">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
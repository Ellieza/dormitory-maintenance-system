"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileWarning,
  Upload,
  X,
  AlertTriangle,
  ArrowLeft,
  Send,
} from "lucide-react";

type Category = {
  category_id: string;
  category_name: string;
  default_urgency: string;
};

export default function ReportPage() {
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadCategories() {
      const supabase = createClient();
      const { data } = await supabase
        .from("category")
        .select("category_id, category_name, default_urgency")
        .order("category_name");
      if (data) setCategories(data);
    }
    loadCategories();
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setError("File is too large. Max 50 MB.");
      return;
    }
    if (!f.type.startsWith("image/") && !f.type.startsWith("video/")) {
      setError("Only images or videos are allowed.");
      return;
    }
    setError(null);
    setFile(f);
    if (f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }

  function clearFile() {
    setFile(null);
    setPreview(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("dormitory_id, role")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profile?.dormitory_id) {
        throw new Error("Could not find your dormitory — contact support");
      }
      if (profile.role !== "student") {
        throw new Error("Only students can submit reports");
      }

      const selectedCategory = categories.find(
        (c) => c.category_id === categoryId
      );
      if (!selectedCategory) throw new Error("Please select a category");

      const isFastTrack = selectedCategory.category_name === "pest";

      const { data: newRequest, error: insertError } = await supabase
        .from("maintenance_request")
        .insert({
          student_id: user.id,
          dormitory_id: profile.dormitory_id,
          category_id: categoryId,
          description,
          urgency_level: selectedCategory.default_urgency,
          status: "submitted",
          is_fast_track: isFastTrack,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${newRequest.request_id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("attachments")
          .upload(fileName, file);
        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("attachments").getPublicUrl(fileName);

        const { error: attError } = await supabase.from("attachment").insert({
          request_id: newRequest.request_id,
          file_url: publicUrl,
        });
        if (attError) throw attError;
      }

      await supabase.from("status_update").insert({
        request_id: newRequest.request_id,
        updated_by: user.id,
        old_status: null,
        new_status: "submitted",
        notes: "Report submitted",
      });

      if (isFastTrack) {
        const { data: recipients } = await supabase
          .from("users")
          .select("user_id, role")
          .in("role", ["maintenance", "ssf"]);

        if (recipients && recipients.length > 0) {
          const alerts = recipients.map((r) => ({
            request_id: newRequest.request_id,
            alert_type: "pest_critical",
            sent_to: r.user_id,
          }));
          await supabase.from("alert").insert(alerts);
        }
      }

      router.push("/my-requests");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  const selectedCategory = categories.find((c) => c.category_id === categoryId);
  const isPest = selectedCategory?.category_name === "pest";

  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="max-w-2xl mx-auto animate-fade-in">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-6 sm:p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center flex-shrink-0">
              <FileWarning className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Report an Issue
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Your report will go to your Sub-Warden for confirmation
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name.charAt(0).toUpperCase() +
                      c.category_name.slice(1)}
                  </option>
                ))}
              </select>

              {isPest && (
                <div className="mt-2 flex items-start gap-2 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl p-3">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Pest reports are treated as critical.</strong> An
                    immediate alert will be sent to Maintenance and Student
                    Support &amp; Facilities.
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={5}
                placeholder="What's the problem? Be specific — location, what you see, how long it's been happening..."
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Photo or Video Evidence{" "}
                <span className="text-slate-400 dark:text-slate-500 font-normal">
                  (optional · max 50 MB)
                </span>
              </label>

              {!file ? (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all">
                  <Upload className="w-6 h-6 text-slate-400 dark:text-slate-500 mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                    Click to upload a photo or video
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    A clear photo or 15–30 second video helps verify the issue
                  </p>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="border border-slate-300 dark:border-slate-700 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={clearFile}
                      className="text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {preview && (
                    <div className="mt-3">
                      <img
                        src={preview}
                        alt="Preview"
                        className="max-h-48 rounded-lg border border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  )}

                  {file.type.startsWith("video/") && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      🎥 Video ready to upload
                    </p>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-3 rounded-xl">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="group flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-xl hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 font-medium shadow-lg shadow-indigo-500/20 hover:shadow-xl transition-all"
              >
                {loading ? (
                  "Submitting..."
                ) : (
                  <>
                    Submit Report
                    <Send className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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
        .select("category_id, category_name, default_urgency");
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

    // Size limit: 50 MB
    if (f.size > 50 * 1024 * 1024) {
      setError("File is too large. Max 50 MB.");
      return;
    }

    // Type limit: images or videos only
    if (!f.type.startsWith("image/") && !f.type.startsWith("video/")) {
      setError("Only images or videos are allowed.");
      return;
    }

    setError(null);
    setFile(f);

    // Preview for images only
    if (f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
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

      // 1. Create the maintenance request
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

      // 2. Upload file if provided
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

        // Insert attachment record
        const { error: attError } = await supabase.from("attachment").insert({
          request_id: newRequest.request_id,
          file_url: publicUrl,
        });

        if (attError) throw attError;
      }

      // 3. Log the status update
      await supabase.from("status_update").insert({
        request_id: newRequest.request_id,
        updated_by: user.id,
        old_status: null,
        new_status: "submitted",
        notes: "Report submitted",
      });

      // 4. If fast-track, create alerts
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
    <main className="min-h-screen bg-blue-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-blue-900 mb-1">
          Report a Maintenance Issue
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Your report will go to your Sub-Warden for confirmation.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
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
              <div className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
                ⚠️ <strong>Pest reports are treated as critical.</strong> An
                immediate alert will be sent to Maintenance and Student Support
                &amp; Facilities.
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Describe the issue
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={5}
              placeholder="What's the problem? Be specific — location, what you see, how long it's been happening..."
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Photo or Video Evidence <span className="text-gray-400 font-normal">(optional — max 50 MB)</span>
            </label>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="w-full text-sm border border-gray-300 rounded px-3 py-2 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="text-xs text-gray-500 mt-1">
              A 15–30 second video or a clear photo helps verify the issue faster.
            </p>

            {preview && (
              <div className="mt-3">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-48 rounded border border-gray-200"
                />
              </div>
            )}

            {file && file.type.startsWith("video/") && (
              <p className="mt-2 text-xs text-gray-600">
                🎥 Video selected: <strong>{file.name}</strong> (
                {(file.size / 1024 / 1024).toFixed(1)} MB)
              </p>
            )}
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 p-2 rounded">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? "Submitting..." : "Submit Report"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
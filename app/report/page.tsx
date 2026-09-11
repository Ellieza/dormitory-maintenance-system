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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // 1. Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // 2. Get user's profile (dormitory + role)
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

      // 3. Find the selected category to get default urgency
      const selectedCategory = categories.find(
        (c) => c.category_id === categoryId
      );
      if (!selectedCategory) throw new Error("Please select a category");

      const isFastTrack = selectedCategory.category_name === "pest";

      // 4. Insert the maintenance request
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

      // 5. Log the status update (audit trail)
      await supabase.from("status_update").insert({
        request_id: newRequest.request_id,
        updated_by: user.id,
        old_status: null,
        new_status: "submitted",
        notes: "Report submitted",
      });

      // 6. If fast-track, create alerts for maintenance + SSF
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

      // 7. Done — send them to their requests page
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
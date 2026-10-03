"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Star, CheckCircle2, MessageSquare, Loader2 } from "lucide-react";

type Feedback = {
  feedback_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

type Props = {
  requestId: string;
  studentId: string;
};

export default function FeedbackBlock({ requestId, studentId }: Props) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      const { data } = await supabase
        .from("feedback")
        .select("feedback_id, rating, comment, created_at")
        .eq("request_id", requestId)
        .maybeSingle();

      if (data) setFeedback(data);
      setLoading(false);
    }
    load();
  }, [requestId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a rating.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("feedback")
      .insert({
        request_id: requestId,
        student_id: studentId,
        rating,
        comment: comment.trim() || null,
      })
      .select("feedback_id, rating, comment, created_at")
      .single();

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    setFeedback(data);
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading feedback...
      </div>
    );
  }

  // ----- Existing feedback (shown to everyone) -----
  if (feedback) {
    return (
      <div className="mt-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            STUDENT FEEDBACK
          </p>
        </div>
        <div className="flex items-center gap-1 mb-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-4 h-4 ${
                star <= feedback.rating
                  ? "fill-amber-400 text-amber-400"
                  : "text-slate-300 dark:text-slate-600"
              }`}
            />
          ))}
          <span className="text-xs text-slate-600 dark:text-slate-400 ml-1">
            ({feedback.rating}/5)
          </span>
        </div>
        {feedback.comment && (
          <p className="text-sm text-slate-700 dark:text-slate-300 italic">
            &ldquo;{feedback.comment}&rdquo;
          </p>
        )}
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
          {new Date(feedback.created_at).toLocaleString()}
        </p>
      </div>
    );
  }

  // ----- No feedback yet + current user is not the student -----
  if (currentUserId !== studentId) {
    return (
      <div className="mt-3 text-xs text-slate-400 dark:text-slate-500 italic">
        Awaiting student feedback.
      </div>
    );
  }

  // ----- No feedback yet + current user IS the student → show form -----
  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
          Rate the repair
        </p>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
        Your feedback goes directly to the Maintenance team and the Matron.
      </p>

      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`w-7 h-7 ${
                star <= (hoveredStar || rating)
                  ? "fill-amber-400 text-amber-400"
                  : "text-slate-300 dark:text-slate-600"
              }`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="text-sm text-slate-700 dark:text-slate-300 ml-2 font-medium">
            {rating}/5
          </span>
        )}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional: tell us how it went..."
        rows={2}
        className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 resize-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
      />

      {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>}

      <button
        type="submit"
        disabled={submitting || rating === 0}
        className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-amber-500 text-white py-2 rounded-xl hover:bg-amber-600 disabled:opacity-50 font-medium text-sm shadow-sm hover:shadow-md transition-all"
      >
        {submitting ? "Submitting..." : "Submit Feedback"}
        {!submitting && <CheckCircle2 className="w-4 h-4" />}
      </button>
    </form>
  );
}
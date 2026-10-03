"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Attachment = {
  attachment_id: string;
  file_url: string;
};

export default function Attachments({ requestId }: { requestId: string }) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("attachment")
        .select("attachment_id, file_url")
        .eq("request_id", requestId);

      if (data) setAttachments(data);
      setLoading(false);
    }
    load();
  }, [requestId]);

  if (loading || attachments.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {attachments.map((a) => {
        const isVideo =
          a.file_url.includes(".mp4") ||
          a.file_url.includes(".mov") ||
          a.file_url.includes(".webm") ||
          a.file_url.includes(".quicktime");

        return (
          <div key={a.attachment_id}>
            {isVideo ? (
              <video
                src={a.file_url}
                controls
                className="max-h-64 rounded border border-gray-200 dark:border-slate-700"
              />
            ) : (
              <a href={a.file_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={a.file_url}
                  alt="Attachment"
                  className="max-h-48 rounded border border-gray-200 dark:border-slate-700 hover:opacity-90 cursor-pointer"
                />
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
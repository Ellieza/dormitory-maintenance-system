"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Printer,
  FileText,
  CheckCircle2,
  Activity,
  AlertTriangle,
  Star,
  TrendingUp,
} from "lucide-react";

type RequestRow = {
  request_id: string;
  description: string;
  status: string;
  urgency_level: string;
  is_fast_track: boolean;
  date_reported: string;
  date_resolved: string | null;
  dormitory: { name: string } | null;
  category: { category_name: string } | null;
};

type FeedbackRow = {
  request_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

type Stat = { name: string; count: number };

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function computeStats(rows: RequestRow[], key: "category" | "dormitory"): Stat[] {
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const name =
      key === "category"
        ? r.category?.category_name ?? "Unknown"
        : r.dormitory?.name ?? "Unknown dorm";
    counts[name] = (counts[name] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function YearlyReportPage() {
  const [all, setAll] = useState<RequestRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
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

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!profile || profile.role !== "ssf") {
        setError("This page is only for Student Support & Facilities");
        setLoading(false);
        return;
      }

      const [reqRes, fbRes] = await Promise.all([
        supabase
          .from("maintenance_request")
          .select(
            "request_id, description, status, urgency_level, is_fast_track, date_reported, date_resolved, dormitory:dormitory_id (name), category:category_id (category_name)"
          )
          .order("date_reported", { ascending: false })
          .limit(1000),
        supabase
          .from("feedback")
          .select("request_id, rating, comment, created_at")
          .limit(1000),
      ]);

      if (reqRes.error) setError(reqRes.error.message);
      else if (reqRes.data) setAll(reqRes.data as unknown as RequestRow[]);

      if (fbRes.data) setFeedback(fbRes.data as FeedbackRow[]);

      setLoading(false);
    }
    load();
  }, [router]);

  const yearRows = useMemo(
    () => all.filter((r) => new Date(r.date_reported).getFullYear() === year),
    [all, year]
  );

  const total = yearRows.length;
  const resolvedRows = yearRows.filter((r) => r.status === "resolved");
  const resolvedCount = resolvedRows.length;
  const activeCount = total - resolvedCount;
  const criticalCount = yearRows.filter(
    (r) => r.is_fast_track || r.urgency_level === "critical"
  ).length;

  const avgResolutionDays = useMemo(() => {
    const durations = resolvedRows
      .filter((r) => r.date_resolved)
      .map(
        (r) =>
          (new Date(r.date_resolved!).getTime() -
            new Date(r.date_reported).getTime()) /
          (1000 * 60 * 60 * 24)
      );
    if (durations.length === 0) return null;
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }, [resolvedRows]);

  const monthlyCounts = useMemo(() => {
    const counts = Array(12).fill(0);
    for (const r of yearRows) {
      const m = new Date(r.date_reported).getMonth();
      counts[m]++;
    }
    return counts;
  }, [yearRows]);
  const maxMonth = Math.max(...monthlyCounts, 1);
  const busiestMonthIdx = monthlyCounts.indexOf(Math.max(...monthlyCounts));

  const categoryStats = computeStats(yearRows, "category");
  const dormStats = computeStats(yearRows, "dormitory");
  const maxCategory = Math.max(...categoryStats.map((s) => s.count), 1);
  const maxDorm = Math.max(...dormStats.map((s) => s.count), 1);

  const yearRequestIds = new Set(yearRows.map((r) => r.request_id));
  const yearFeedback = feedback.filter((f) => yearRequestIds.has(f.request_id));
  const avgRating =
    yearFeedback.length > 0
      ? yearFeedback.reduce((a, f) => a + f.rating, 0) / yearFeedback.length
      : null;

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    for (const r of all) {
      years.add(new Date(r.date_reported).getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [all]);

  const topDorm = dormStats[0];
  const topCategory = categoryStats[0];
  const generatedDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const allCategories = useMemo(
    () => categoryStats.map((s) => s.name),
    [categoryStats]
  );

  const dormCategoryMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};
    for (const r of yearRows) {
      const dorm = r.dormitory?.name ?? "Unknown";
      const cat = r.category?.category_name ?? "Unknown";
      if (!matrix[dorm]) matrix[dorm] = {};
      matrix[dorm][cat] = (matrix[dorm][cat] ?? 0) + 1;
    }
    return matrix;
  }, [yearRows]);

  const dormTopIssue = useMemo(() => {
    return Object.entries(dormCategoryMatrix)
      .map(([dorm, cats]) => {
        const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
        const totalInDorm = sorted.reduce((sum, [, c]) => sum + c, 0);
        const topCat = sorted[0]?.[0] ?? "—";
        const topCount = sorted[0]?.[1] ?? 0;
        return {
          dorm,
          total: totalInDorm,
          topCategory: topCat,
          topCount,
          concentration: totalInDorm > 0 ? topCount / totalInDorm : 0,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [dormCategoryMatrix]);

  const categoryTopDorm = useMemo(() => {
    return categoryStats.map(({ name: cat }) => {
      const dormsWithCat = Object.entries(dormCategoryMatrix)
        .map(([dorm, cats]) => ({ dorm, count: cats[cat] ?? 0 }))
        .filter((d) => d.count > 0)
        .sort((a, b) => b.count - a.count);
      const totalInCat = dormsWithCat.reduce((sum, d) => sum + d.count, 0);
      return {
        category: cat,
        total: totalInCat,
        topDorm: dormsWithCat[0]?.dorm ?? "—",
        topCount: dormsWithCat[0]?.count ?? 0,
        concentration:
          totalInCat > 0 ? (dormsWithCat[0]?.count ?? 0) / totalInCat : 0,
      };
    });
  }, [categoryStats, dormCategoryMatrix]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-500 dark:text-slate-400 text-sm">
          Loading...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      {/* ============ SCREEN VIEW ============ */}
      <div className="screen-only p-4 sm:p-8">
        <div className="max-w-5xl mx-auto animate-fade-in">
          <div className="no-print">
            <Link
              href="/ssf"
              className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Overview
            </Link>
          </div>

          <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Annual Maintenance Report — {year}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  PNGUoT Dormitory Maintenance System
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-2 rounded-xl hover:from-indigo-700 hover:to-blue-700 font-medium text-sm shadow-lg shadow-indigo-500/20 hover:shadow-xl transition-all"
              >
                <Printer className="w-4 h-4" />
                Print / Save as PDF
              </button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          {total === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-12 text-center">
              <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400 font-medium">
                No reports found for {year}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-4 border-l-4 border-l-blue-500">
                  <div className="flex items-center gap-1.5 mb-1">
                    <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      TOTAL REPORTS
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {total}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-4 border-l-4 border-l-emerald-500">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      RESOLVED
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                    {resolvedCount}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-4 border-l-4 border-l-amber-500">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Activity className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      ACTIVE
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">
                    {activeCount}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-4 border-l-4 border-l-red-500">
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      CRITICAL
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-red-700 dark:text-red-400">
                    {criticalCount}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl p-5 text-white shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4" />
                    <p className="text-xs font-medium opacity-90">
                      AVG RESOLUTION TIME
                    </p>
                  </div>
                  <p className="text-3xl font-bold">
                    {avgResolutionDays !== null
                      ? `${avgResolutionDays.toFixed(1)} days`
                      : "—"}
                  </p>
                  <p className="text-xs opacity-80 mt-1">
                    Across {resolvedCount} resolved report
                    {resolvedCount !== 1 ? "s" : ""}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 text-white shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 fill-white" />
                    <p className="text-xs font-medium opacity-90">
                      AVG STUDENT SATISFACTION
                    </p>
                  </div>
                  <p className="text-3xl font-bold">
                    {avgRating !== null ? `${avgRating.toFixed(1)} / 5` : "—"}
                  </p>
                  <p className="text-xs opacity-80 mt-1">
                    From {yearFeedback.length} feedback response
                    {yearFeedback.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-5 mb-8">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  Reports by Month
                </h2>
                <div className="flex items-end justify-between gap-1 h-40">
                  {MONTHS_SHORT.map((label, i) => {
                    const count = monthlyCounts[i];
                    const height = count === 0 ? 4 : (count / maxMonth) * 100;
                    return (
                      <div
                        key={label}
                        className="flex-1 flex flex-col items-center justify-end h-full"
                      >
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          {count > 0 ? count : ""}
                        </span>
                        <div
                          className={`w-full rounded-t-md transition-all ${
                            count > 0
                              ? "bg-gradient-to-t from-indigo-500 to-blue-400"
                              : "bg-slate-200 dark:bg-slate-700"
                          }`}
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-5">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    Reports by Category
                  </h2>
                  <div className="space-y-3">
                    {categoryStats.map((s) => (
                      <div key={s.name} className="flex items-center gap-3">
                        <span className="w-24 text-sm text-slate-700 dark:text-slate-300 capitalize truncate">
                          {s.name}
                        </span>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-lg h-5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-indigo-500 to-blue-500 h-full rounded-lg"
                            style={{
                              width: `${(s.count / maxCategory) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="w-8 text-sm text-slate-700 dark:text-slate-300 text-right font-semibold">
                          {s.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-5">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    Reports by Dormitory (top 10)
                  </h2>
                  <div className="space-y-3">
                    {dormStats.slice(0, 10).map((s) => (
                      <div key={s.name} className="flex items-center gap-3">
                        <span className="w-32 text-sm text-slate-700 dark:text-slate-300 truncate">
                          {s.name}
                        </span>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-lg h-5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-lg"
                            style={{
                              width: `${(s.count / maxDorm) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="w-8 text-sm text-slate-700 dark:text-slate-300 text-right font-semibold">
                          {s.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {yearFeedback.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-5 mb-8">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    Recent Student Feedback
                  </h2>
                  <div className="space-y-3">
                    {yearFeedback
                      .sort(
                        (a, b) =>
                          new Date(b.created_at).getTime() -
                          new Date(a.created_at).getTime()
                      )
                      .slice(0, 5)
                      .map((f) => (
                        <div
                          key={f.request_id}
                          className="border-l-4 border-l-amber-400 pl-3 py-1"
                        >
                          <div className="flex items-center gap-1 mb-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  s <= f.rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-slate-300 dark:text-slate-600"
                                }`}
                              />
                            ))}
                            <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                              {f.rating}/5
                            </span>
                          </div>
                          {f.comment && (
                            <p className="text-sm text-slate-700 dark:text-slate-300 italic">
                              &ldquo;{f.comment}&rdquo;
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="text-center text-xs text-slate-400 dark:text-slate-500 pb-8">
                Generated by DMS · PNG University of Technology ·{" "}
                {new Date().toLocaleDateString()}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ============ PRINT VIEW (formal) ============ */}
      <div className="print-only">
        {total > 0 && (
          <div className="max-w-none p-0 text-black text-[10.5pt]">
            <header className="text-center border-b-4 border-double border-black pb-6 mb-2">
              <p className="text-[11pt] tracking-[0.3em] uppercase font-medium">
                PNG University of Technology
              </p>
              <p className="text-[10pt] text-gray-700 mt-1">
                Taraka Campus, Lae, Morobe Province
              </p>
              <div className="w-20 h-1 bg-black mx-auto my-4"></div>
              <h1 className="text-[22pt] font-bold">
                Dormitory Maintenance System
              </h1>
              <p className="text-[14pt] mt-2 font-medium">
                Annual Maintenance Report
              </p>
              <p className="text-[32pt] font-bold mt-1 leading-none">{year}</p>
            </header>

            <section className="grid grid-cols-2 gap-6 text-[10pt] py-5 border-b border-black mb-8">
              <div>
                <p className="uppercase tracking-wider text-[8pt] font-medium">
                  Prepared by
                </p>
                <p className="mt-1">Student Support & Facilities</p>
                <p className="text-[9pt] text-gray-700">
                  PNG University of Technology
                </p>
              </div>
              <div className="text-right">
                <p className="uppercase tracking-wider text-[8pt] font-medium">
                  Date generated
                </p>
                <p className="mt-1">{generatedDate}</p>
                <p className="text-[9pt] text-gray-700">
                  Reporting period: 1 January — 31 December {year}
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-[13pt] font-bold border-b border-black pb-1 mb-4">
                1. Executive Summary
              </h2>
              <p className="text-[11pt] leading-relaxed text-justify mb-3">
                During the {year} calendar year, a total of{" "}
                <strong>
                  {total} maintenance report{total !== 1 ? "s" : ""}
                </strong>{" "}
                {total === 1 ? "was" : "were"} filed by students across
                PNGUoT-managed dormitories. Of these,{" "}
                <strong>{resolvedCount}</strong>{" "}
                {resolvedCount === 1 ? "was" : "were"} successfully resolved,{" "}
                <strong>{activeCount}</strong> remained active at the time of
                reporting, and <strong>{criticalCount}</strong>{" "}
                {criticalCount === 1 ? "was" : "were"} classified as critical
                or fast-track issues requiring immediate attention.
              </p>
              {topCategory && (
                <p className="text-[11pt] leading-relaxed text-justify mb-3">
                  The most reported category was{" "}
                  <strong>{capitalize(topCategory.name)}</strong> with{" "}
                  {topCategory.count} report
                  {topCategory.count !== 1 ? "s" : ""}
                  {topDorm && (
                    <>
                      , while <strong>{topDorm.name}</strong> generated the
                      highest volume of reports among individual dormitories
                      with {topDorm.count} report
                      {topDorm.count !== 1 ? "s" : ""}
                    </>
                  )}
                  .
                </p>
              )}
              {avgResolutionDays !== null && (
                <p className="text-[11pt] leading-relaxed text-justify">
                  Average time to resolution was{" "}
                  <strong>
                    <span className="font-mono">
                      {avgResolutionDays.toFixed(1)}
                    </span>{" "}
                    days
                  </strong>
                  {avgRating !== null && (
                    <>
                      , and average student satisfaction across all closed
                      reports was{" "}
                      <strong>
                        <span className="font-mono">
                          {avgRating.toFixed(1)}
                        </span>{" "}
                        out of 5
                      </strong>
                    </>
                  )}
                  .
                </p>
              )}
            </section>

            <section className="mb-10">
              <h2 className="text-[13pt] font-bold border-b border-black pb-1 mb-4">
                2. Key Performance Indicators
              </h2>
              <table className="w-full text-[11pt] border-collapse">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left py-2 font-semibold">Metric</th>
                    <th className="text-right py-2 font-semibold">Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-400">
                    <td className="py-2">Total Reports Filed</td>
                    <td className="py-2 text-right font-medium font-mono">
                      {total}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-400">
                    <td className="py-2">Reports Resolved</td>
                    <td className="py-2 text-right font-medium font-mono">
                      {resolvedCount}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-400">
                    <td className="py-2">Reports Active</td>
                    <td className="py-2 text-right font-medium font-mono">
                      {activeCount}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-400">
                    <td className="py-2">Critical / Fast-Track Reports</td>
                    <td className="py-2 text-right font-medium font-mono">
                      {criticalCount}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-400">
                    <td className="py-2">Average Resolution Time</td>
                    <td className="py-2 text-right font-medium font-mono">
                      {avgResolutionDays !== null
                        ? `${avgResolutionDays.toFixed(1)} days`
                        : "—"}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-400">
                    <td className="py-2">Average Student Satisfaction</td>
                    <td className="py-2 text-right font-medium font-mono">
                      {avgRating !== null
                        ? `${avgRating.toFixed(2)} / 5.00`
                        : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2">Total Feedback Responses</td>
                    <td className="py-2 text-right font-medium font-mono">
                      {yearFeedback.length}
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className="mb-10">
              <h2 className="text-[13pt] font-bold border-b border-black pb-1 mb-4">
                3. Reports by Month
              </h2>
              <p className="text-[10pt] italic mb-4">
                The busiest month was{" "}
                <strong className="not-italic">
                  {MONTHS_LONG[busiestMonthIdx]} {year}
                </strong>{" "}
                with {monthlyCounts[busiestMonthIdx]} report
                {monthlyCounts[busiestMonthIdx] !== 1 ? "s" : ""}.
              </p>
              <table className="w-full text-[10pt] border-collapse">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left py-2 font-semibold w-1/3">
                      Month
                    </th>
                    <th className="text-left py-2 font-semibold">
                      Distribution
                    </th>
                    <th className="text-right py-2 font-semibold w-16">
                      Count
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {MONTHS_LONG.map((m, i) => (
                    <tr key={m} className="border-b border-gray-400">
                      <td className="py-1.5">{m}</td>
                      <td className="py-1.5 pr-4">
                        <div className="w-full bg-gray-200 h-2.5 rounded-sm overflow-hidden">
                          <div
                            className="bg-black h-full"
                            style={{
                              width: `${(monthlyCounts[i] / maxMonth) * 100}%`,
                            }}
                          />
                        </div>
                      </td>
                      <td className="py-1.5 text-right font-medium tabular-nums font-mono">
                        {monthlyCounts[i]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <div className="page-break"></div>

            <section className="mb-10">
              <h2 className="text-[13pt] font-bold border-b border-black pb-1 mb-4">
                4. Reports by Category
              </h2>
              <table className="w-full text-[11pt] border-collapse">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left py-2 font-semibold">Category</th>
                    <th className="text-right py-2 font-semibold w-24">
                      Count
                    </th>
                    <th className="text-right py-2 font-semibold w-24">
                      Share
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categoryStats.map((s) => (
                    <tr key={s.name} className="border-b border-gray-400">
                      <td className="py-2 capitalize">{s.name}</td>
                      <td className="py-2 text-right font-medium tabular-nums font-mono">
                        {s.count}
                      </td>
                      <td className="py-2 text-right tabular-nums font-mono">
                        {total > 0
                          ? `${((s.count / total) * 100).toFixed(1)}%`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-black">
                    <td className="py-2 font-semibold">Total</td>
                    <td className="py-2 text-right font-semibold tabular-nums font-mono">
                      {total}
                    </td>
                    <td className="py-2 text-right font-semibold tabular-nums font-mono">
                      100.0%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </section>

            <section className="mb-10">
              <h2 className="text-[13pt] font-bold border-b border-black pb-1 mb-4">
                5. Reports by Dormitory
              </h2>
              <table className="w-full text-[11pt] border-collapse">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left py-2 font-semibold">Dormitory</th>
                    <th className="text-right py-2 font-semibold w-24">
                      Count
                    </th>
                    <th className="text-right py-2 font-semibold w-24">
                      Share
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dormStats.map((s) => (
                    <tr key={s.name} className="border-b border-gray-400">
                      <td className="py-2">{s.name}</td>
                      <td className="py-2 text-right font-medium tabular-nums font-mono">
                        {s.count}
                      </td>
                      <td className="py-2 text-right tabular-nums font-mono">
                        {total > 0
                          ? `${((s.count / total) * 100).toFixed(1)}%`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <div className="page-break"></div>

            <section className="mb-10">
              <h2 className="text-[13pt] font-bold border-b border-black pb-1 mb-4">
                6. Dormitory × Issue Type Matrix
              </h2>
              <p className="text-[10pt] text-gray-700 italic mb-4">
                Cross-tabulation of every report by dormitory and issue type,
                revealing where specific problems are concentrated.
              </p>
              <table className="w-full text-[9pt] border-collapse">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left py-2 font-semibold">Dormitory</th>
                    {allCategories.map((cat) => (
                      <th
                        key={cat}
                        className="text-right py-2 font-semibold capitalize px-2"
                      >
                        {cat}
                      </th>
                    ))}
                    <th className="text-right py-2 font-semibold px-2">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dormTopIssue.map(({ dorm }) => {
                    const cats = dormCategoryMatrix[dorm] ?? {};
                    const rowTotal = Object.values(cats).reduce(
                      (a, b) => a + b,
                      0
                    );
                    return (
                      <tr key={dorm} className="border-b border-gray-400">
                        <td className="py-1.5 font-medium">{dorm}</td>
                        {allCategories.map((cat) => {
                          const count = cats[cat] ?? 0;
                          const isMax =
                            count > 0 &&
                            count === Math.max(...Object.values(cats));
                          return (
                            <td
                              key={cat}
                              className={`py-1.5 text-right tabular-nums px-2 font-mono ${
                                isMax ? "font-bold" : ""
                              }`}
                            >
                              {count > 0 ? count : "—"}
                            </td>
                          );
                        })}
                        <td className="py-1.5 text-right font-semibold tabular-nums px-2 font-mono">
                          {rowTotal}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-black">
                    <td className="py-2 font-semibold">Total</td>
                    {allCategories.map((cat) => {
                      const count = categoryStats.find(
                        (s) => s.name === cat
                      )?.count;
                      return (
                        <td
                          key={cat}
                          className="py-2 text-right font-semibold tabular-nums px-2 font-mono"
                        >
                          {count ?? 0}
                        </td>
                      );
                    })}
                    <td className="py-2 text-right font-semibold tabular-nums px-2 font-mono">
                      {total}
                    </td>
                  </tr>
                </tfoot>
              </table>
              <p className="text-[8pt] text-gray-600 italic mt-2">
                Bold values indicate the most reported issue type per
                dormitory.
              </p>
            </section>

            <div className="page-break"></div>

            <section className="mb-10">
              <h2 className="text-[13pt] font-bold border-b border-black pb-1 mb-4">
                7. Renovation Priorities
              </h2>
              <p className="text-[11pt] leading-relaxed text-justify mb-5">
                The following analysis identifies dormitories and issue types
                that warrant prioritized attention during the year-end
                maintenance period. Priorities are derived from report volume,
                issue concentration, and specific problem hotspots.
              </p>

              <h3 className="text-[11pt] font-bold mb-3">
                7.1 Priority Dormitories for Renovation
              </h3>
              <p className="text-[10pt] text-gray-700 italic mb-3">
                Ranked by total report volume — these dormitories generated the
                most maintenance demand and should be considered for major
                renovation work.
              </p>
              <table className="w-full text-[10pt] border-collapse mb-6">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left py-2 font-semibold w-8">#</th>
                    <th className="text-left py-2 font-semibold">Dormitory</th>
                    <th className="text-left py-2 font-semibold">
                      Dominant Issue
                    </th>
                    <th className="text-right py-2 font-semibold w-20">
                      Reports
                    </th>
                    <th className="text-right py-2 font-semibold w-28">
                      Concentration
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dormTopIssue.slice(0, 5).map((d, i) => (
                    <tr key={d.dorm} className="border-b border-gray-400">
                      <td className="py-2 font-mono">{i + 1}</td>
                      <td className="py-2 font-medium">{d.dorm}</td>
                      <td className="py-2 capitalize">{d.topCategory}</td>
                      <td className="py-2 text-right font-medium tabular-nums font-mono">
                        {d.total}
                      </td>
                      <td className="py-2 text-right tabular-nums text-gray-700 font-mono">
                        {(d.concentration * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 className="text-[11pt] font-bold mb-3">
                7.2 Issue Type Hotspots
              </h3>
              <p className="text-[10pt] text-gray-700 italic mb-3">
                For each issue type, the dormitory where it is most
                concentrated — pinpointing where repairs of each kind should
                focus.
              </p>
              <table className="w-full text-[10pt] border-collapse mb-6">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left py-2 font-semibold">Issue Type</th>
                    <th className="text-left py-2 font-semibold">
                      Most Affected Dormitory
                    </th>
                    <th className="text-right py-2 font-semibold w-24">
                      Reports
                    </th>
                    <th className="text-right py-2 font-semibold w-28">
                      % of Category
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categoryTopDorm.map((c) => (
                    <tr key={c.category} className="border-b border-gray-400">
                      <td className="py-2 capitalize font-medium">
                        {c.category}
                      </td>
                      <td className="py-2">{c.topDorm}</td>
                      <td className="py-2 text-right font-medium tabular-nums font-mono">
                        {c.topCount}
                      </td>
                      <td className="py-2 text-right tabular-nums text-gray-700 font-mono">
                        {(c.concentration * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 className="text-[11pt] font-bold mb-3">
                7.3 Recommendation
              </h3>
              <p className="text-[11pt] leading-relaxed text-justify mb-3">
                Based on the above analysis, SSF is advised to allocate the
                year-end renovation budget as follows:
              </p>
              <ol className="text-[11pt] leading-relaxed list-decimal pl-6 space-y-1">
                {dormTopIssue.slice(0, 3).map((d, i) => (
                  <li key={d.dorm}>
                    <strong>{d.dorm}</strong> — prioritize{" "}
                    <em>{capitalize(d.topCategory)}</em> repairs, which
                    represent{" "}
                    <span className="font-mono">
                      {(d.concentration * 100).toFixed(0)}%
                    </span>{" "}
                    of the <span className="font-mono">{d.total}</span> report
                    {d.total !== 1 ? "s" : ""} from this dormitory
                    {i === 0 ? " (highest overall volume)" : ""}.
                  </li>
                ))}
                {categoryTopDorm.length > 0 &&
                  (() => {
                    const worst = categoryTopDorm.reduce((a, b) =>
                      a.concentration > b.concentration ? a : b
                    );
                    return (
                      <li>
                        <strong>{worst.topDorm}</strong> shows a concentrated{" "}
                        <em>{capitalize(worst.category)}</em> problem —{" "}
                        <span className="font-mono">
                          {(worst.concentration * 100).toFixed(0)}%
                        </span>{" "}
                        of all {worst.category} reports campus-wide originate
                        here. Consider a targeted intervention.
                      </li>
                    );
                  })()}
              </ol>
            </section>

            <div className="page-break"></div>

            <section className="mb-10">
              <h2 className="text-[13pt] font-bold border-b border-black pb-1 mb-4">
                8. Student Feedback Summary
              </h2>
              {yearFeedback.length === 0 ? (
                <p className="text-[11pt] italic">
                  No student feedback was submitted for reports closed during
                  the {year} reporting period.
                </p>
              ) : (
                <>
                  <p className="text-[11pt] leading-relaxed mb-4">
                    A total of{" "}
                    <strong>
                      {yearFeedback.length} feedback response
                      {yearFeedback.length !== 1 ? "s" : ""}
                    </strong>{" "}
                    {yearFeedback.length === 1 ? "was" : "were"} received, with
                    an average satisfaction rating of{" "}
                    <strong>
                      <span className="font-mono">
                        {avgRating !== null ? avgRating.toFixed(2) : "—"}
                      </span>{" "}
                      out of 5.00
                    </strong>
                    .
                  </p>
                  <table className="w-full text-[10pt] border-collapse mb-6">
                    <thead>
                      <tr className="border-b-2 border-black">
                        <th className="text-left py-2 font-semibold">Rating</th>
                        <th className="text-right py-2 font-semibold w-24">
                          Responses
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[5, 4, 3, 2, 1].map((r) => {
                        const count = yearFeedback.filter(
                          (f) => f.rating === r
                        ).length;
                        return (
                          <tr key={r} className="border-b border-gray-400">
                            <td className="py-1.5">{r} stars</td>
                            <td className="py-1.5 text-right font-medium tabular-nums font-mono">
                              {count}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {yearFeedback.filter((f) => f.comment).length > 0 && (
                    <>
                      <h3 className="text-[11pt] font-semibold mb-3 mt-6">
                        Selected Comments
                      </h3>
                      <div className="space-y-3">
                        {yearFeedback
                          .filter((f) => f.comment)
                          .sort(
                            (a, b) =>
                              new Date(b.created_at).getTime() -
                              new Date(a.created_at).getTime()
                          )
                          .slice(0, 5)
                          .map((f) => (
                            <div
                              key={f.request_id}
                              className="border-l-2 border-black pl-3"
                            >
                              <p className="text-[9pt] uppercase tracking-wider">
                                Rating: {f.rating}/5
                              </p>
                              <p className="text-[11pt] italic mt-0.5">
                                &ldquo;{f.comment}&rdquo;
                              </p>
                            </div>
                          ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </section>

            <section className="mb-10">
              <h2 className="text-[13pt] font-bold border-b border-black pb-1 mb-4">
                9. Conclusions & Recommendations
              </h2>
              <p className="text-[11pt] leading-relaxed text-justify mb-3">
                The {year} reporting period demonstrates the value of a
                digitized maintenance workflow. The{" "}
                <strong>{resolvedCount}</strong> resolved report
                {resolvedCount !== 1 ? "s" : ""} represent
                {resolvedCount === 1 ? "s" : ""}{" "}
                {total > 0
                  ? `${((resolvedCount / total) * 100).toFixed(1)}%`
                  : "0%"}{" "}
                of all filed reports, with an average resolution time of{" "}
                {avgResolutionDays !== null
                  ? `${avgResolutionDays.toFixed(1)} days`
                  : "—"}
                .
              </p>
              {topDorm && topCategory && (
                <p className="text-[11pt] leading-relaxed text-justify mb-3">
                  Cross-tabulation analysis in Section 6 identified{" "}
                  <strong>{topDorm.name}</strong> as the highest-volume
                  dormitory and the{" "}
                  <strong>{capitalize(topCategory.name)}</strong> category as
                  the most common issue type across campus. The year-end
                  maintenance blitz should prioritize these areas, alongside
                  targeted interventions at the specific dormitories flagged in
                  Section 7.3.
                </p>
              )}
              {avgRating !== null && (
                <p className="text-[11pt] leading-relaxed text-justify">
                  Student satisfaction, measured at{" "}
                  <strong>
                    <span className="font-mono">{avgRating.toFixed(2)}</span>{" "}
                    out of 5
                  </strong>
                  , indicates{" "}
                  {avgRating >= 4
                    ? "a high level of satisfaction with maintenance responsiveness"
                    : avgRating >= 3
                    ? "moderate satisfaction with room for improvement in response times"
                    : "a need for improvement in both response times and communication"}
                  . Continued student feedback collection is recommended to
                  track this metric over time.
                </p>
              )}
            </section>

            <footer className="mt-12 pt-6 border-t border-black text-center text-[9pt]">
              <p>End of Report — {year} Annual Maintenance Report</p>
              <p className="mt-1">
                Dormitory Maintenance System · PNG University of Technology
              </p>
              <p className="mt-1 italic">Generated on {generatedDate}</p>
            </footer>
          </div>
        )}
      </div>
    </main>
  );
}
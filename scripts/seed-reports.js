// scripts/seed-reports.js
// Seeds realistic maintenance reports for every student in the system.

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing env vars in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ============================================
// 🎛️  CONFIG
// ============================================
const MIN_REPORTS = 1;
const MAX_REPORTS = 4;
const FEEDBACK_CHANCE = 0.55;   // % of resolved reports that get feedback
const COMMENT_CHANCE = 0.65;    // % of confirmed+ reports that get sub-warden comment
const BATCH_SIZE = 50;
// ============================================

// ===== Descriptions by category =====
const DESCRIPTIONS = {
  plumbing: [
    "The toilet in my room is not flushing properly — water keeps running after use.",
    "The tap in the shared bathroom has been dripping for three days and won't stop.",
    "There is a water leak under the sink in the common room. Water is pooling on the floor.",
    "The shower head is broken and water sprays in all directions.",
    "The drain in the bathroom is blocked and water is not draining properly.",
    "The pipe under the kitchen sink is leaking and has started to damage the cabinet.",
    "The toilet seat is cracked and needs to be replaced.",
    "There is no hot water in the shared shower — only cold water comes out.",
    "The bathroom sink is completely blocked. Water takes hours to drain.",
    "Water is coming out of the wall near the laundry area — possible burst pipe.",
  ],
  electrical: [
    "The power outlet in my room sparks when I plug something in — very concerning.",
    "The ceiling light in the corridor keeps flickering and sometimes goes out completely.",
    "There is no power in the west wing of our floor since last night.",
    "The light switch in the bathroom is not working. It has to be pressed several times.",
    "The wall socket near my bed is loose and does not hold the plug in place.",
    "There is a burning smell coming from the electrical panel on the ground floor.",
    "The main switch in our room trips every time we turn on the air conditioning.",
    "Half of the lights in the common room are not turning on.",
    "The emergency light in the stairwell is not working — safety concern.",
    "The power in my room went out after a storm and never came back on.",
  ],
  pest: [
    "There is a lot of cockroaches in the downstairs kitchen/common room.",
    "There are mosquitoes everywhere due to the rainy weather — can't sleep at night.",
    "I found rat droppings in the pantry area and heard scratching in the ceiling.",
    "There is a wasp nest forming outside my window — needs to be removed.",
    "There are ants in the kitchen area and they keep coming back.",
    "There are spiders in the bathroom — big ones. Several sightings.",
    "The garbage area is attracting flies and maggots. Very unsanitary.",
    "There is a termite problem in the wooden doorframes of my room.",
    "Bed bugs are in the mattress — I have bite marks all over.",
    "There are mice in the common area — I saw one running across the floor.",
  ],
  other: [
    "The window in my room is cracked and does not close properly.",
    "The door to our room does not lock — a security concern.",
    "The door handle is loose and about to fall off.",
    "The ceiling above my bed has started to sag — looks like water damage.",
    "The bed frame is broken and unstable.",
    "The wardrobe door is off its hinges.",
    "There is a hole in the wall of the common room.",
    "The main entrance door is very hard to open and close.",
    "The mirror in the bathroom is cracked.",
    "The wall in my room is growing mold and it smells bad.",
  ],
};

const SUB_WARDEN_COMMENTS = [
  "Verified with student — issue is genuine.",
  "Confirmed on-site — this needs to be fixed promptly.",
  "Checked the room myself — the problem is real.",
  "Student showed me the issue — verified.",
  "Inspected the area — problem confirmed.",
  "Visited the location and can confirm the issue.",
];

const FEEDBACK_COMMENTS_GOOD = [
  "Fixed quickly. Thank you!",
  "Very responsive — the issue was resolved within the day.",
  "Great work by the maintenance team.",
  "Appreciate the fast response. No complaints.",
  "Everything is working perfectly now. Thank you.",
  "Excellent service — well done.",
];

const FEEDBACK_COMMENTS_OK = [
  "Fixed, but it took a few days.",
  "Issue resolved. Could be faster next time.",
  "Happy it's fixed now.",
  "Took a while but got there.",
];

const FEEDBACK_COMMENTS_BAD = [
  "Still not fully fixed.",
  "The repair was rushed and doesn't look right.",
  "Took too long to be resolved.",
];

// ===== Weighted random =====
function weightedPick(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

const CATEGORY_WEIGHTS = [
  { cat: "plumbing", weight: 32 },
  { cat: "electrical", weight: 28 },
  { cat: "pest", weight: 22 },
  { cat: "other", weight: 18 },
];

const STATUS_WEIGHTS = [
  { status: "resolved", weight: 42 },
  { status: "submitted", weight: 18 },
  { status: "approved", weight: 15 },
  { status: "in_progress", weight: 15 },
  { status: "confirmed", weight: 10 },
];

const URGENCY_BY_CATEGORY = {
  plumbing: "medium",
  electrical: "high",
  pest: "critical",
  other: "low",
};

const STATUS_ORDER = ["submitted", "confirmed", "approved", "in_progress", "resolved"];

function randomDate(monthsBack = 10) {
  const now = Date.now();
  const past = now - monthsBack * 30 * 24 * 60 * 60 * 1000;
  return new Date(past + Math.random() * (now - past)).toISOString();
}

function addDays(iso, days) {
  return new Date(new Date(iso).getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("🔍 Loading users, dormitories, categories...\n");

  const [usersRes, dormsRes, catsRes] = await Promise.all([
    supabase.from("users").select("user_id, full_name, role, dormitory_id"),
    supabase.from("dormitory").select("dormitory_id, name, type"),
    supabase.from("category").select("category_id, category_name, default_urgency"),
  ]);

  if (usersRes.error || dormsRes.error || catsRes.error) {
    console.error("❌ Failed to load data");
    process.exit(1);
  }

  const users = usersRes.data;
  const dorms = dormsRes.data;
  const categories = catsRes.data;

  const students = users.filter((u) => u.role === "student" && u.dormitory_id);
  const subWardens = users.filter((u) => u.role === "sub_warden" && u.dormitory_id);
  const matrons = users.filter((u) => u.role === "matron_patron");
  const maintenanceUsers = users.filter((u) => u.role === "maintenance");
  const ssfUsers = users.filter((u) => u.role === "ssf");

  console.log(`👥 Students with dorm:   ${students.length}`);
  console.log(`👮 Sub-Wardens:          ${subWardens.length}`);
  console.log(`📋 Matrons:              ${matrons.length}`);
  console.log(`🔧 Maintenance users:    ${maintenanceUsers.length}`);
  console.log(`🚨 SSF users:            ${ssfUsers.length}\n`);

  if (students.length === 0) {
    console.error("❌ No students found — run add-students.js first");
    process.exit(1);
  }

  // Dorm → category map
  const catMap = {};
  for (const c of categories) catMap[c.category_name] = c;

  // Dorm → sub-warden map
  const swByDorm = {};
  for (const sw of subWardens) swByDorm[sw.dormitory_id] = sw.user_id;

  const anyMatron = matrons[0]?.user_id;
  const anyMaint = maintenanceUsers[0]?.user_id;

  console.log("📝 Generating reports...\n");

  // ===== Build all reports in memory =====
  const reportsToInsert = [];
  const reportMeta = []; // parallel array with metadata for post-processing

  for (const student of students) {
    const numReports = randInt(MIN_REPORTS, MAX_REPORTS);

    for (let i = 0; i < numReports; i++) {
      const { cat: catName } = weightedPick(CATEGORY_WEIGHTS);
      const { status } = weightedPick(STATUS_WEIGHTS);
      const category = catMap[catName];
      if (!category) continue;

      const dateReported = randomDate(10);
      const isPest = catName === "pest";

      const report = {
        student_id: student.user_id,
        dormitory_id: student.dormitory_id,
        category_id: category.category_id,
        description: pick(DESCRIPTIONS[catName]),
        urgency_level: URGENCY_BY_CATEGORY[catName],
        status: "submitted",
        date_reported: dateReported,
        is_fast_track: isPest,
        confirmed_by: null,
        confirmed_at: null,
        approved_by: null,
        approved_at: null,
        date_resolved: null,
        sub_warden_comment: null,
      };

      // Fill in fields based on target status
      const targetIdx = STATUS_ORDER.indexOf(status);
      let confirmDate = null;
      let approveDate = null;
      let resolveDate = null;

      if (targetIdx >= 1 && swByDorm[student.dormitory_id]) {
        confirmDate = addDays(dateReported, randInt(0, 2));
        report.confirmed_by = swByDorm[student.dormitory_id];
        report.confirmed_at = confirmDate;
        report.sub_warden_comment =
          Math.random() < COMMENT_CHANCE ? pick(SUB_WARDEN_COMMENTS) : null;
        report.status = "confirmed";
      }
      if (targetIdx >= 2 && anyMatron && confirmDate) {
        approveDate = addDays(confirmDate, randInt(0, 2));
        report.approved_by = anyMatron;
        report.approved_at = approveDate;
        report.status = "approved";
      }
      if (targetIdx >= 3 && approveDate) {
        report.status = "in_progress";
      }
      if (targetIdx >= 4 && approveDate) {
        resolveDate = addDays(approveDate, randInt(1, 10));
        report.date_resolved = resolveDate;
        report.status = "resolved";
      }

      reportsToInsert.push(report);
      reportMeta.push({
        status: report.status,
        isPest,
        student_id: student.user_id,
        dormitory_id: student.dormitory_id,
        dateReported,
        confirmDate,
        approveDate,
        resolveDate,
        confirmed_by: report.confirmed_by,
        approved_by: report.approved_by,
        subWardenComment: report.sub_warden_comment,
        maintUser: anyMaint,
      });
    }
  }

  console.log(`📦 ${reportsToInsert.length} reports generated`);
  console.log(`📤 Inserting in batches of ${BATCH_SIZE}...\n`);

  // ===== Insert reports in batches =====
  const insertedIds = [];
  for (let i = 0; i < reportsToInsert.length; i += BATCH_SIZE) {
    const batch = reportsToInsert.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from("maintenance_request")
      .insert(batch)
      .select("request_id");

    if (error) {
      console.error(`❌ Report batch ${i / BATCH_SIZE + 1} failed:`, error.message);
      continue;
    }
    insertedIds.push(...data.map((d) => d.request_id));
    process.stdout.write(
      `✓ Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(reportsToInsert.length / BATCH_SIZE)} (${insertedIds.length} reports)\r`
    );
  }
  console.log(`\n\n✅ ${insertedIds.length} reports inserted\n`);

  // ===== Build status_updates =====
  console.log("📝 Building status updates...");
  const statusUpdates = [];
  for (let i = 0; i < insertedIds.length; i++) {
    const id = insertedIds[i];
    const meta = reportMeta[i];

    statusUpdates.push({
      request_id: id,
      updated_by: meta.student_id,
      old_status: null,
      new_status: "submitted",
      notes: "Report submitted",
      timestamp: meta.dateReported,
    });

    if (meta.confirmDate) {
      statusUpdates.push({
        request_id: id,
        updated_by: meta.confirmed_by,
        old_status: "submitted",
        new_status: "confirmed",
        notes: meta.subWardenComment
          ? `Confirmed by Sub-Warden: ${meta.subWardenComment}`
          : "Confirmed by Sub-Warden",
        timestamp: meta.confirmDate,
      });
    }
    if (meta.approveDate) {
      statusUpdates.push({
        request_id: id,
        updated_by: meta.approved_by,
        old_status: "confirmed",
        new_status: "approved",
        notes: "Approved and forwarded to Maintenance by Matron/Patron",
        timestamp: meta.approveDate,
      });
    }
    if (meta.resolveDate && meta.maintUser) {
      statusUpdates.push({
        request_id: id,
        updated_by: meta.maintUser,
        old_status: "approved",
        new_status: "in_progress",
        notes: "Work started by Maintenance",
        timestamp: addDays(meta.approveDate, 1),
      });
      statusUpdates.push({
        request_id: id,
        updated_by: meta.maintUser,
        old_status: "in_progress",
        new_status: "resolved",
        notes: "Marked as resolved by Maintenance",
        timestamp: meta.resolveDate,
      });
    }
  }

  console.log(`📤 Inserting ${statusUpdates.length} status updates...`);
  for (let i = 0; i < statusUpdates.length; i += BATCH_SIZE) {
    const batch = statusUpdates.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("status_update").insert(batch);
    if (error) {
      console.error(`❌ Status update batch ${i / BATCH_SIZE + 1} failed:`, error.message);
    }
  }
  console.log(`✅ Status updates inserted\n`);

  // ===== Build feedback =====
  console.log("📝 Building feedback...");
  const feedbackToInsert = [];
  for (let i = 0; i < insertedIds.length; i++) {
    const id = insertedIds[i];
    const meta = reportMeta[i];
    if (meta.status !== "resolved") continue;
    if (Math.random() > FEEDBACK_CHANCE) continue;

    const rating = weightedPick([
      { r: 5, weight: 45 },
      { r: 4, weight: 30 },
      { r: 3, weight: 15 },
      { r: 2, weight: 7 },
      { r: 1, weight: 3 },
    ]).r;

    let comment = null;
    if (rating >= 4) comment = pick(FEEDBACK_COMMENTS_GOOD);
    else if (rating === 3) comment = pick(FEEDBACK_COMMENTS_OK);
    else comment = pick(FEEDBACK_COMMENTS_BAD);

    feedbackToInsert.push({
      request_id: id,
      student_id: meta.student_id,
      rating,
      comment,
      created_at: addDays(meta.resolveDate, randInt(0, 3)),
    });
  }

  if (feedbackToInsert.length > 0) {
    console.log(`📤 Inserting ${feedbackToInsert.length} feedback entries...`);
    for (let i = 0; i < feedbackToInsert.length; i += BATCH_SIZE) {
      const batch = feedbackToInsert.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from("feedback").insert(batch);
      if (error) console.error(`❌ Feedback batch failed:`, error.message);
    }
    console.log(`✅ Feedback inserted\n`);
  }

  // ===== Build alerts (pest only) =====
  console.log("📝 Building alerts for pest reports...");
  const alertsToInsert = [];
  const recipients = [...maintenanceUsers, ...ssfUsers];

  for (let i = 0; i < insertedIds.length; i++) {
    const id = insertedIds[i];
    const meta = reportMeta[i];
    if (!meta.isPest) continue;
    for (const r of recipients) {
      alertsToInsert.push({
        request_id: id,
        alert_type: "pest_critical",
        sent_to: r.user_id,
        sent_at: meta.dateReported,
      });
    }
  }

  if (alertsToInsert.length > 0) {
    console.log(`📤 Inserting ${alertsToInsert.length} alerts...`);
    for (let i = 0; i < alertsToInsert.length; i += BATCH_SIZE) {
      const batch = alertsToInsert.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from("alert").insert(batch);
      if (error) console.error(`❌ Alert batch failed:`, error.message);
    }
    console.log(`✅ Alerts inserted\n`);
  }

  // ===== Final summary =====
  console.log("\n" + "=".repeat(55));
  console.log("📊 SEEDING COMPLETE");
  console.log("=".repeat(55));
  console.log(`✓ Reports:         ${insertedIds.length}`);
  console.log(`✓ Status updates:  ${statusUpdates.length}`);
  console.log(`✓ Feedback:        ${feedbackToInsert.length}`);
  console.log(`✓ Alerts:          ${alertsToInsert.length}`);
  console.log("=".repeat(55));
  console.log("\n🎉 Check your Supabase Table Editor to verify!");
}

main().catch((e) => {
  console.error("\n❌ Fatal:", e);
  process.exit(1);
});
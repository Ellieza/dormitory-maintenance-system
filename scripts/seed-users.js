// scripts/seed-users.js
// Bulk-create test students and sub-wardens for every dormitory.

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "test1234";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ===== Name pools (PNG-appropriate) =====
const MALE_FIRST = [
  "Peter", "John", "Daniel", "Michael", "Joseph", "Samuel", "Thomas", "David",
  "James", "Paul", "Isaac", "Nathan", "Joshua", "Matthew", "Simon", "Andrew",
  "Philip", "Timothy", "Benjamin", "Abraham", "Moses", "Elijah", "Jeremiah",
  "Isaiah", "Ezekiel", "Joel", "Amos", "Jonah", "Micah", "Zechariah",
  "Nathaniel", "Caleb", "Ethan", "Levi", "Tobias", "Silas", "Elias",
  "Gideon", "Malachi", "Reuben", "Simeon", "Judah", "Levi", "Dan", "Asher",
];

const FEMALE_FIRST = [
  "Grace", "Mary", "Anna", "Rachel", "Sarah", "Rebecca", "Ruth", "Esther",
  "Naomi", "Hannah", "Elizabeth", "Martha", "Lydia", "Priscilla", "Phoebe",
  "Tabitha", "Chloe", "Judith", "Miriam", "Deborah", "Abigail", "Dorcas",
  "Eunice", "Lois", "Damaris", "Bernice", "Drusilla", "Aquila", "Junia",
  "Tryphena", "Tryphosa", "Persis", "Claudia", "Apphia", "Nympha", "Salome",
  "Joanna", "Susanna", "Mary Magdalene", "Veronica", "Prisca", "Candace",
];

const SURNAMES = [
  "Namaliu", "Kilage", "Wambo", "Temu", "Kila", "Kora", "Toma", "Somare",
  "Abel", "Diro", "Wingti", "Skate", "Morauta", "Marape", "Basil", "Duma",
  "Pato", "Polye", "Maru", "Duban", "Marat", "Pundari", "Kua", "Tomuriesa",
  "Muri", "Bogan", "Lama", "Paliau", "Kaupa", "Kandiu", "Bais", "Mora",
  "Tsiamalili", "Pomaleu", "Wong", "Kramer", "Saki", "Iduhu", "Kool",
  "Amuke", "Yama", "Wenge", "Nale", "Tabua", "Nalu", "Kaumu",
];

// ===== Helper: dorm slug for email =====
function dormSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")   // remove non-alphanumerics
    .slice(0, 12);                 // truncate for length
}

// ===== Helper: unique-ish ID for email uniqueness =====
function shortId() {
  return Math.floor(1000 + Math.random() * 9000);
}

// ===== Create one user (auth + profile) =====
async function createOne({
  fullName,
  email,
  role,
  gender,
  dormId,
  taf,
  room,
}) {
  // 1. Create the auth user
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,     // skip email confirmation
  });

  if (authErr) throw new Error(`auth: ${authErr.message}`);

  // 2. Insert the profile
  const { error: profileErr } = await supabase.from("users").insert({
    user_id: authData.user.id,
    full_name: fullName,
    email,
    role,
    gender,
    taf_number: taf,
    room_number: room,
    dormitory_id: dormId,
  });

  if (profileErr) {
    // Roll back the auth user if profile insert fails
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw new Error(`profile: ${profileErr.message}`);
  }

  return authData.user.id;
}

// ===== Small delay helper =====
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ===== Main =====
async function main() {
  console.log("🔍 Fetching dormitories...");

  const { data: dorms, error: dormErr } = await supabase
    .from("dormitory")
    .select("dormitory_id, name, type")
    .order("name");

  if (dormErr) {
    console.error("❌ Failed to fetch dorms:", dormErr.message);
    process.exit(1);
  }

  console.log(`📍 Found ${dorms.length} dorms\n`);

  // Prepare CSV header
  const csvRows = [
    ["Role", "Full Name", "Email", "Password", "Dormitory", "TAF", "Room"],
  ];

  let subWardenCount = 0;
  let studentCount = 0;
  let errorCount = 0;

  // Cycle through names so we don't run out
  let nameIndex = 0;

  for (const dorm of dorms) {
    const isBoys = dorm.type === "boys";
    const pool = isBoys ? MALE_FIRST : FEMALE_FIRST;
    const gender = isBoys ? "male" : "female";
    const slug = dormSlug(dorm.name);

    // ---- SUB-WARDEN ----
    {
      const first = pool[nameIndex % pool.length];
      const last = SURNAMES[nameIndex % SURNAMES.length];
      const email = `sw.${slug}${shortId()}@student.pnguot.ac.pg`;
      const taf = "222" + String(10000 + nameIndex).padStart(5, "0");
      const room = "SW-" + (1 + (nameIndex % 3));
      const fullName = `${first} ${last.toUpperCase()}`;

      try {
        await createOne({
          fullName,
          email,
          role: "sub_warden",
          gender,
          dormId: dorm.dormitory_id,
          taf,
          room,
        });
        subWardenCount++;
        console.log(`✓ Sub-Warden  ${dorm.name.padEnd(28)} → ${email}`);
        csvRows.push(["Sub-Warden", fullName, email, PASSWORD, dorm.name, taf, room]);
      } catch (e) {
        errorCount++;
        console.log(`✗ Sub-Warden  ${dorm.name.padEnd(28)} → ${e.message}`);
      }

      await sleep(120); // small delay to avoid rate limits
    }

    // ---- STUDENT ----
    {
      nameIndex++;
      const first = pool[nameIndex % pool.length];
      const last = SURNAMES[nameIndex % SURNAMES.length];
      const email = `st.${slug}${shortId()}@student.pnguot.ac.pg`;
      const taf = "222" + String(20000 + nameIndex).padStart(5, "0");
      const room =
        String(1 + (nameIndex % 20)) +
        String.fromCharCode(65 + (nameIndex % 4));
      const fullName = `${first} ${last.toUpperCase()}`;

      try {
        await createOne({
          fullName,
          email,
          role: "student",
          gender,
          dormId: dorm.dormitory_id,
          taf,
          room,
        });
        studentCount++;
        console.log(`✓ Student     ${dorm.name.padEnd(28)} → ${email}`);
        csvRows.push(["Student", fullName, email, PASSWORD, dorm.name, taf, room]);
      } catch (e) {
        errorCount++;
        console.log(`✗ Student     ${dorm.name.padEnd(28)} → ${e.message}`);
      }

      await sleep(120);
    }

    nameIndex++;
  }

  // Write CSV
  const csvPath = path.join(process.cwd(), "demo-accounts.csv");
  const csvContent = csvRows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  fs.writeFileSync(csvPath, csvContent);
  console.log(`\n📄 Saved credentials to: ${csvPath}`);

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 SUMMARY");
  console.log("=".repeat(50));
  console.log(`✓ Sub-Wardens created: ${subWardenCount}`);
  console.log(`✓ Students created:    ${studentCount}`);
  console.log(`✗ Errors:              ${errorCount}`);
  console.log(`🔑 All accounts use password: ${PASSWORD}`);
  console.log("=".repeat(50));
}

main().catch((e) => {
  console.error("\n❌ Fatal error:", e);
  process.exit(1);
});
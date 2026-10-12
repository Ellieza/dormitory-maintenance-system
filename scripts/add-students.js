// scripts/add-students.js
// Adds N more students per dormitory (on top of any existing students).

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "test1234";

// ============================================
// 🎛️  CONFIG — change this number to add more/fewer
// ============================================
const ADDITIONAL_STUDENTS_PER_DORM = 4;   // 4 here = 5 total per dorm (1 from earlier script + 4 new)
// ============================================

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing env vars in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ===== Name pools =====
const MALE_FIRST = [
  "Peter", "John", "Daniel", "Michael", "Joseph", "Samuel", "Thomas", "David",
  "James", "Paul", "Isaac", "Nathan", "Joshua", "Matthew", "Simon", "Andrew",
  "Philip", "Timothy", "Benjamin", "Abraham", "Moses", "Elijah", "Jeremiah",
  "Isaiah", "Ezekiel", "Joel", "Amos", "Jonah", "Micah", "Zechariah",
  "Nathaniel", "Caleb", "Ethan", "Levi", "Tobias", "Silas", "Elias",
  "Gideon", "Malachi", "Reuben", "Simeon", "Judah", "Asher", "Aaron",
  "Stephen", "Martin", "Lucas", "Mark", "Luke",
];

const FEMALE_FIRST = [
  "Grace", "Mary", "Anna", "Rachel", "Sarah", "Rebecca", "Ruth", "Esther",
  "Naomi", "Hannah", "Elizabeth", "Martha", "Lydia", "Priscilla", "Phoebe",
  "Tabitha", "Chloe", "Judith", "Miriam", "Deborah", "Abigail", "Dorcas",
  "Eunice", "Lois", "Damaris", "Bernice", "Drusilla", "Aquila", "Junia",
  "Tryphena", "Tryphosa", "Persis", "Claudia", "Apphia", "Nympha", "Salome",
  "Joanna", "Susanna", "Veronica", "Prisca", "Candace", "Rhoda", "Sapphira",
  "Martha", "Magdalene", "Elizabeth", "Miriam", "Rachel",
];

const SURNAMES = [
  "Namaliu", "Kilage", "Wambo", "Temu", "Kila", "Kora", "Toma", "Somare",
  "Abel", "Diro", "Wingti", "Skate", "Morauta", "Marape", "Basil", "Duma",
  "Pato", "Polye", "Maru", "Duban", "Marat", "Pundari", "Kua", "Tomuriesa",
  "Muri", "Bogan", "Lama", "Paliau", "Kaupa", "Kandiu", "Bais", "Mora",
  "Tsiamalili", "Pomaleu", "Wong", "Kramer", "Saki", "Iduhu", "Kool",
  "Amuke", "Yama", "Wenge", "Nale", "Tabua", "Nalu", "Kaumu", "Gari",
  "Wari", "Bagita", "Rakatani",
];

function dormSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 12);
}

function shortId() {
  return Math.floor(10000 + Math.random() * 90000);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function createStudent({ fullName, email, gender, dormId, taf, room }) {
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });

  if (authErr) throw new Error(`auth: ${authErr.message}`);

  const { error: profileErr } = await supabase.from("users").insert({
    user_id: authData.user.id,
    full_name: fullName,
    email,
    role: "student",
    gender,
    taf_number: taf,
    room_number: room,
    dormitory_id: dormId,
  });

  if (profileErr) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw new Error(`profile: ${profileErr.message}`);
  }

  return authData.user.id;
}

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

  console.log(`📍 Found ${dorms.length} dorms`);
  console.log(`👥 Adding ${ADDITIONAL_STUDENTS_PER_DORM} more students per dorm`);
  console.log(`📈 Total new accounts: ${dorms.length * ADDITIONAL_STUDENTS_PER_DORM}\n`);

  let created = 0;
  let errors = 0;
  let nameCounter = Math.floor(Math.random() * 1000);

  for (const dorm of dorms) {
    const isBoys = dorm.type === "boys";
    const pool = isBoys ? MALE_FIRST : FEMALE_FIRST;
    const gender = isBoys ? "male" : "female";
    const slug = dormSlug(dorm.name);

    for (let i = 0; i < ADDITIONAL_STUDENTS_PER_DORM; i++) {
      nameCounter++;
      const first = pool[nameCounter % pool.length];
      const last = SURNAMES[nameCounter % SURNAMES.length];
      const email = `st.${slug}${shortId()}@student.pnguot.ac.pg`;
      const taf = "222" + String(30000 + nameCounter).padStart(5, "0");
      const room = String(1 + (nameCounter % 30)) + String.fromCharCode(65 + (nameCounter % 4));
      const fullName = `${first} ${last.toUpperCase()}`;

      try {
        await createStudent({ fullName, email, gender, dormId: dorm.dormitory_id, taf, room });
        created++;
        if (i === 0) console.log(`✓ ${dorm.name.padEnd(28)} students being added...`);
      } catch (e) {
        errors++;
        console.log(`✗ ${dorm.name.padEnd(28)} ${e.message}`);
      }

      await sleep(100);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 SUMMARY");
  console.log("=".repeat(50));
  console.log(`✓ Students created:  ${created}`);
  console.log(`✗ Errors:            ${errors}`);
  console.log(`🔑 All use password: ${PASSWORD}`);
  console.log("=".repeat(50));
}

main().catch((e) => {
  console.error("\n❌ Fatal:", e);
  process.exit(1);
});
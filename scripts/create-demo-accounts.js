// scripts/create-demo-accounts.js
// Creates 1 clean demo account per role with professional names.

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "demo1234";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing env vars in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function getDormId(name) {
  const { data, error } = await supabase
    .from("dormitory")
    .select("dormitory_id")
    .eq("name", name)
    .single();
  if (error || !data) throw new Error(`Dorm not found: ${name}`);
  return data.dormitory_id;
}

async function createAccount({ fullName, email, role, gender, dormName, taf, room }) {
  let dormitoryId = null;
  if (dormName) dormitoryId = await getDormId(dormName);

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
    role,
    gender: gender ?? null,
    taf_number: taf ?? null,
    room_number: room ?? null,
    dormitory_id: dormitoryId,
  });

  if (profileErr) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw new Error(`profile: ${profileErr.message}`);
  }

  console.log(`✓ ${role.padEnd(14)} → ${email}`);
}

async function main() {
  console.log("🎭 Creating clean demo accounts...\n");

  const accounts = [
    {
      fullName: "Rachel KILAGE",
      email: "rachel.kilage@student.pnguot.ac.pg",
      role: "student",
      gender: "female",
      dormName: "Dame Jane Kekedo (DJK)",
      taf: "22204567",
      room: "12B",
    },
    {
      fullName: "Grace WAMBO",
      email: "grace.wambo@student.pnguot.ac.pg",
      role: "sub_warden",
      gender: "female",
      dormName: "Dame Jane Kekedo (DJK)",
      taf: "22206789",
      room: "SW-1",
    },
    {
      fullName: "Anna TEMU",
      email: "anna.temu@pnguot.ac.pg",
      role: "matron_patron",
    },
    {
      fullName: "Daniel KORA",
      email: "daniel.kora@pnguot.ac.pg",
      role: "maintenance",
    },
    {
      fullName: "Rebecca TOMA",
      email: "rebecca.toma@pnguot.ac.pg",
      role: "ssf",
    },
  ];

  for (const acc of accounts) {
    try {
      await createAccount(acc);
    } catch (e) {
      console.log(`✗ ${acc.email} → ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎭 DEMO ACCOUNTS READY");
  console.log("=".repeat(60));
  console.log(`🔑 All use password: ${PASSWORD}`);
  console.log("=".repeat(60));
  console.log("STUDENT:     rachel.kilage@student.pnguot.ac.pg");
  console.log("SUB-WARDEN:  grace.wambo@student.pnguot.ac.pg");
  console.log("MATRON:      anna.temu@pnguot.ac.pg");
  console.log("MAINTENANCE: daniel.kora@pnguot.ac.pg");
  console.log("SSF:         rebecca.toma@pnguot.ac.pg");
  console.log("=".repeat(60));
}

main().catch((e) => {
  console.error("\n❌ Fatal:", e);
  process.exit(1);
});
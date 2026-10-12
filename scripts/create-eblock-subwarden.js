// scripts/create-eblock-subwarden.js
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

async function main() {
  console.log("🎭 Creating E Block Sub-Warden...\n");

  // Get E Block dorm ID
  const { data: dorm, error: dormErr } = await supabase
    .from("dormitory")
    .select("dormitory_id, name")
    .eq("name", "E Block")
    .single();

  if (dormErr || !dorm) {
    console.error("❌ E Block dorm not found:", dormErr?.message);
    process.exit(1);
  }

  console.log(`📍 Found dorm: ${dorm.name}`);

  const email = "john.muri@student.pnguot.ac.pg";
  const fullName = "John MURI";

  // Create auth user
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });

  if (authErr) {
    console.error("❌ Auth error:", authErr.message);
    process.exit(1);
  }

  // Create profile
  const { error: profileErr } = await supabase.from("users").insert({
    user_id: authData.user.id,
    full_name: fullName,
    email,
    role: "sub_warden",
    gender: "male",
    taf_number: "22207777",
    room_number: "SW-E",
    dormitory_id: dorm.dormitory_id,
  });

  if (profileErr) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    console.error("❌ Profile error:", profileErr.message);
    process.exit(1);
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ E BLOCK SUB-WARDEN CREATED");
  console.log("=".repeat(60));
  console.log(`Name:     ${fullName}`);
  console.log(`Email:    ${email}`);
  console.log(`Password: ${PASSWORD}`);
  console.log(`Dorm:     ${dorm.name}`);
  console.log("=".repeat(60));
}

main().catch((e) => {
  console.error("❌ Fatal:", e);
  process.exit(1);
});
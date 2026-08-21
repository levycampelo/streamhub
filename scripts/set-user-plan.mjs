function normalizePlan(raw) {
  const value = (raw || "").trim().toLowerCase();
  if (value === "basico" || value === "basic") return "basico";
  if (value === "premium") return "premium";
  return null;
}

function parseArgs(argv) {
  const args = argv.slice(2);

  // Simple positional format:
  // node scripts/set-user-plan.mjs user@email.com basico
  if (args.length >= 2 && !args[0].startsWith("--")) {
    return {
      email: args[0],
      plan: args[1],
    };
  }

  // Flag format:
  // node scripts/set-user-plan.mjs --email user@email.com --plan premium
  const result = {};
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === "--email") {
      result.email = args[i + 1];
      i += 1;
      continue;
    }
    if (token === "--plan") {
      result.plan = args[i + 1];
      i += 1;
      continue;
    }
  }

  return result;
}

function printHelpAndExit(code = 1) {
  console.log("Usage:");
  console.log("  npm run plan:set -- <email> <basico|premium>");
  console.log("  npm run plan:set -- --email <email> --plan <basico|premium>");
  console.log("");
  console.log("Examples:");
  console.log("  npm run plan:set -- levy@exemplo.com basico");
  console.log("  npm run plan:set -- --email levy@exemplo.com --plan premium");
  process.exit(code);
}

async function main() {
  const { email, plan } = parseArgs(process.argv);

  const normalizedEmail = (email || "").trim().toLowerCase();
  const normalizedPlan = normalizePlan(plan);

  if (!normalizedEmail || !normalizedPlan) {
    printHelpAndExit(1);
  }

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!supabaseUrl || !serviceRole) {
    console.error("Missing Supabase env vars.");
    console.error("Required: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const now = new Date().toISOString();
  const endpoint = `${supabaseUrl}/rest/v1/app_users?email=eq.${encodeURIComponent(normalizedEmail)}`;

  const response = await fetch(endpoint, {
    method: "PATCH",
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      plan: normalizedPlan,
      updated_at: now,
    }),
  });

  const bodyText = await response.text();

  if (!response.ok) {
    console.error("Failed to update plan.");
    console.error("Status:", response.status);
    console.error("Response:", bodyText);

    if (bodyText.includes("column") && bodyText.includes("plan")) {
      console.error("Tip: create the plan column first:");
      console.error("  alter table public.app_users add column if not exists plan text;");
    }

    process.exit(1);
  }

  let rows = [];
  try {
    rows = JSON.parse(bodyText);
  } catch {
    rows = [];
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    console.error("No user found with this email:", normalizedEmail);
    process.exit(1);
  }

  console.log("Plan updated successfully.");
  console.log(`email=${normalizedEmail} plan=${normalizedPlan}`);
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});

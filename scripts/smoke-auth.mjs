const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function check(urlPath, validator) {
  const response = await fetch(`${baseUrl}${urlPath}`, {
    redirect: "manual",
  });

  validator(response);
  console.log(`OK ${urlPath} -> ${response.status}`);
}

(async () => {
  await check("/login", (res) => {
    assert(res.status === 200, "Login page should return 200");
  });

  await check("/watchlist", (res) => {
    assert([302, 303, 307, 308].includes(res.status), "Watchlist should redirect when unauthenticated");
  });

  await check("/deep-links", (res) => {
    assert([302, 303, 307, 308].includes(res.status), "Deep-links should redirect when unauthenticated");
  });

  await check("/concierge", (res) => {
    assert([302, 303, 307, 308].includes(res.status), "Concierge page should redirect when unauthenticated");
  });

  await check("/api/concierge", (res) => {
    assert([302, 303, 307, 308].includes(res.status), "Concierge API should redirect when unauthenticated");
  });

  await check("/api/subscriptions", (res) => {
    assert([302, 303, 307, 308].includes(res.status), "Subscriptions API should redirect when unauthenticated");
  });

  await check("/api/alerts/economy", (res) => {
    assert([302, 303, 307, 308].includes(res.status), "Alerts API should redirect when unauthenticated");
  });

  await check("/api/auth/providers", (res) => {
    assert(res.status === 200, "Auth providers endpoint should return 200");
  });

  const providersRes = await fetch(`${baseUrl}/api/auth/providers`);
  const providersJson = await providersRes.json();
  assert(Boolean(providersJson.google), "Google provider must be configured");
  assert(!providersJson.apple, "Apple provider must be disabled in Google-only mode");

  console.log("Smoke auth suite passed.");
})().catch((error) => {
  console.error("Smoke auth suite failed:", error.message);
  process.exit(1);
});

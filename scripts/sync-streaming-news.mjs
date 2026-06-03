const baseUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
const cronSecret = process.env.STREAMING_NEWS_CRON_SECRET || process.env.CRON_SECRET;

if (!cronSecret) {
  console.error("Missing STREAMING_NEWS_CRON_SECRET or CRON_SECRET");
  console.error("Tip: export STREAMING_NEWS_CRON_SECRET='your-secret' before running this script.");
  process.exit(1);
}

const response = await fetch(`${baseUrl}/api/cron/streaming-news/sync`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${cronSecret}`,
  },
});

const body = await response.text();

if (!response.ok) {
  console.error("Sync failed", response.status, body);
  process.exit(1);
}

console.log(body);

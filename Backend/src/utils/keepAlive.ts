import https from "https";
import http from "http";

export const startKeepAlive = () => {
  // Render automatically provides RENDER_EXTERNAL_URL.
  // We can also check other common env vars just in case.
  const url = process.env.RENDER_EXTERNAL_URL || process.env.RAILWAY_STATIC_URL || process.env.PUBLIC_API_URL;

  if (!url) {
    console.log("⚠️ No external URL (RENDER_EXTERNAL_URL) found. Keep-alive self-ping disabled.");
    return;
  }

  // Ping every 10 minutes (Free tier providers usually sleep after 10 mins)
  const pingInterval = 10 * 60 * 1000;

  setInterval(() => {
    console.log(`[Keep-Alive] Pinging ${url} to prevent server sleep...`);
    const lib = url.startsWith("https") ? https : http;

    lib.get(url, (res) => {
      console.log(`[Keep-Alive] Success! Status Code: ${res.statusCode}`);
    }).on("error", (err) => {
      console.error("[Keep-Alive] Ping failed:", err.message);
    });
  }, pingInterval);

  console.log(`⏰ Keep-alive service started for ${url} (pings every 10 mins)`);
};

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

async function scrape() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
    ],
  });

  const page = await browser.newPage();

  // Speed up & avoid resource hangs
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (["image", "stylesheet", "font", "media"].includes(req.resourceType())) {
      req.abort();
    } else {
      req.continue();
    }
  });

  // Use domcontentloaded (avoids infinite wait on ads/analytics)
  await page.goto("https://runescape.wiki/w/Wilderness_Flash_Events", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  // Extract the schedule
  const schedule = await page.evaluate(() => {
    const rows = [
      ...document.querySelectorAll(
        "table#wfe-rotations tbody tr, table#reload tbody tr"
      ),
    ];
    const data = [];

    rows.forEach((row) => {
      const cols = row.querySelectorAll("td");
      if (cols.length >= 2) {
        const eventName = cols[0].querySelector("a")?.textContent.trim() || "";
        const specialLabel =
          cols[0].querySelector("i small")?.textContent.trim() || "";
        const fullName = specialLabel ? `${eventName} Special` : eventName;
        const time = cols[1].querySelector("small")?.textContent.trim() || "";

        if (/^\d{2}:\d{2}$/.test(time)) {
          data.push({ event: fullName, date: time });
        }
      }
    });

    return data;
  });

  await browser.close();

  // Write to file
  const filePath = path.join(process.cwd(), "events.json");
  fs.writeFileSync(filePath, JSON.stringify(schedule, null, 2));
  console.log(`✅ Wrote ${schedule.length} events to ${filePath}`);
}

// Retry wrapper
async function runWithRetries(fn, retries = 3, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      console.error(`⚠️ Attempt ${i + 1} failed:`, err.message);
      if (i < retries - 1) {
        console.log(`⏳ Retrying in ${delay / 1000}s...`);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        throw err;
      }
    }
  }
}

// Run with retries
runWithRetries(scrape, 3, 5000).catch((err) => {
  console.error("❌ Scraping failed after retries:", err);
  process.exit(1);
});

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

async function scrape() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage", // reduces memory issues in containers
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process", // <- sometimes needed, try removing if issues persist
      "--disable-gpu",
    ],
  });
  const page = await browser.newPage();

  await page.goto("https://runescape.wiki/w/Wilderness_Flash_Events", {
    waitUntil: "networkidle0",
  });

  // Extract the schedule from the live rendered table
  const schedule = await page.evaluate(() => {
    const rows = [
      ...document.querySelectorAll(
        "table#wfe-rotations, table#reload tbody tr"
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

scrape().catch((err) => {
  console.error("❌ Scraping failed:", err);
  process.exit(1);
});

const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

async function scrape() {
  try {
    const res = await axios.get(
      "https://runescape.wiki/w/Wilderness_Flash_Events",
      { headers: { "Cache-Control": "no-cache" } }
    );
    console.log(`HTTP status: ${res.status}`);

    const $ = cheerio.load(res.data);
    const schedule = [];

    // Select the specific table by its ID "reload"
    $("table#reload tbody tr").each((i, el) => {
      const cols = $(el).find("td");
      if (cols.length >= 2) {
        // Event name from first <td> <a>
        const eventName = $(cols[0]).find("a").text().trim();

        // Check if there is a special label in <i><small>
        const specialLabel = $(cols[0]).find("i small").text().trim();

        // Combine event name with " Special" if special label exists
        const fullName = specialLabel ? `${eventName} Special` : eventName;

        // Time from second <td> <small>
        const time = $(cols[1]).find("small").text().trim();

        // Validate time format hh:mm before pushing
        if (/^\d{2}:\d{2}$/.test(time)) {
          console.log(`Scraped event: "${fullName}" at time: ${time}`); // Debug log
          schedule.push({ event: fullName, date: time });
        }
      }
    });

    console.log(`Filtered down to ${schedule.length} valid events`);

    const filePath = path.join(process.cwd(), "events.json");
    fs.writeFileSync(filePath, JSON.stringify(schedule, null, 2));
    console.log(`✅ Wrote ${schedule.length} events to ${filePath}`);
  } catch (err) {
    console.error("❌ Scraping failed:", err);
    process.exit(1);
  }
}

scrape().catch((err) => {
  console.error("❌ Scraping failed:", err);
  process.exit(1);
});

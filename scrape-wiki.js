const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

async function scrape() {
  try {
    const res = await axios.get(
      "https://runescape.wiki/w/Wilderness_Flash_Events"
    );
    console.log(`HTTP status: ${res.status}`);

    const $ = cheerio.load(res.data);

    const schedule = [];

    // Find the "Current rotation" table
    $("caption:contains('Current rotation')")
      .closest("table")
      .find("tbody tr")
      .each((i, el) => {
        const cols = $(el).find("td");
        if (cols.length >= 2) {
          const name = $(cols[0]).text().trim();
          const date = $(cols[1]).text().trim();

          // Only keep valid times and event names
          if (/^\d{2}:\d{2}$/.test(date) && /^[A-Za-z].+/.test(name)) {
            schedule.push({ event: name, time: date });
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

scrape();

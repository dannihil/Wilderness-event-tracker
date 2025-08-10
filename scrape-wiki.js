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

    $("table.wikitable tbody tr").each((i, el) => {
      const cols = $(el).find("td");
      if (cols.length >= 2) {
        const name = $(cols[0]).text().trim();
        const date = $(cols[1]).text().trim();

        // Filtering logic
        const isTimeFormat = /^\d{2}:\d{2}$/.test(date); // date should be a time
        const isEventName = /^[A-Za-z].+/.test(name) && !/^\d+$/.test(name); // name should be a string, not a number

        if (isTimeFormat && isEventName) {
          schedule.push({ event: name, date });
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

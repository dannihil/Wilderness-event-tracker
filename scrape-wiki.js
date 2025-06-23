const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

async function scrape() {
  const res = await axios.get(
    "https://runescape.wiki/w/Wilderness_Flash_Events"
  );
  const $ = cheerio.load(res.data);

  const schedule = [];

  $("table.wikitable tbody tr").each((i, el) => {
    const cols = $(el).find("td");
    if (cols.length >= 2) {
      const date = $(cols[0]).text().trim();
      const name = $(cols[1]).text().trim();
      schedule.push({ date, event: name });
    }
  });

  const filePath = path.join(__dirname, "events.json");
  fs.writeFileSync(filePath, JSON.stringify(schedule, null, 2));
  console.log(`✅ Wrote ${schedule.length} events to events.json`);
}

scrape().catch((err) => {
  console.error("❌ Scraping failed:", err);
  process.exit(1);
});

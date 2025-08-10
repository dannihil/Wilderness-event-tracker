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

    // Select table by id
    const table = $("table#wfe-rotations, table#reload").first();

    table.find("tbody tr").each((i, el) => {
      const cols = $(el).find("td");

      // Ignore rows without exactly 2 columns (to skip summary rows)
      if (cols.length !== 2) return;

      // Extract event name (including "Special" if present)
      let name = $(cols[0]).find("a").first().text().trim();

      // Check for "Special" in italics inside the same cell and append it
      if ($(cols[0]).find("i small").length > 0) {
        name += " Special";
      }

      // Extract time string inside <small>
      const timeStr = $(cols[1]).find("small").first().text().trim();

      // Validate time format
      if (!/^\d{2}:\d{2}$/.test(timeStr)) {
        console.warn(`Invalid time format for event '${name}': ${timeStr}`);
        return;
      }

      schedule.push({ event: name, date: timeStr });
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

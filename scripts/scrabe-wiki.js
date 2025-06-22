const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

async function scrape() {
  const res = await axios.get(
    "https://runescape.wiki/w/Wilderness_Flash_Events"
  );
  const $ = cheerio.load(res.data);

  const schedule = [];

  // Find the rotation table and loop through rows
  $("table.wikitable tbody tr").each((i, el) => {
    const cols = $(el).find("td");
    if (cols.length >= 2) {
      const date = $(cols[0]).text().trim();
      const name = $(cols[1]).text().trim();

      // Parse date to ISO string here if possible
      schedule.push({ date, event: name });
    }
  });

  fs.writeFileSync("events.json", JSON.stringify(schedule, null, 2));
}

scrape();

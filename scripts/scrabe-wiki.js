const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

async function scrape() {
  try {
    const res = await axios.get(
      "https://runescape.wiki/w/Wilderness_Flash_Events"
    );
    const $ = cheerio.load(res.data);

    const schedule = [];

    // Loop through rows of the main rotation table (assuming first table with class wikitable)
    $("table.wikitable tbody tr").each((i, el) => {
      const cols = $(el).find("td");
      if (cols.length >= 2) {
        const date = $(cols[0]).text().trim();
        const name = $(cols[1]).text().trim();

        // You can add more parsing here (e.g. location, info) if available

        schedule.push({ date, event: name });
      }
    });

    // Write events.json to project root
    const filePath = path.join(__dirname, "events.json");
    fs.writeFileSync(filePath, JSON.stringify(schedule, null, 2));
    console.log(`Wrote ${schedule.length} events to events.json`);
  } catch (error) {
    console.error("Failed to scrape:", error);
  }
}

scrape();

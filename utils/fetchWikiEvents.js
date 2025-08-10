import fs from "fs/promises";
import { createRequire } from "module";
import fetch from "node-fetch";
import path from "path";
const require = createRequire(import.meta.url);
const cheerio = require("cheerio");

const WIKI_URL = "https://runescape.wiki/w/Wilderness_Flash_Events";

async function fetchWikiEvents() {
  try {
    const res = await fetch(WIKI_URL);
    const html = await res.text();

    const $ = cheerio.load(html);

    const table = $("#reload");
    if (!table.length) throw new Error("Events table not found");

    const events = [];

    table.find("tbody tr").each((_, el) => {
      const tds = $(el).find("td");
      if (tds.length === 2) {
        const eventName = $(tds[0]).text().trim().replace(/\s+/g, " ");
        const eventTime = $(tds[1]).text().trim();
        if (
          eventName &&
          eventTime &&
          !eventName.toLowerCase().includes("next")
        ) {
          events.push({ event: eventName, date: eventTime });
        }
      }
    });

    return events;
  } catch (err) {
    console.error("Error fetching wiki events:", err);
    return null;
  }
}

async function main() {
  const events = await fetchWikiEvents();
  if (!events) {
    console.error("Failed to fetch events");
    return;
  }

  console.log("Events:", events);

  const filePath = path.join(process.cwd(), "..", "events.json");

  try {
    await fs.writeFile(filePath, JSON.stringify(events, null, 2), "utf-8");
    console.log(`Events saved to ${filePath}`);
  } catch (writeErr) {
    console.error("Error writing events.json:", writeErr);
  }
}

main();

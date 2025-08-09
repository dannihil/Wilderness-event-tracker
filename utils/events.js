// utils/events.js

const EVENTS_URL =
  "https://raw.githubusercontent.com/dannihil/Wilderness-event-tracker/main/events.json";

export function getNextOccurrence(timeStr) {
  const [hour, minute] = timeStr.split(":").map(Number);
  const now = new Date();
  let eventDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hour,
    minute,
    0,
    0
  );
  if (eventDate <= now) {
    eventDate.setDate(eventDate.getDate() + 1);
  }
  return eventDate;
}

export function isSpecialEvent(event) {
  return event.event.toLowerCase().includes("special");
}

export async function fetchScheduleFromRemote() {
  try {
    const res = await fetch(EVENTS_URL);
    const data = await res.json();

    if (!data || data.length === 0) {
      return [];
    }

    const scheduledEvents = data.map((event) => ({
      ...event,
      start: getNextOccurrence(event.date),
    }));

    scheduledEvents.sort((a, b) => a.start - b.start);

    return scheduledEvents;
  } catch (err) {
    console.error("Failed to fetch event schedule:", err);
    return [];
  }
}

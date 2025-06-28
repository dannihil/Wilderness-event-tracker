export function buildSchedule(events) {
  const now = new Date();
  return events.map(({ event, date }) => {
    const [hour, minute] = date.split(":").map(Number);
    const eventDate = new Date(now);
    eventDate.setHours(hour, minute, 0, 0);
    if (eventDate <= now) {
      eventDate.setDate(eventDate.getDate() + 1);
    }
    return { event, start: eventDate };
  });
}

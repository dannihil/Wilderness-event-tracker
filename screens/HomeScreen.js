import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

const EVENTS_URL =
  "https://raw.githubusercontent.com/dannihil/Wilderness-event-tracker/main/events.json";

export default function HomeScreen() {
  const [schedule, setSchedule] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [nextEvents, setNextEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState("");

  // Convert "HH:mm" time string into next Date occurrence (today or tomorrow)
  function getNextOccurrence(timeStr) {
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
      // event time already passed today, schedule for tomorrow
      eventDate.setDate(eventDate.getDate() + 1);
    }
    return eventDate;
  }

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const res = await fetch(EVENTS_URL);
        const data = await res.json();

        // Map events adding the precise next Date for each event time
        const scheduledEvents = data.map((event) => ({
          ...event,
          start: getNextOccurrence(event.event), // event.event is time string like "11:00"
        }));

        // Sort by start date ascending
        scheduledEvents.sort((a, b) => a.start - b.start);

        setSchedule(scheduledEvents);

        const now = new Date();

        // Find current event: event where now >= start and now < next event start
        let current = null;
        for (let i = 0; i < scheduledEvents.length; i++) {
          const start = scheduledEvents[i].start;
          const nextStart =
            scheduledEvents[i + 1]?.start ||
            new Date(start.getTime() + 24 * 60 * 60 * 1000); // fallback next day
          if (now >= start && now < nextStart) {
            current = scheduledEvents[i];
            break;
          }
        }

        // If no current event found (before first event), fallback to first event as current
        if (!current) current = scheduledEvents[0];

        // Next 5 events after current event
        const currentIndex = scheduledEvents.indexOf(current);
        const future = scheduledEvents.slice(
          currentIndex + 1,
          currentIndex + 6
        );

        setCurrentEvent(current);
        setNextEvents(future);
      } catch (err) {
        console.error("Failed to fetch event schedule:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, []);

  // Countdown timer for current event start
  useEffect(() => {
    if (!currentEvent) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diffMs = currentEvent.start - now;

      if (diffMs <= 0) {
        setCountdown("Event is live now!");
        return;
      }

      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);

      setCountdown(
        `${diffHrs.toString().padStart(2, "0")}:${diffMins
          .toString()
          .padStart(2, "0")}:${diffSecs.toString().padStart(2, "0")}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [currentEvent]);

  if (loading) {
    return <ActivityIndicator style={styles.loader} size="large" />;
  }

  if (!currentEvent) {
    return <Text style={styles.error}>No current event found.</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🌋 Current Wilderness Flash Event</Text>
      <Text style={styles.eventName}>{currentEvent.date}</Text>
      <Text style={styles.timer}>
        Starts at: {currentEvent.start.toLocaleTimeString()} (Countdown:{" "}
        {countdown})
      </Text>

      <Text style={styles.timer}>Next 5 Events:</Text>
      {nextEvents.map((e, i) => (
        <Text key={i} style={styles.upcoming}>
          🕒 {e.start.toLocaleTimeString()}: {e.date}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, marginTop: 50 },
  header: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  eventName: { fontSize: 18, fontWeight: "600", marginBottom: 10 },
  timer: { fontSize: 16, fontWeight: "500", marginTop: 10 },
  upcoming: { fontSize: 14, marginVertical: 2 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  error: { padding: 20, color: "red" },
});

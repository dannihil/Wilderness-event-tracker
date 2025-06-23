import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

const EVENTS_URL =
  "https://raw.githubusercontent.com/dannihil/Wilderness-event-tracker/main/events.json";

export default function HomeScreen() {
  const [schedule, setSchedule] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [nextEvents, setNextEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const res = await fetch(EVENTS_URL);
        const data = await res.json();
        const now = new Date();
        const today = now.toISOString().split("T")[0]; // YYYY-MM-DD

        // Map event times into Date objects
        const parsedEvents = data.map((e) => {
          const [hour, minute = "00"] = e.event.split(":");
          const start = new Date(today);
          start.setHours(parseInt(hour), parseInt(minute), 0, 0);
          if (start < now) start.setDate(start.getDate() + 1); // move to next day if already passed
          return { ...e, start };
        });

        // Sort by start time
        parsedEvents.sort((a, b) => a.start - b.start);

        const current =
          parsedEvents.find((e, i) => {
            const next = parsedEvents[i + 1];
            return now >= e.start && (!next || now < next.start);
          }) || parsedEvents[0];

        const future = parsedEvents.filter((e) => e.start > now).slice(0, 5);

        setSchedule(parsedEvents);
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
      <Text style={styles.timer}>Next 5 Events:</Text>
      {nextEvents.map((e, i) => (
        <Text key={i} style={styles.upcoming}>
          🕒 {e.start.toLocaleString()}: {e.date}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, marginTop: 50 },
  header: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  eventName: { fontSize: 18, fontWeight: "600", marginBottom: 10 },
  timer: { fontSize: 16, fontWeight: "500", marginTop: 20 },
  upcoming: { fontSize: 14, marginVertical: 2 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  error: { padding: 20, color: "red" },
});

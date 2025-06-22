import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

const EVENTS_URL =
  "https://raw.githubusercontent.com/dannihil/Wilderness-event-tracker/main/events.json";

export default function HomeScreen() {
  const [schedule, setSchedule] = useState(null);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [nextEvents, setNextEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const res = await fetch(EVENTS_URL);
        const data = await res.json();
        setSchedule(data);
        const now = new Date();

        // Find current and next events
        const current = data.find((e, i) => {
          const start = new Date(e.start);
          const next = data[i + 1] && new Date(data[i + 1].start);
          return now >= start && (!next || now < next);
        });

        const future = data.filter((e) => new Date(e.start) > now).slice(0, 5);

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
      <Text style={styles.eventName}>{currentEvent.event}</Text>
      <Text style={styles.timer}>Next 5 Events:</Text>
      {nextEvents.map((e, i) => (
        <Text key={i} style={styles.upcoming}>
          🕒 {new Date(e.start).toLocaleString()}: {e.event}
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

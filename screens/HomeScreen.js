import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const EVENTS_URL =
  "https://raw.githubusercontent.com/dannihil/Wilderness-event-tracker/main/events.json";

const NOTIFY_PREF_KEY = "notifyPreference";
const NOTIFY_MINUTES_KEY = "notifyMinutesBefore";

export default function HomeScreen() {
  const [schedule, setSchedule] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [nextEvents, setNextEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState("");
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [filterSpecial, setFilterSpecial] = useState(false);
  const [notifyPreference, setNotifyPreference] = useState("none"); // "all" | "special" | "none"
  const [notifyMinutesBefore, setNotifyMinutesBefore] = useState(15); // default 15 minutes

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
      eventDate.setDate(eventDate.getDate() + 1);
    }
    return eventDate;
  }

  // Helper: check if event is special
  function isSpecialEvent(event) {
    return event.event.toLowerCase().includes("special");
  }

  // Load schedule and set state
  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const res = await fetch(EVENTS_URL);
        const data = await res.json();

        const scheduledEvents = data.map((event) => ({
          ...event,
          start: getNextOccurrence(event.date),
        }));

        scheduledEvents.sort((a, b) => a.start - b.start);

        setSchedule(scheduledEvents);

        const now = new Date();

        // Find current event as before
        let current = null;
        for (let i = 0; i < scheduledEvents.length; i++) {
          const start = scheduledEvents[i].start;
          const nextStart =
            scheduledEvents[i + 1]?.start ||
            new Date(start.getTime() + 24 * 60 * 60 * 1000);
          if (now >= start && now < nextStart) {
            current = scheduledEvents[i];
            break;
          }
        }

        if (!current) current = scheduledEvents[0];

        const currentIndex = scheduledEvents.indexOf(current);
        const future = scheduledEvents.slice(
          currentIndex + 1,
          scheduledEvents.length
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

  // Load notify preferences on mount
  useEffect(() => {
    const loadNotifyPrefs = async () => {
      try {
        const pref = await AsyncStorage.getItem(NOTIFY_PREF_KEY);
        if (pref === "all" || pref === "special" || pref === "none") {
          setNotifyPreference(pref);
        }
        const minutesStr = await AsyncStorage.getItem(NOTIFY_MINUTES_KEY);
        const minutes = parseInt(minutesStr, 10);
        if (!isNaN(minutes) && minutes > 0) {
          setNotifyMinutesBefore(minutes);
        }
      } catch (err) {
        console.error("Failed to load notify preferences", err);
      }
    };
    loadNotifyPrefs();
  }, []);

  // When notifyPreference, notifyMinutesBefore, or schedule changes, schedule notifications accordingly
  useEffect(() => {
    if (notifyPreference === "none" || schedule.length === 0) {
      // Cancel all notifications if any
      Notifications.cancelAllScheduledNotificationsAsync();
      return;
    }

    // Cancel previous scheduled notifications to avoid duplicates
    Notifications.cancelAllScheduledNotificationsAsync();

    // Filter events to notify about
    const now = new Date();
    const notifyEvents =
      notifyPreference === "all" ? schedule : schedule.filter(isSpecialEvent);

    // Schedule notifications X minutes before event start (if in future)
    notifyEvents.forEach((event) => {
      const notifyTime = new Date(
        event.start.getTime() - notifyMinutesBefore * 60 * 1000
      );
      if (notifyTime > now) {
        Notifications.scheduleNotificationAsync({
          content: {
            title: isSpecialEvent(event)
              ? "Upcoming Special Wilderness Event!"
              : "Upcoming Wilderness Event",
            body: `${event.event
              .replace(/special/gi, "")
              .trim()} starts in ${notifyMinutesBefore} minutes!`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: { type: "date", date: notifyTime },
        });
      }
    });
  }, [notifyPreference, notifyMinutesBefore, schedule]);

  // Decide which event to count down to based on filterSpecial
  const countdownEvent = (() => {
    if (filterSpecial) {
      const now = new Date();
      return schedule.find((e) => isSpecialEvent(e) && e.start >= now) || null;
    } else {
      return currentEvent;
    }
  })();

  // Countdown timer effect
  useEffect(() => {
    if (!countdownEvent) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diffMs = countdownEvent.start - now;

      if (diffMs <= 0) {
        setCountdown("Event is live now!");
        return;
      }

      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);

      if (diffHrs >= 1) {
        setCountdown(
          `${diffHrs}:${diffMins.toString().padStart(2, "0")}:${diffSecs
            .toString()
            .padStart(2, "0")}`
        );
      } else {
        setCountdown(
          `${diffMins.toString().padStart(2, "0")}:${diffSecs
            .toString()
            .padStart(2, "0")}`
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [countdownEvent]);

  if (loading) {
    return <ActivityIndicator style={styles.loader} size="large" />;
  }

  if (!countdownEvent) {
    return (
      <Text style={styles.error}>
        {filterSpecial
          ? "No upcoming special events found."
          : "No current event found."}
      </Text>
    );
  }

  // Events to show based on filter and toggle
  const filteredNextEvents = filterSpecial
    ? nextEvents.filter(isSpecialEvent)
    : nextEvents;

  const eventsToShow = showAllEvents
    ? filteredNextEvents
    : filteredNextEvents.slice(0, 3);

  // Save notify preference helper
  const saveNotifyPreference = async (pref) => {
    try {
      await AsyncStorage.setItem(NOTIFY_PREF_KEY, pref);
      setNotifyPreference(pref);
      Alert.alert(
        "Notification Preference Saved",
        `You will be notified for: ${pref}`
      );
    } catch (err) {
      console.error("Failed to save notify preference", err);
      Alert.alert("Error", "Failed to save your preference.");
    }
  };

  // Save notify minutes helper
  const saveNotifyMinutesBefore = async (minutes) => {
    try {
      await AsyncStorage.setItem(NOTIFY_MINUTES_KEY, minutes.toString());
      setNotifyMinutesBefore(minutes);
      Alert.alert(
        "Notification Time Saved",
        `Notifications will be sent ${minutes} minutes before events.`
      );
    } catch (err) {
      console.error("Failed to save notify minutes", err);
      Alert.alert("Error", "Failed to save notification time.");
    }
  };

  // UI for selecting notify minutes
  const notifyMinutesOptions = [5, 10, 15, 30, 60];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🌋 Current Wilderness Flash Event</Text>

      <Text style={styles.eventName}>
        {filterSpecial && countdownEvent
          ? countdownEvent.event.replace(/special/gi, "").trim()
          : currentEvent?.event}
      </Text>

      <Text style={styles.timer}>
        Starts at: {countdownEvent.start.toLocaleTimeString()} (Countdown:{" "}
        {countdown})
      </Text>

      <TouchableOpacity
        onPress={() => setFilterSpecial(!filterSpecial)}
        style={[
          styles.button,
          { backgroundColor: filterSpecial ? "#444" : "#007AFF" },
        ]}
      >
        <Text style={styles.buttonText}>
          {filterSpecial ? "Show All Events" : "Show Only Special Events"}
        </Text>
      </TouchableOpacity>

      <Text style={[styles.timer, { marginTop: 20 }]}>
        Notification Options:
      </Text>

      <TouchableOpacity
        onPress={() => saveNotifyPreference("all")}
        style={[
          styles.button,
          notifyPreference === "all" && styles.buttonSelected,
        ]}
      >
        <Text style={styles.buttonText}>Notify All Events</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => saveNotifyPreference("special")}
        style={[
          styles.button,
          notifyPreference === "special" && styles.buttonSelected,
        ]}
      >
        <Text style={styles.buttonText}>Notify Special Events Only</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => saveNotifyPreference("none")}
        style={[
          styles.button,
          notifyPreference === "none" && styles.buttonSelected,
        ]}
      >
        <Text style={styles.buttonText}>Disable Notifications</Text>
      </TouchableOpacity>

      {notifyPreference !== "none" && (
        <>
          <Text style={[styles.timer, { marginTop: 20 }]}>
            Notify me minutes before event:
          </Text>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 10 }}
          >
            {notifyMinutesOptions.map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => saveNotifyMinutesBefore(m)}
                style={[
                  styles.button,
                  {
                    marginRight: 8,
                    marginBottom: 8,
                    backgroundColor:
                      notifyMinutesBefore === m ? "#005BBB" : "#007AFF",
                    paddingHorizontal: 12,
                  },
                ]}
              >
                <Text style={styles.buttonText}>{m} min</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Text style={styles.header}>Upcoming Events</Text>

      {eventsToShow.map((event, idx) => (
        <View key={idx} style={styles.eventRow}>
          <Text style={styles.eventTime}>
            {event.start.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
          <Text
            style={[
              styles.eventName,
              isSpecialEvent(event) && { color: "#E87038" },
            ]}
          >
            {event.event}
          </Text>
        </View>
      ))}

      {filteredNextEvents.length > 3 && (
        <TouchableOpacity
          onPress={() => setShowAllEvents(!showAllEvents)}
          style={[styles.button, { marginTop: 10 }]}
        >
          <Text style={styles.buttonText}>
            {showAllEvents ? "Show Less" : "Show More"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center" },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111",
    padding: 20,
  },
  header: {
    fontSize: 18,
    marginBottom: 10,
    fontWeight: "bold",
    color: "#999",
  },
  eventName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  eventTime: {
    fontSize: 16,
    color: "#ddd",
    width: 80,
  },
  eventRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    width: "100%",
    marginBottom: 8,
  },
  timer: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#aaa",
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginBottom: 10,
  },
  buttonSelected: {
    backgroundColor: "#005BBB",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  error: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
  },
});

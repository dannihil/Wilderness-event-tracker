import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  cancelAllNotifications,
  scheduleNotification,
} from "../utils/notifications"; // adjust path

const EVENTS_URL =
  "https://raw.githubusercontent.com/dannihil/Wilderness-event-tracker/main/events.json";
const PREF_KEY = "notifyMinutesBefore";
const NOTIFY_TYPE_KEY = "notifyPreference";

const DEFAULT_EVENTS_TO_SHOW = 5;
const MAX_EVENTS_TO_SHOW = 11;

const screenWidth = Dimensions.get("window").width;
const imageSize = screenWidth * 0.15; // 20% of screen width

export default function HomeScreen() {
  const [schedule, setSchedule] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [nextEvents, setNextEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState("");
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [filterSpecial, setFilterSpecial] = useState(false); // UI filter toggle
  const [notifyMinutesBefore, setNotifyMinutesBefore] = useState(15); // default 15 min
  const [notifyPreference, setNotifyPreference] = useState("all"); // all, special, none
  const [menuVisible, setMenuVisible] = useState(false);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  // Helper: parse time string to next Date occurrence
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

  // Fetch schedule from remote JSON
  useEffect(() => {
    async function fetchSchedule() {
      try {
        const res = await fetch(EVENTS_URL);
        const data = await res.json();

        if (!data || data.length === 0) {
          setSchedule([]);
          setCurrentEvent(null);
          setNextEvents([]);
          return;
        }

        const scheduledEvents = data.map((event) => ({
          ...event,
          start: getNextOccurrence(event.date),
        }));

        scheduledEvents.sort((a, b) => a.start - b.start);

        setSchedule(scheduledEvents);

        const now = new Date();

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
        const future = scheduledEvents.slice(currentIndex + 1);

        setCurrentEvent(current);
        setNextEvents(future);
      } catch (err) {
        console.error("Failed to fetch event schedule:", err);
        setSchedule([]);
        setCurrentEvent(null);
        setNextEvents([]);
      } finally {
        setLoading(false);
      }
    }
    fetchSchedule();
  }, []);

  // Load user notification preferences on mount
  useEffect(() => {
    async function loadPrefs() {
      try {
        const minutesStr = await AsyncStorage.getItem(PREF_KEY);
        if (minutesStr) setNotifyMinutesBefore(parseInt(minutesStr, 10));
        const pref = await AsyncStorage.getItem(NOTIFY_TYPE_KEY);
        if (pref) setNotifyPreference(pref);
      } catch (err) {
        console.error("Failed to load notification preferences", err);
      }
    }
    loadPrefs();
  }, []);

  // Choose events to notify for, filtered by notification preference
  const eventsToNotify = useMemo(() => {
    if (notifyPreference === "all") return schedule;
    if (notifyPreference === "special") return schedule.filter(isSpecialEvent);
    return [];
  }, [schedule, notifyPreference]);

  // Schedule notifications whenever relevant dependencies change
  useEffect(() => {
    if (schedule.length) {
      rescheduleAllNotifications(
        schedule,
        notifyPreference,
        notifyMinutesBefore
      );
    }
  }, [schedule, notifyPreference, notifyMinutesBefore]);

  // Countdown event selection logic
  const countdownEvent = (() => {
    if (filterSpecial) {
      const now = new Date();
      return schedule.find((e) => isSpecialEvent(e) && e.start >= now) || null;
    } else {
      return currentEvent;
    }
  })();

  // Countdown timer update
  useEffect(() => {
    if (!countdownEvent) return;

    const updateCountdown = () => {
      const now = new Date();
      const diffMs = countdownEvent.start - now;

      if (diffMs <= 0) {
        const next =
          schedule.find((e) => e.start > countdownEvent.start) || schedule[0];
        setCurrentEvent(next);
        return;
      }

      const totalSeconds = Math.floor(diffMs / 1000);
      const diffHrs = Math.floor(totalSeconds / 3600);
      const diffMins = Math.floor((totalSeconds % 3600) / 60);
      const diffSecs = totalSeconds % 60;

      if (diffHrs >= 1) {
        setCountdown(
          `${diffHrs.toString().padStart(2, "0")}:${diffMins
            .toString()
            .padStart(2, "0")}:${diffSecs.toString().padStart(2, "0")}`
        );
      } else {
        setCountdown(
          `${diffMins.toString().padStart(2, "0")}:${diffSecs
            .toString()
            .padStart(2, "0")}`
        );
      }
    };

    updateCountdown(); // run immediately

    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [countdownEvent, schedule]);

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

  const filteredNextEvents = filterSpecial
    ? nextEvents.filter(isSpecialEvent)
    : nextEvents;

  const eventsToShow = showAllEvents
    ? filteredNextEvents.slice(0, MAX_EVENTS_TO_SHOW)
    : filteredNextEvents.slice(0, DEFAULT_EVENTS_TO_SHOW);

  async function rescheduleAllNotifications(
    schedule,
    preference,
    minutesBefore
  ) {
    const now = new Date();

    // Filter events based on preference
    let eventsToNotify = [];
    if (preference === "all") {
      eventsToNotify = schedule;
    } else if (preference === "special") {
      eventsToNotify = schedule.filter((event) =>
        event.event.toLowerCase().includes("special")
      );
    }

    console.log("Cancelling all notifications...");
    await cancelAllNotifications();

    if (!eventsToNotify.length) {
      console.log("No events to notify.");
      return;
    }

    console.log(`Scheduling ${eventsToNotify.length} notifications...`);

    for (const event of eventsToNotify) {
      const notifyTime = new Date(
        event.start.getTime() - minutesBefore * 60 * 1000
      );
      if (notifyTime > now) {
        const title = event.event.toLowerCase().includes("special")
          ? "Special Wilderness Event Reminder!"
          : "Wilderness Event";

        await scheduleNotification(
          title,
          `${event.event
            .replace(/special/gi, "")
            .trim()} starts in ${minutesBefore} minutes!`,
          notifyTime
        );
      }
    }
  }

  function getWikiUrl(eventName) {
    const name = eventName.replace(/special/gi, "").trim();
    const encoded = encodeURIComponent(name.replace(/\s+/g, "_"));
    return `https://runescape.wiki/w/Wilderness_Flash_Events#${encoded}`;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <Image
          style={styles.image}
          source={require("../assets/images/texticon.png")}
        />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16, marginRight: 10 }}>
            {filterSpecial ? "Show All Events" : "Show Only Special Events"}
          </Text>
          <Switch
            value={filterSpecial}
            onValueChange={setFilterSpecial}
            trackColor={{ false: "#007AFF", true: "#444" }}
            thumbColor={filterSpecial ? "#E87038" : "#fff"}
          />
        </View>

        <Text
          style={[
            styles.eventName,
            isSpecialEvent(countdownEvent || currentEvent) && {
              color: "#E87038",
            },
            { fontSize: 35 },
          ]}
        >
          {(countdownEvent?.event || currentEvent?.event)
            ?.replace(/special/gi, "")
            .replace(/rampage/gi, "")
            .trim()}
        </Text>

        <Text style={styles.timer}>{countdown}</Text>

        <TouchableOpacity
          onPress={() => {
            const activeEvent = countdownEvent || currentEvent;
            if (activeEvent?.event) {
              const url = getWikiUrl(activeEvent.event);
              Linking.openURL(url).catch((err) =>
                console.error("Failed to open wiki page:", err)
              );
            }
          }}
          style={{
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 50,
            backgroundColor: "#2F2F2F",
            borderRadius: 100,
            padding: 10,
          }}
        >
          <Image
            source={require("../assets/images/wikibutton.png")}
            style={{
              width: imageSize,
              height: imageSize,
            }}
          />
        </TouchableOpacity>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 20,
          }}
        >
          <Text style={styles.header}>Upcoming Events</Text>
          {filteredNextEvents.length > 5 && (
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
        <ScrollView
          style={styles.ScrollView}
          showsVerticalScrollIndicator={false}
        >
          {eventsToShow.map((event) => (
            <View
              key={`${event.event}-${event.start.getTime()}`}
              style={styles.eventRow}
            >
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
                  { fontSize: 20 },
                ]}
              >
                {event.event
                  .replace(/special/gi, "")
                  .replace(/rampage/gi, "")
                  .trim()}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center" },
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#111",
    padding: 20,
  },
  header: {
    fontSize: 30,
    marginBottom: 10,
    fontWeight: "bold",
    color: "#fff",
  },
  eventName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#b8b8b8",
  },
  eventTime: {
    fontSize: 16,
    color: "#ddd",
    width: 80,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 8,
  },
  timer: {
    fontSize: 50,
    fontWeight: "bold",
    color: "white",
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#2F2F2F",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 25,
    marginBottom: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  error: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
    padding: 20,
  },
  image: {
    height: 100,
    width: 350,
    marginBottom: 30,
  },
  ScrollView: {
    width: 430,
    paddingRight: 70,
    paddingLeft: 70,
    paddingTop: 5,
    borderRadius: 10,
    backgroundColor: "#151515",
  },
});

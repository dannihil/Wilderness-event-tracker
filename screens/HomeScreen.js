import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
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

// Add this import or define fetchWikiEvents somewhere
import { fetchWikiEvents } from "../utils/fetchWikiEvents"; // <-- your wiki fetch function here

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

  // Helper: parse time string to next Date occurrence
  function getNextOccurrence(timeStr) {
    if (!timeStr) {
      console.warn("Invalid time string:", timeStr);
      return null;
    }
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

  // *** REPLACED this useEffect to fetch from Wiki API function directly ***
  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      try {
        const events = await fetchWikiEvents();

        const scheduledEvents = events
          .map((event) => ({
            ...event,
            start: getNextOccurrence(event.date),
          }))
          .filter((e) => e.start != null)
          .sort((a, b) => a.start - b.start);

        setSchedule(scheduledEvents);

        // Determine current event
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
      } catch (error) {
        console.error("Error loading events:", error);
        setSchedule([]);
        setCurrentEvent(null);
        setNextEvents([]);
      }
      setLoading(false);
    }

    loadEvents();
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
    <>
      <LinearGradient colors={["#0d0d0d", "#1a1a1a"]} style={{ flex: 1 }}>
        <SafeAreaView style={styles.container}>
          <Image
            style={styles.image}
            source={require("../assets/images/texticon.png")}
          />

          <View style={styles.SpecialToggleView}>
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
              { fontSize: screenWidth * 0.08 },
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
                  console.error("Failed to open URL:", err)
                );
              }
            }}
          >
            <Text style={styles.link}>Learn More on RuneScape Wiki</Text>
          </TouchableOpacity>

          <ScrollView style={styles.list}>
            {eventsToShow.map((event, i) => {
              const isSpecial = isSpecialEvent(event);
              return (
                <TouchableOpacity
                  key={i}
                  style={styles.event}
                  onPress={() => {
                    const url = getWikiUrl(event.event);
                    Linking.openURL(url).catch((err) =>
                      console.error("Failed to open URL:", err)
                    );
                  }}
                >
                  <Text
                    style={[
                      styles.eventNameSmall,
                      isSpecial && { color: "#E87038" },
                    ]}
                  >
                    {event.event.replace(/special/gi, "").trim()}
                  </Text>
                  <Text style={styles.eventTime}>
                    {event.start.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            onPress={() => setShowAllEvents(!showAllEvents)}
            style={styles.showMoreBtn}
          >
            <Text style={{ color: "#fff" }}>
              {showAllEvents ? "Show Less" : "Show More"}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 10,
  },
  image: {
    width: imageSize,
    height: imageSize,
    resizeMode: "contain",
    alignSelf: "center",
    marginVertical: 15,
  },
  SpecialToggleView: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  eventName: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    color: "#fff",
    marginBottom: 8,
  },
  timer: {
    fontSize: 48,
    fontWeight: "900",
    color: "#fff",
    textAlign: "center",
    marginBottom: 5,
  },
  link: {
    textAlign: "center",
    fontSize: 14,
    color: "#ccc",
    textDecorationLine: "underline",
    marginBottom: 12,
  },
  list: {
    marginTop: 15,
  },
  event: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    borderBottomColor: "#555",
    borderBottomWidth: 1,
    paddingBottom: 6,
  },
  eventNameSmall: {
    fontSize: 18,
    color: "#ccc",
  },
  eventTime: {
    fontSize: 18,
    color: "#ccc",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
  },
  error: {
    flex: 1,
    color: "#fff",
    textAlign: "center",
    marginTop: 50,
  },
  showMoreBtn: {
    alignItems: "center",
    marginVertical: 15,
  },
});

import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  RefreshControl,
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
} from "../utils/notifications";

const EVENTS_URL =
  "https://raw.githubusercontent.com/dannihil/Wilderness-event-tracker/main/events.json";
const PREF_KEY = "notifyMinutesBefore";
const NOTIFY_TYPE_KEY = "notifyPreference";
const FILTER_SPECIAL_KEY = "filterSpecial"; // NEW KEY

const DEFAULT_EVENTS_TO_SHOW = 5;
const MAX_EVENTS_TO_SHOW = 11;

const screenWidth = Dimensions.get("window").width;
const imageSize = screenWidth * 0.15;

export default function HomeScreen() {
  const [schedule, setSchedule] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [nextEvents, setNextEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState("");
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [filterSpecial, setFilterSpecial] = useState(false);
  const [notifyMinutesBefore, setNotifyMinutesBefore] = useState(15);
  const [notifyPreference, setNotifyPreference] = useState("all");
  const [timeFormat, setTimeFormat] = useState("24hr");
  const [refreshing, setRefreshing] = useState(false);

  const router = useRouter();

  async function clearAsyncStorage() {
    try {
      await AsyncStorage.clear();
      console.log("AsyncStorage cleared!");
    } catch (e) {
      console.error("Failed to clear AsyncStorage.", e);
    }
  }

  // Load time format
  useEffect(() => {
    async function loadTimeFormat() {
      try {
        const format = await AsyncStorage.getItem("timeFormat");
        if (format === "12hr" || format === "24hr") {
          setTimeFormat(format);
        }
      } catch (e) {
        console.warn("Failed to load time format preference", e);
      }
    }
    loadTimeFormat();
  }, []);

  // Load persisted filterSpecial
  useEffect(() => {
    AsyncStorage.getItem(FILTER_SPECIAL_KEY).then((val) => {
      if (val !== null) {
        setFilterSpecial(val === "true");
      }
    });
  }, []);

  // Save filterSpecial when it changes
  useEffect(() => {
    AsyncStorage.setItem(FILTER_SPECIAL_KEY, filterSpecial.toString());
  }, [filterSpecial]);

  // Helper: parse time string to next Date occurrence
  function getNextOccurrence(timeStr) {
    if (!timeStr) return null;
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

  function isSpecialEvent(event) {
    return event.event.toLowerCase().includes("special");
  }

  async function fetchSchedule(isRefreshing = false) {
    if (isRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(EVENTS_URL);
      const data = await res.json();

      if (!data?.length) {
        setSchedule([]);
        setCurrentEvent(null);
        setNextEvents([]);
        return;
      }

      const scheduledEvents = data
        .map((event) => ({
          ...event,
          start: event.date ? getNextOccurrence(event.date) : null,
        }))
        .filter((e) => e.start)
        .sort((a, b) => a.start - b.start);

      setSchedule(scheduledEvents);

      const now = new Date();
      let current =
        scheduledEvents.find((e, i) => {
          const nextStart =
            scheduledEvents[i + 1]?.start ||
            new Date(e.start.getTime() + 24 * 60 * 60 * 1000);
          return now >= e.start && now < nextStart;
        }) || scheduledEvents[0];

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
      if (isRefreshing) setRefreshing(false);
      else setLoading(false);
    }
  }

  useEffect(() => {
    fetchSchedule();
  }, []);

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

  useEffect(() => {
    loadPrefs();
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([fetchSchedule(true), loadPrefs()]);
    setRefreshing(false);
  }

  useEffect(() => {
    if (schedule.length) {
      rescheduleAllNotifications(
        schedule,
        notifyPreference,
        notifyMinutesBefore
      );
    }
  }, [schedule, notifyPreference, notifyMinutesBefore]);

  const countdownEvent = (() => {
    if (filterSpecial) {
      const now = new Date();
      return schedule.find((e) => isSpecialEvent(e) && e.start >= now) || null;
    }
    return currentEvent;
  })();

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

    updateCountdown();
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
    let eventsToNotify =
      preference === "all"
        ? schedule
        : preference === "special"
        ? schedule.filter((event) =>
            event.event.toLowerCase().includes("special")
          )
        : [];

    await cancelAllNotifications();
    if (!eventsToNotify.length) return;

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
              Show Only Special Events
            </Text>
            <View style={styles.switchContainer}>
              <Switch
                value={filterSpecial}
                onValueChange={setFilterSpecial}
                trackColor={{ false: "#007AFF", true: "#444" }}
                thumbColor={filterSpecial ? "#E87038" : "#fff"}
              />
            </View>
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
              .trim()}{" "}
          </Text>
          <Text
            style={{
              color: "white",
              fontSize: screenWidth * 0.04,
              marginBottom: 10,
            }}
          >
            {filterSpecial
              ? "- Next Special Event starts at:"
              : "- Next Event starts at"}{" "}
            {countdownEvent.start.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: timeFormat === "12hr",
            })}
            {" -"}
          </Text>

          <Text style={styles.timer}>{countdown}</Text>

          <TouchableOpacity
            onPress={() => {
              const activeEvent = countdownEvent || currentEvent;
              if (activeEvent?.event) {
                router.push({
                  pathname: "/(modals)/wiki",
                  params: { url: getWikiUrl(activeEvent.event) },
                });
              }
            }}
            style={styles.WikiButton}
          >
            <Image
              source={require("../assets/images/wikibutton.png")}
              style={{ width: imageSize, height: imageSize }}
            />
          </TouchableOpacity>

          <View style={styles.FutureEvents}>
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
            style={[styles.ScrollView, refreshing ? { paddingTop: 80 } : null]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#E87038"
                colors={["#E87038"]}
              />
            }
          >
            {eventsToShow.map((event) => (
              <View
                key={`${event.event}-${event.start.getTime()}`}
                style={styles.eventRow}
              >
                <Text
                  style={[
                    styles.eventTime,
                    isSpecialEvent(event) && { color: "#E87038" },
                  ]}
                >
                  {event.start.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: timeFormat === "12hr",
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
          {/*<Button title="Clear Storage" onPress={clearAsyncStorage} />*/}
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center" },
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "transparent",
    padding: 20,
  },
  header: {
    fontSize: screenWidth * 0.07,
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
    width: 55,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  timer: {
    fontSize: screenWidth * 0.1,
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
    height: 70,
    width: screenWidth * 0.7,
    marginTop: 20,
    marginBottom: 30,
  },
  ScrollView: {
    width: screenWidth,
    paddingRight: 70,
    paddingLeft: 70,
    paddingTop: 5,
    borderRadius: 10,
    backgroundColor: "rgba(92, 90, 90, 0.1)",
  },
  FutureEvents: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
  },
  WikiButton: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 50,
    marginTop: 20,
    backgroundColor: "#2F2F2F",
    borderRadius: 100,
    padding: 10,
    shadowColor: "#E87038",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  SpecialToggleView: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  switchLabel: {
    color: "white",
    fontWeight: "600",
    marginLeft: 8,
  },
});

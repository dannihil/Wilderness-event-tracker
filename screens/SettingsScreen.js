import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { rescheduleAllNotifications } from "../utils/notifications"; // Adjust path if needed
import { buildSchedule } from "../utils/scheduleHelper"; // Adjust path if needed

const PREF_KEY = "notifyMinutesBefore";
const NOTIFY_TYPE_KEY = "notifyPreference";

const notifyMinuteOptions = [5, 10, 15, 30, 60];
const notifyTypes = [
  { key: "all", label: "All Events" },
  { key: "special", label: "Only Special Events" },
  { key: "none", label: "None" },
];

export default function SettingsScreen() {
  const [notifyMinutesBefore, setNotifyMinutesBefore] = useState(15);
  const [notifyPreference, setNotifyPreference] = useState("all");

  useEffect(() => {
    (async () => {
      const savedMinutes = await AsyncStorage.getItem(PREF_KEY);
      if (savedMinutes) setNotifyMinutesBefore(parseInt(savedMinutes, 10));
      const savedPref = await AsyncStorage.getItem(NOTIFY_TYPE_KEY);
      if (savedPref) setNotifyPreference(savedPref);
    })();
  }, []);

  async function updateNotificationSettings(newMinutes, newPref) {
    await AsyncStorage.setItem(PREF_KEY, String(newMinutes));
    await AsyncStorage.setItem(NOTIFY_TYPE_KEY, newPref);
    setNotifyMinutesBefore(newMinutes);
    setNotifyPreference(newPref);

    console.log(
      `Updated settings: notifyMinutesBefore = ${newMinutes}, notifyPreference = ${newPref}`
    );

    Alert.alert(
      "Settings Updated",
      `You will be notified ${newMinutes} minutes before ${
        newPref === "all"
          ? "all events"
          : newPref === "special"
          ? "special events only"
          : "no events"
      }.`
    );

    const schedule = buildSchedule(); // ← Get up-to-date event schedule
    await rescheduleAllNotifications(schedule, newPref, newMinutes); // ← Reschedule with new settings
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ padding: 20 }}>
        <Text style={styles.header}>Notify how many minutes before event?</Text>
        <View style={styles.row}>
          {notifyMinuteOptions.map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => updateNotificationSettings(m, notifyPreference)}
              style={[
                styles.button,
                notifyMinutesBefore === m && styles.selected,
              ]}
            >
              <Text style={styles.text}>{m} min</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.header, { marginTop: 20 }]}>
          Notification type
        </Text>
        <View style={styles.row}>
          {notifyTypes.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              onPress={() =>
                updateNotificationSettings(notifyMinutesBefore, key)
              }
              style={[
                styles.button,
                notifyPreference === key && styles.selected,
              ]}
            >
              <Text style={styles.text}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.settingsImage}>
        <Image
          style={styles.image}
          source={require("../assets/images/texticon.png")}
        ></Image>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111", padding: 20 },
  header: { fontSize: 18, color: "#aaa", marginBottom: 15 },
  row: { flexDirection: "row", flexWrap: "wrap" },
  button: {
    padding: 10,
    backgroundColor: "#333",
    marginRight: 10,
    marginBottom: 10,
    borderRadius: 15,
  },
  selected: { backgroundColor: "#007AFF" },
  text: { color: "#fff" },
  settingsImage: {
    position: "absolute",
    bottom: 50, // adjust this to be just above your bottom navbar height
    left: 0,
    right: 0,
    alignItems: "center", // centers horizontally
  },
  image: {
    height: 100,
    width: 400,
  },
});

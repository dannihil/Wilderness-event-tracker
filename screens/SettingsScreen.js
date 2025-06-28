import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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

  const saveMinutes = async (minutes) => {
    setNotifyMinutesBefore(minutes);
    await AsyncStorage.setItem(PREF_KEY, minutes.toString());
    console.log(`✅ Saved notifyMinutesBefore = ${minutes}`);
    Alert.alert(
      "Notification time saved",
      `You will be notified ${minutes} minutes before events.`
    );
  };

  const savePreference = async (pref) => {
    setNotifyPreference(pref);
    await AsyncStorage.setItem(NOTIFY_TYPE_KEY, pref);
    console.log(`✅ Saved notifyPreference = ${pref}`);
    Alert.alert(
      "Notification preference saved",
      `You chose to be notified: ${
        notifyTypes.find((t) => t.key === pref)?.label
      }.`
    );
  };

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

    rescheduleAllNotifications(schedule, newPref, newMinutes);
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
});

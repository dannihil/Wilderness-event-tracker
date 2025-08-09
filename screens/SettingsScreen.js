import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { fetchScheduleFromRemote, isSpecialEvent } from "../utils/events";
import { rescheduleAllNotifications } from "../utils/notifications";

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
  const [modalVisible, setModalVisible] = useState(false);

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

    const schedule = await fetchScheduleFromRemote();

    // Filter schedule by preference (if needed)
    const filteredSchedule =
      newPref === "special"
        ? schedule.filter(isSpecialEvent)
        : newPref === "none"
        ? []
        : schedule;

    await rescheduleAllNotifications(filteredSchedule, newPref, newMinutes);
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
              <Text
                style={[
                  styles.text,
                  notifyMinutesBefore === m && styles.selectedText,
                ]}
              >
                {m} min
              </Text>
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
              <Text
                style={[
                  styles.text,
                  notifyPreference === key && styles.selectedText,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.settingsImage}>
        <Image
          style={styles.image}
          source={require("../assets/images/texticon.png")}
        />

        {/* Custom button */}
        <Pressable
          style={styles.modalbutton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.modalbuttonText}>Disclaimer</Text>
        </Pressable>

        {/* Modal */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <SafeAreaView style={styles.modalBackground}>
            <View style={styles.modalContent}>
              <Text style={styles.modaltext}>
                This app is an unofficial companion app and is not affiliated
                with Jagex or its developers. This app is completely free and
                does not contain advertisements or in-app purchases.
              </Text>
              <Pressable
                style={styles.modalbutton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalbuttonText}>Close</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </Modal>
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
  selected: { backgroundColor: "white", color: "black" },
  selectedText: {
    color: "black",
  },
  text: { color: "#fff" },
  settingsImage: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  image: {
    height: 100,
    width: 400,
  },
  modalbutton: {
    backgroundColor: "#333",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  modalbuttonText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 12,
    width: "80%",
  },
  modaltext: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
});

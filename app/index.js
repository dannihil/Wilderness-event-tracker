import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Button, Platform, View } from "react-native";
import HomeScreen from "../screens/HomeScreen";

export default function App() {
  useEffect(() => {
    (async () => {
      // Request permissions on iOS and Android
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
      });

      if (status !== "granted") {
        alert("Permission for notifications not granted!");
        return;
      }

      // Android notification channel setup
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.HIGH, // Show on lock screen
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }
    })();
  }, []);

  // Demo function to schedule a notification 15 mins from now
  async function scheduleDemoNotification() {
    const notifyTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Demo Event Reminder",
        body: "This event starts in 15 minutes!",
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: { type: "date", date: notifyTime },
    });
    alert("Notification scheduled for 15 minutes from now");
  }

  return (
    <View style={{ flex: 1 }}>
      <HomeScreen />
      <View style={{ padding: 20 }}>
        <Button
          title="Schedule Demo Notification in 15 minutes"
          onPress={scheduleDemoNotification}
        />
      </View>
    </View>
  );
}

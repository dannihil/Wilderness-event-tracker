import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Alert, Button, View } from "react-native";

export default function NotificationTest() {
  useEffect(() => {
    // Set handler so notifications show even if app is foreground
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    // Request permission on mount
    async function requestPermission() {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Please enable notifications!");
      }
    }

    requestPermission();
  }, []);

  async function scheduleNotification() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Test Notification",
        body: "This notification fired after 5 seconds!",
      },
      trigger: { seconds: 5 },
    });
  }

  return (
    <View style={{ padding: 20, marginTop: 50 }}>
      <Button
        title="Schedule Notification in 5s"
        onPress={scheduleNotification}
      />
    </View>
  );
}

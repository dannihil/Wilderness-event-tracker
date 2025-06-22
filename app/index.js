import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";
import HomeScreen from "../screens/HomeScreen";

export default function App() {
  useEffect(() => {
    Notifications.requestPermissionsAsync();
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
  }, []);

  return <HomeScreen />;
}

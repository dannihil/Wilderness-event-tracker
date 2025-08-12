import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import Onboarding from "./Onboarding";

const ONBOARDING_KEY = "hasSeenOnboarding";

async function requestPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") {
    alert("Permission for notifications not granted!");
    return false;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  return true;
}

export default function Index() {
  const router = useRouter();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function prepare() {
      await requestPermissions();

      const hasSeen = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (hasSeen === "true") {
        router.replace("/(tabs)/home");
      } else {
        setShowOnboarding(true);
      }

      setLoading(false);
    }
    prepare();
  }, []);

  function handleFinish() {
    AsyncStorage.setItem(ONBOARDING_KEY, "true");
    setShowOnboarding(false);
    router.replace("/(tabs)/home");
  }

  if (loading) {
    return null; // or loading indicator
  }

  if (showOnboarding) {
    return <Onboarding onFinish={handleFinish} />;
  }

  return null; // if onboarding not needed and loading done
}

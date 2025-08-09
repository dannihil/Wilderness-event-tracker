import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export async function requestNotificationPermission() {
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

export async function scheduleNotification(title, body, date) {
  console.log("Scheduling notification for", title, "at", date);
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: { type: "date", date },
  });
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleNotificationsForEvents(
  schedule,
  notifyPreference,
  notifyMinutesBefore
) {
  await cancelAllNotifications();

  if (notifyPreference === "none" || schedule.length === 0) return;

  const now = new Date();
  const isSpecial = (e) => e.event.toLowerCase().includes("special");

  const notifyEvents =
    notifyPreference === "all" ? schedule : schedule.filter(isSpecial);

  for (const event of notifyEvents) {
    const notifyTime = new Date(
      event.start.getTime() - notifyMinutesBefore * 60 * 1000
    );
    if (notifyTime > now) {
      await scheduleNotification(
        isSpecial(event)
          ? "Special Wilderness Event reminder"
          : "Wilderness Event reminder",
        `${event.event.replace(
          /special/gi,
          ""
        )} starts in ${notifyMinutesBefore} minutes!`,
        notifyTime
      );
    }
  }
}

export async function rescheduleAllNotifications(
  schedule,
  notifyPreference,
  notifyMinutesBefore
) {
  console.warn("updateNotificationSettings CALLED");
  const permissionGranted = await requestNotificationPermission();
  if (!permissionGranted) return;

  await scheduleNotificationsForEvents(
    schedule,
    notifyPreference,
    notifyMinutesBefore
  );
}

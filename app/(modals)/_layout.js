import { Stack } from "expo-router";

export default function ModalLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: "modal", // or "transparentModal"
        gestureEnabled: true, // enable swipe to close on iOS
        headerShown: false,
        animation: "slide_from_bottom",
        freezeOnBlur: true,
      }}
    />
  );
}

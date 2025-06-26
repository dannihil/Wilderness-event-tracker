import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import HomeTab from "./home"; // ✅ default export
import SettingsTab from "./settings"; // ✅ you'll need this file too

const Tab = createBottomTabNavigator();

export default function TabsLayout() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: { backgroundColor: "#111", borderTopWidth: 0 },
        tabBarActiveTintColor: "#E87038",
        tabBarInactiveTintColor: "#aaa",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeTab} // ✅ must be the imported component
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsTab}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cog" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}

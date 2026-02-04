import { Tabs } from "expo-router";

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: "#0F766E",
                tabBarInactiveTintColor: "#94A3B8",
                tabBarStyle: {
                    backgroundColor: "#FFFFFF",
                    borderTopColor: "#E2E8F0",
                    height: 64,
                    paddingBottom: 10,
                    paddingTop: 8,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: "600",
                },
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: "Home",
                }}
            />
            <Tabs.Screen
                name="routes"
                options={{
                    title: "Routes",
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                }}
            />
        </Tabs>
    );
}

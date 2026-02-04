import { Tabs } from "expo-router";
import { useSession } from "../../lib/useSession";
import { useProfile } from "../../lib/useProfile";

export default function TabsLayout() {
    const { session } = useSession();
    const { profile, loading } = useProfile(session);

    if (loading || !profile) return null;

    const isOperator = profile.role === "operator";

    return (
        <Tabs screenOptions={{ headerShown: false }}>
            {/* Operator screens - show ONLY when operator */}
            <Tabs.Screen
                name="home.operator"
                options={{
                    title: "Home",
                    href: isOperator ? undefined : null // Show if operator, hide if not
                }}
            />
            <Tabs.Screen
                name="routes.operator"
                options={{
                    title: "Routes",
                    href: isOperator ? undefined : null
                }}
            />
            <Tabs.Screen
                name="account.operator"
                options={{
                    title: "Account",
                    href: isOperator ? undefined : null
                }}
            />

            {/* Passenger screens - show ONLY when NOT operator */}
            <Tabs.Screen
                name="home.passenger"
                options={{
                    title: "Home",
                    href: !isOperator ? undefined : null // Show if not operator, hide if operator
                }}
            />
            <Tabs.Screen
                name="routes.passenger"
                options={{
                    title: "Routes",
                    href: !isOperator ? undefined : null
                }}
            />
            <Tabs.Screen
                name="account.passenger"
                options={{
                    title: "Account",
                    href: !isOperator ? undefined : null
                }}
            />
        </Tabs>
    );
}
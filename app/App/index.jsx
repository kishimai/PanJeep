import { Redirect } from "expo-router";
import { useSession } from "../lib/useSession";

export default function Index() {
    const { session, loading } = useSession();

    if (loading) return null;

    if (session) {
        return <Redirect href="/(tabs)" />;
    }

    return <Redirect href="/login" />;
}

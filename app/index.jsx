import { View, Text, Button } from "react-native";
import { useRouter } from "expo-router";

export default function Home() {
    const router = useRouter();

    return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 20, marginBottom: 16 }}>
                eTranspo
            </Text>

            <Button
                title="View Jeepney Routes"
                onPress={() => router.push("/routes")}
            />
        </View>
    );
}
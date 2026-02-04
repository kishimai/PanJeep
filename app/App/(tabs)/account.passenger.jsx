import { View, Text, Button } from "react-native";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";

export default function PassengerAccount() {
    async function signOut() {
        await supabase.auth.signOut();
        router.replace("/login");
    }

    return (
        <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 24 }}>Passenger Account</Text>
            <Button title="Logout" onPress={signOut} />
        </View>
    );
}

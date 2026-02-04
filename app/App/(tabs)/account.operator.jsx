import { View, Text, Button } from "react-native";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";

export default function OperatorAccount() {
    async function signOut() {
        await supabase.auth.signOut();
        router.replace("/login");
    }

    return (
        <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 24 }}>Field Operator Account</Text>
            <Text>Operator privileges enabled.</Text>

            <Button title="Logout" onPress={signOut} />
        </View>
    );
}

import { useState, useEffect } from "react";
import { supabase } from "../src/supabase.jsx";
import { AdminDashboard } from "./AdminDashboard.jsx";
import { OperatorDashboard } from "./OperatorDashboard.jsx";

export function Dashboard() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            // Get logged-in user
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                setLoading(false);
                return;
            }

            // Fetch user's core info from "users" table
            const { data: userData, error: userDataError } = await supabase
                .from("users")
                .select("id, role, email")
                .eq("id", user.id)
                .single();

            if (userDataError || !userData) {
                setLoading(false);
                return;
            }

            let profileData = null;

            // Fetch role-specific profile
            if (userData.role === "operator") {
                const { data, error } = await supabase
                    .from("operators")
                    .select("*")
                    .eq("id", userData.id)
                    .single();
                profileData = data;

            } else if (userData.role === "administration") {
                const { data, error } = await supabase
                    .from("administration")
                    .select("*")
                    .eq("id", userData.id)
                    .single();
                profileData = data;
            }

            // Merge with core user info
            if (profileData) {
                profileData.role = userData.role;
                profileData.email = userData.email;
            }

            setProfile(profileData);
            setLoading(false);
        };

        fetchProfile();
    }, []);

    if (loading) return <p>Loading dashboard...</p>;

    if (!profile || !["operator", "administration"].includes(profile.role)) {
        return <p>Access denied.</p>;
    }

    return profile.role === "administration" ? (
        <AdminDashboard profile={profile} />
    ) : (
        <OperatorDashboard profile={profile} />
    );
}

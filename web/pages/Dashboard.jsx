import { useState, useEffect } from "react";
import { supabase } from "../src/supabase.jsx";
import { AdminDashboard } from "./AdminDashboard.jsx";
import { OperatorDashboard } from "./OperatorDashboard.jsx";

export function Dashboard() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: profileData } = await supabase
                .from("admin_profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            setProfile(profileData);
            setLoading(false);
        };

        fetchProfile();
    }, []);

    if (loading) return <p>Loading dashboard...</p>;

    if (!profile || !["admin", "operator"].includes(profile.role)) {
        return <p>Access denied.</p>;
    }

    return profile.role === "admin" ? (
        <AdminDashboard profile={profile} />

    ) : (
        <OperatorDashboard profile={profile} />
    );
}

import { useState, useEffect } from "react";
import { Line, Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from "chart.js";
import { supabase } from "../src/supabase.jsx";

// Register chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

export function Dashboard() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                // For demo, we still show the dashboard
                setProfile({ full_name: "Demo Admin", lgu_name: "Demo LGU", role: "admin" });
            } else {
                const { data: profileData } = await supabase.from("admin_profiles").select("*").eq("id", user.id).single();
                setProfile(profileData);
            }
            setLoading(false);
        };

        fetchProfile();
    }, []);

    if (loading) return <p>Loading dashboard...</p>;
    if (!profile || profile.role !== "admin") return <p>Access denied. Admins only.</p>;

    return (
        <div style={{ display: "flex", fontFamily: "'Inter', sans-serif", height: "100vh" }}>
            {/* Sidebar */}
            <aside style={{
                width: "220px",
                backgroundColor: "#2e3b4e",
                color: "#fff",
                display: "flex",
                flexDirection: "column",
                padding: "1rem"
            }}>
                <h2 style={{ marginBottom: "2rem", fontSize: "1.3rem", fontWeight: 700 }}>eTranspo</h2>
                <nav style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {["Summary", "Routes", "Operators", "Analytics", "Settings"].map((tab, i) => (
                        <button key={i} style={{
                            background: "none",
                            border: "none",
                            color: "#fff",
                            textAlign: "left",
                            padding: "0.10rem 0",
                            cursor: "pointer",
                            fontSize: "0.95rem"
                        }}>{tab}</button>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, padding: "1rem 2rem", overflowY: "auto", backgroundColor: "#f4f6f9" }}>
                <header style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                    <div>
                        <h1 style={{ margin: 0, fontWeight: 700, fontSize: "1.5rem" }}>LGU Jeepney Dashboard</h1>
                        <p style={{ margin: 0, fontSize: "0.85rem" }}>{profile.lgu_name} Region</p>
                        <p style={{ margin: 0, fontSize: "0.75rem", color: "#6b7280" }}>Last updated: {data.updatedAt}</p>
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: "0.85rem" }}>Welcome, {profile.full_name}</p>
                    </div>
                </header>


            </main>
        </div>
    );
}

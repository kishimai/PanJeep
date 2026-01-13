import { useState, useEffect } from "react";
import { supabase } from "../src/supabase.jsx";
import { Line, Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from "chart.js";

// Register chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

export function Dashboard() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const [analytics] = useState({
        totalRoutes: 42,
        activeRoutes: 30,
        inactiveRoutes: 12,
        totalOperators: 15,
        dailyUpdates: 6,
        weeklyUpdates: 35,
    });

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profileData, error } = await supabase
                .from("admin_profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            if (error) console.error(error);
            else setProfile(profileData);

            setLoading(false);
        };

        fetchProfile();
    }, []);

    if (loading) return <p>Loading dashboard...</p>;
    if (!profile || profile.role !== "admin") return <p>Access denied. Admins only.</p>;

    const lineChartData = {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [
            { label: "Active Routes", data: [5,6,7,8,6,5,4], borderColor:"#4e73df", backgroundColor:"rgba(78,115,223,0.1)", fill:true, tension:0.3 },
            { label: "Inactive Routes", data: [2,1,3,2,4,2,3], borderColor:"#e74a3b", backgroundColor:"rgba(231,74,59,0.1)", fill:true, tension:0.3 }
        ]
    };

    const barChartData = {
        labels: ["Week 1","Week 2","Week 3","Week 4"],
        datasets: [
            { label: "Completed Routes", data:[10,12,9,11], backgroundColor:"#1cc88a" },
            { label: "Pending Routes", data:[2,3,5,2], backgroundColor:"#f6c23e" }
        ]
    };

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
                    {["Dashboard", "Routes", "Operators", "Analytics", "Settings"].map((tab, i) => (
                        <button key={i} style={{
                            background: "none",
                            border: "none",
                            color: "#fff",
                            textAlign: "left",
                            padding: "0.5rem 0",
                            cursor: "pointer",
                            fontSize: "0.95rem"
                        }}>{tab}</button>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, padding: "1rem 2rem", overflowY: "auto", backgroundColor: "#f4f6f9" }}>
                {/* Header */}
                <header style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                    <div>
                        <h1 style={{ margin: 0, fontWeight: 700, fontSize:"1.5rem" }}>LGU Jeepney Dashboard</h1>
                        <p style={{ margin: 0, fontSize:"0.85rem" }}>{profile.lgu_name} Region</p>
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize:"0.85rem" }}>Welcome, {profile.full_name}</p>
                    </div>
                </header>

                {/* Metrics Row */}
                <section style={{ display:"flex", gap:"1rem", marginBottom:"1.5rem", flexWrap:"wrap" }}>
                    {Object.entries({
                        "Total Routes": analytics.totalRoutes,
                        "Active Routes": analytics.activeRoutes,
                        "Inactive Routes": analytics.inactiveRoutes,
                        "Total Operators": analytics.totalOperators
                    }).map(([label, value], i) => (
                        <div key={i} style={{
                            flex: "1 1 180px",
                            padding:"1rem",
                            borderRadius:"8px",
                            backgroundColor: ["#4e73df","#1cc88a","#e74a3b","#36b9cc"][i%4],
                            color:"#fff",
                            textAlign:"center",
                            fontWeight:600,
                            boxShadow:"0 2px 8px rgba(0,0,0,0.1)"
                        }}>
                            <p style={{ margin:0, fontSize:"0.8rem", opacity:0.8 }}>{label}</p>
                            <p style={{ margin:"0.3rem 0 0 0", fontSize:"1.5rem" }}>{value}</p>
                        </div>
                    ))}
                </section>

                {/* Charts */}
                <section style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:"1rem", marginBottom:"1.5rem" }}>
                    <div style={{ background:"#fff", padding:"1rem", borderRadius:"8px", boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
                        <h3 style={{ fontSize:"1rem" }}>Route Activity (Daily)</h3>
                        <Line data={lineChartData} />
                    </div>
                    <div style={{ background:"#fff", padding:"1rem", borderRadius:"8px", boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
                        <h3 style={{ fontSize:"1rem" }}>Route Completion (Weekly)</h3>
                        <Bar data={barChartData} />
                    </div>
                </section>

                {/* Table */}
                <section style={{ background:"#fff", padding:"1rem", borderRadius:"8px", boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
                    <h3 style={{ fontSize:"1rem" }}>Latest Route Updates</h3>
                    <table style={{ width:"100%", borderCollapse:"collapse", marginTop:"0.5rem", fontSize:"0.85rem" }}>
                        <thead>
                        <tr style={{ textAlign:"left", borderBottom:"2px solid #f1f1f1" }}>
                            <th style={{ padding:"0.4rem" }}>Route Name</th>
                            <th>Status</th>
                            <th>Operator</th>
                            <th>Last Update</th>
                        </tr>
                        </thead>
                        <tbody>
                        {[
                            { route: "Route 101", status: "Active", operator: "Operator A", updated: "Today" },
                            { route: "Route 102", status: "Inactive", operator: "Operator B", updated: "Yesterday" },
                            { route: "Route 103", status: "Active", operator: "Operator C", updated: "2 days ago" },
                        ].map((r, i) => (
                            <tr key={i} style={{ borderBottom:"1px solid #f1f1f1" }}>
                                <td style={{ padding:"0.4rem" }}>{r.route}</td>
                                <td>{r.status}</td>
                                <td>{r.operator}</td>
                                <td>{r.updated}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </section>
            </main>
        </div>
    );
}

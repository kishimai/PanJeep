import { useState, useEffect } from "react";
import { RouteCreator } from "../src/RouteCreator.jsx";
import { supabase } from "../src/supabase.jsx";

export function OperatorDashboard({ profile }) {
    const operatorTabs = ["Home", "Routes", "Onboarding", "Support", "Data Quality"];
    const [activeTab, setActiveTab] = useState("Home");

    // NEW STATES
    const [regions, setRegions] = useState([]);
    const [selectedRegionId, setSelectedRegionId] = useState("");

    useEffect(() => {
        const fetchRegions = async () => {
            const { data, error } = await supabase.from("regions").select("*");
            if (error) return console.error(error);
            setRegions(data);

            if (error) {
                console.error("Failed to fetch regions:", error);
            }

            setSelectedRegionId(data)
        };



        fetchRegions();
    }, []);

    const renderHome = () => (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
            <div style={cardStyle}>
                <h3>Pending Onboarding</h3>
                <p>Drivers: 12</p>
                <p>Users: 24</p>
            </div>

            <div style={cardStyle}>
                <h3>Routes Needing Setup</h3>
                <p>Region A: 3</p>
                <p>Region B: 1</p>
            </div>

            <div style={cardStyle}>
                <h3>Open Support Tickets</h3>
                <p>Tickets: 6</p>
                <p>Priority: 2 High</p>
            </div>
        </div>
    );

    function renderRoutes() {
        return (
            <div>
                <h3>Routes Management</h3>

                <select
                    value={selectedRegionId}
                    onChange={(e) => setSelectedRegionId(e.target.value)}
                >
                    <option value="">Select Region</option>
                    {regions.map((r) => (
                        <option key={r.id} value={r.id}>
                            {r.name}
                        </option>
                    ))}
                </select>

                {selectedRegionId && (
                    <RouteCreator
                        regionId={selectedRegionId}
                        operatorId={profile.id}
                    />
                )}
            </div>
        );
    }

    const renderOnboarding = () => (
        <div>
            <h3>Onboarding</h3>
            <p>Approve and onboard drivers and users for LGU regions.</p>
        </div>
    );

    const renderSupport = () => (
        <div>
            <h3>Support</h3>
            <p>Track issues, escalate to LGU, or resolve operational problems.</p>
        </div>
    );

    const renderDataQuality = () => (
        <div>
            <h3>Data Quality</h3>
            <p>Verify data integrity for routes, drivers, and user activity.</p>
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case "Home":
                return renderHome();
            case "Routes":
                return renderRoutes();
            case "Onboarding":
                return renderOnboarding();
            case "Support":
                return renderSupport();
            case "Data Quality":
                return renderDataQuality();
            default:
                return null;
        }
    };

    return (
        <div style={{ display: "flex", fontFamily: "'Inter', sans-serif", height: "100vh" }}>
            {/* Sidebar */}
            <aside style={sidebarStyle}>
                <h2 style={{ marginBottom: "2rem", fontSize: "1.3rem", fontWeight: 700 }}>Operator</h2>

                <nav style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {operatorTabs.map((tab, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                background: "none",
                                border: "none",
                                color: activeTab === tab ? "#ffd700" : "#fff",
                                textAlign: "left",
                                padding: "0.5rem 0",
                                cursor: "pointer",
                                fontSize: "0.95rem",
                                outline: "none",
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <main style={mainStyle}>
                <header style={headerStyle}>
                    <div>
                        <h2 style={{ margin: 0, fontWeight: 700, fontSize: "1.5rem" }}>{activeTab}</h2>
                        <p style={{ margin: 0, fontSize: "0.9rem", color: "#6b7280" }}>
                            Welcome, {profile.full_name}
                        </p>
                    </div>
                </header>

                <section style={{ marginTop: "1rem" }}>{renderContent()}</section>
            </main>
        </div>
    );
}

const sidebarStyle = {
    width: "240px",
    backgroundColor: "#1f2937",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    padding: "1rem",
};

const mainStyle = {
    flex: 1,
    padding: "1rem 2rem",
    overflowY: "auto",
    backgroundColor: "#f3f4f6",
};

const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "1.5rem",
};

const cardStyle = {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "1rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
};

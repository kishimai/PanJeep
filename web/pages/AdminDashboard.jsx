import { useState } from "react";

export function AdminDashboard({ profile }) {
    const adminTabs = ["Dashboard", "Analytics", "Drivers", "Users", "Contact Operator"];
    const [activeTab, setActiveTab] = useState("Dashboard");

    const renderContent = () => {
        switch (activeTab) {
            case "Dashboard":
                return (
                    <div>
                        <h3>Admin Overview</h3>
                        <p>Here you will see regional KPIs and quick stats.</p>
                    </div>
                );

            case "Analytics":
                return (
                    <div>
                        <h3>Analytics</h3>
                        <p>Charts and reports go here.</p>
                    </div>
                );

            case "Drivers":
                return (
                    <div>
                        <h3>Drivers</h3>
                        <p>List of drivers in your region (with manage controls).</p>
                    </div>
                );

            case "Users":
                return (
                    <div>
                        <h3>Users</h3>
                        <p>List of users in your region (with manage controls).</p>
                    </div>
                );

            case "Contact Operator":
                return (
                    <div>
                        <h3>Contact Operator</h3>
                        <p>Send support requests to eTranspo staff.</p>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div style={{ display: "flex", fontFamily: "'Inter', sans-serif", height: "100vh" }}>
            {/* Sidebar */}
            <aside
                style={{
                    width: "220px",
                    backgroundColor: "#2e3b4e",
                    color: "#fff",
                    display: "flex",
                    flexDirection: "column",
                    padding: "1rem",
                }}
            >
                <h2 style={{ marginBottom: "2rem", fontSize: "1.3rem", fontWeight: 700 }}>Administrator</h2>

                <nav style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {adminTabs.map((tab, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                background: "none",
                                border: "none",
                                color: activeTab === tab ? "#FFD700" : "#fff",
                                textAlign: "left",
                                padding: "0.10rem 0",
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
            <main style={{ flex: 1, padding: "1rem 2rem", overflowY: "auto", backgroundColor: "#f4f6f9" }}>
                <header style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                    <div>
                        <h2 style={{ margin: 0, fontWeight: 700, fontSize: "1.5rem" }}>{activeTab}</h2>
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: "0.85rem" }}>Welcome, {profile.full_name}</p>
                    </div>
                </header>

                {/* Content Area */}
                <section>{renderContent()}</section>
            </main>
        </div>
    );
}

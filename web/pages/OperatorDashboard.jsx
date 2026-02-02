import { useState, useEffect } from "react";
import AccountManagement from "../src/AccountManagement";
import {RouteManager} from "../src/RouteManager.jsx";

export function OperatorDashboard({ profile }) {
    const operatorTabs = [
        "Summary",
        "Route Overview",
        "Driver Onboarding",
        "Support Tickets",
        "Data Quality",
        "Account Management",
        "Client Management",
    ];
    const [activeTab, setActiveTab] = useState("Home");

    return (
        <div style={{ display: "flex", fontFamily: "'Inter', sans-serif", height: "100vh" }}>
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

            <main style={mainStyle}>
                <header style={headerStyle}></header>
                <section style={{ marginTop: "1rem" }}>
                    {activeTab === "Account Management" && <AccountManagement />}
                    {activeTab === "Route Overview" && <RouteManager />}
                </section>
            </main>
        </div>
    );
}

// --- Styles ---
const sidebarStyle = { width: "240px", backgroundColor: "#1f2937", color: "#fff", display: "flex", flexDirection: "column", padding: "1rem" };
const mainStyle = { flex: 1, padding: "1rem 2rem", overflowY: "auto", backgroundColor: "#f3f4f6" };
const headerStyle = { display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" };
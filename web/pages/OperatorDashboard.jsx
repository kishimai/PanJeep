import { useState, useEffect } from "react";
import { RouteCreator } from "../src/RouteCreator.jsx";
import { supabase } from "../src/supabase.jsx";
import {WidthFull} from "@mui/icons-material";

export function OperatorDashboard({ profile }) {
    const operatorTabs = ["Summary", "Route Overview", "Driver Onboarding", "Support Tickets", "Data Quality", "Account Management", "Client Management"];
    const [activeTab, setActiveTab] = useState("Home");

    const [regions, setRegions] = useState([]);
    const [selectedRegionId, setSelectedRegionId] = useState("");

    const [isCreatingRegion, setIsCreatingRegion] = useState(false);
    const [clientStep, setClientStep] = useState(1);


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
                <h3>Put Active Routes Here</h3>
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

    const renderAccountManagement = () => (
       <div>
           <h3>Account Management</h3>
       </div>
    );

    const renderClientManagement = () => {
        if (isCreatingRegion) {
            return renderRegionCreationFlow();
        }

        return (
            <div>
                {/* Header Action */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", width: "20%" }}>
                    <button
                        style={primaryButtonStyle}
                        onClick={() => {
                            setClientStep(1);
                            setIsCreatingRegion(true);
                        }}
                    >
                        Create Transportation Region
                    </button>
                </div>

                {/* Client List */}
                <div style={{ display: "grid", gap: "1rem" }}>
                    {regions.length === 0 && (
                        <div style={cardStyle}>
                            <p>No LGU regions onboarded yet.</p>
                        </div>
                    )}

                    {regions.map(region => (
                        <div key={region.id} style={cardStyle}>
                            <h3>{region.name}</h3>

                            <p style={{ opacity: 0.7 }}>
                                Status: Digitization in progress
                            </p>

                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button style={secondaryButtonStyle}>
                                    View
                                </button>
                                <button style={secondaryButtonStyle}>
                                    Continue Digitization
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderRegionCreationFlow = () => (
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>

            {/* Wizard Header */}
            <div style={{ marginBottom: "1rem" }}>
                <button
                    style={{ ...secondaryButtonStyle, width: "auto" }}
                    onClick={() => setIsCreatingRegion(false)}
                >
                    ← Back to Clients
                </button>
            </div>

            <div style={{ marginBottom: "1rem", opacity: 0.7 }}>
                Step {clientStep} of 4
            </div>

            {clientStep === 1 && (
                <div style={cardStyle}>
                    <h2>LGU Region Setup</h2>
                    <input placeholder="Region name" style={inputStyle} />
                </div>
            )}

            {clientStep === 2 && (
                <div style={cardStyle}>
                    <h2>Assign eTranspo Operator</h2>
                    <select style={inputStyle}>
                        <option>Select Staff</option>
                    </select>
                </div>
            )}

            {clientStep === 3 && (
                <div style={cardStyle}>
                    <h2>LGU Admin Accounts</h2>
                    <input placeholder="Admin email" style={inputStyle} />
                    <button style={secondaryButtonStyle}>Add Admin</button>
                </div>
            )}

            {clientStep === 4 && (
                <div style={cardStyle}>
                    <h2>Route Digitization</h2>
                    <RouteCreator />
                </div>
            )}

            {/* Wizard Controls */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
                <button
                    disabled={clientStep === 1}
                    style={secondaryButtonStyle}
                    onClick={() => setClientStep(s => s - 1)}
                >
                    Back
                </button>

                <button
                    disabled={clientStep === 4}
                    style={primaryButtonStyle}
                    onClick={() => setClientStep(s => s + 1)}
                >
                    Continue
                </button>
            </div>
        </div>
    );


    const renderContent = () => {
        switch (activeTab) {
            case "Summary":
                return renderHome();
            case "Route Overview":
                return renderRoutes();
            case "Driver Onboarding":
                return renderOnboarding();
            case "Support":
                return renderSupport();
            case "Data Quality":
                return renderDataQuality();
            case "Account Management":
                return renderAccountManagement();
            case "Client Management":
                return renderClientManagement();
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

const inputStyle = {
    width: "100%",
    padding: "0.5rem",
    marginBottom: "0.5rem",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
};

const primaryButtonStyle = {
    width: "100%",
    padding: "0.5rem",
    backgroundColor: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
};

const secondaryButtonStyle = {
    width: "100%",
    padding: "0.5rem",
    backgroundColor: "#e5e7eb",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
};


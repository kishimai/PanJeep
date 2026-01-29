import { useState, useEffect } from "react";
import { RouteEditor } from "../src/RouteEditor.jsx";
import { supabase } from "../src/supabase.jsx";
import {WidthFull} from "@mui/icons-material";
import {RouteManager} from "../src/RouteManager.jsx";
import {Routes} from "react-router-dom";

export function OperatorDashboard({ profile }) {
    const operatorTabs = ["Summary", "Route Overview", "Driver Onboarding", "Support Tickets", "Data Quality", "Account Management", "Client Management"];
    const [activeTab, setActiveTab] = useState("Home");

    const [regions, setRegions] = useState([]);
    const [selectedRegionId, setSelectedRegionId] = useState("");

    const [isCreatingRegion, setIsCreatingRegion] = useState(false);
    const [clientStep, setClientStep] = useState(1);

    const [lguForm, setLguForm] = useState({
        lguType: "",
        officialName: "",
        psgcCode: "",
        region: "",
        barangays: "",
        authorizingOffice: "",
        legalBasis: "",
        referenceNumber: "",
        effectiveDate: "",
        primaryAdminName: "",
        primaryAdminPosition: "",
        primaryAdminEmail: "",
        secondaryAdminEmail: "",
    });

    const updateLguForm = (field, value) => {
        setLguForm(prev => ({ ...prev, [field]: value }));
    };

    const [accounts, setAccounts] = useState([]);
    const [accountsLoading, setAccountsLoading] = useState(true);
    const [accountsError, setAccountsError] = useState(null);


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

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        setAccountsLoading(true);
        setAccountsError(null);

        try {
            const { data: users, error: userError } = await supabase
                .from("users")
                .select("id, email, role");

            if (userError) throw userError;

            const { data: operators } = await supabase
                .from("operators")
                .select("id");

            const { data: admins } = await supabase
                .from("administration")
                .select("id");

            const operatorSet = new Set(operators?.map(o => o.id));
            const adminSet = new Set(admins?.map(a => a.id));

            const merged = users.map(u => {
                let misaligned = false;

                if (u.role === "operator" && !operatorSet.has(u.id)) {
                    misaligned = true;
                }

                if (u.role === "administration" && !adminSet.has(u.id)) {
                    misaligned = true;
                }

                return {
                    ...u,
                    misaligned,
                };
            });

            setAccounts(merged);
        } catch (err) {
            console.error(err);
            setAccountsError("Failed to load accounts");
        } finally {
            setAccountsLoading(false);
        }
    };

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
        return <RouteManager />
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
            <div style={{ marginBottom: "1rem", width: "300px" }}>
                <button
                    style={primaryButtonStyle}
                    onClick={() => alert("Create account → Edge Function")}
                >
                    + Create Account
                </button>
            </div>

            {accountsLoading && <p>Loading accounts…</p>}

            {accountsError && (
                <p style={{ color: "red" }}>{accountsError}</p>
            )}

            {!accountsLoading && accounts.length === 0 && (
                <p>No accounts found.</p>
            )}

            <div style={{ display: "grid", gap: "0.75rem" }}>
                {accounts.map(acc => (
                    <div
                        key={acc.id}
                        style={{
                            ...cardStyle,
                            borderLeft: acc.misaligned
                                ? "6px solid #dc2626"
                                : "6px solid #16a34a",
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <div>
                                <h4 style={{ margin: 0 }}>
                                    {acc.email}
                                </h4>
                                <p style={{ margin: "0.25rem 0", opacity: 0.7 }}>
                                    Role: {acc.role}
                                </p>
                            </div>

                            <div style={{ fontWeight: 700 }}>
                                {acc.misaligned ? "⚠ MISALIGNED" : "✓ OK"}
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                            <button
                                style={secondaryButtonStyle}
                                onClick={() => alert("Edit details (safe fields only)")}
                            >
                                Edit
                            </button>

                            <button
                                style={secondaryButtonStyle}
                                onClick={() => alert("Reset password → Admin API")}
                            >
                                Reset Password
                            </button>

                            <button
                                style={{
                                    ...secondaryButtonStyle,
                                    backgroundColor: "#fee2e2",
                                }}
                                onClick={() => alert("Delete account → Edge Function")}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
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
                Step {clientStep} of 3
            </div>

            {/* IDENTITY */}
            {clientStep === 1 && (
                <div style={cardStyle}>
                    <h2>LGU Legal Identity & Jurisdiction</h2>

                    <select
                        style={inputStyle}
                        onChange={e => updateLguForm("lguType", e.target.value)}
                    >
                        <option value="">Select LGU Type</option>
                        <option>Province</option>
                        <option>City</option>
                        <option>Municipality</option>
                    </select>

                    <input
                        placeholder="Official LGU Name (e.g. City Government of Angeles)"
                        style={inputStyle}
                        onChange={e => updateLguForm("officialName", e.target.value)}
                    />

                    <input
                        placeholder="PSGC Code"
                        style={inputStyle}
                        onChange={e => updateLguForm("psgcCode", e.target.value)}
                    />

                    <input
                        placeholder="Administrative Region (e.g. Region III)"
                        style={inputStyle}
                        onChange={e => updateLguForm("region", e.target.value)}
                    />

                    <input
                        placeholder="Barangays Covered (comma-separated)"
                        style={inputStyle}
                        onChange={e => updateLguForm("barangays", e.target.value)}
                    />
                </div>
            )}

            {/* AUTHORITY */}
            {clientStep === 2 && (
                <div style={cardStyle}>
                    <h2>Legal Authority & Authorization</h2>

                    <input
                        placeholder="Authorizing Office (e.g. Mayor’s Office)"
                        style={inputStyle}
                        onChange={e => updateLguForm("authorizingOffice", e.target.value)}
                    />

                    <select
                        style={inputStyle}
                        onChange={e => updateLguForm("legalBasis", e.target.value)}
                    >
                        <option value="">Select Legal Basis</option>
                        <option>Executive Order</option>
                        <option>City Ordinance</option>
                        <option>Memorandum of Agreement</option>
                        <option>Pilot Authorization</option>
                    </select>

                    <input
                        placeholder="Reference Number (e.g. EO No. 12 s. 2024)"
                        style={inputStyle}
                        onChange={e => updateLguForm("referenceNumber", e.target.value)}
                    />

                    <input
                        type="date"
                        style={inputStyle}
                        onChange={e => updateLguForm("effectiveDate", e.target.value)}
                    />
                </div>
            )}

            {/* OFFICIALS */}
            {clientStep === 3 && (
                <div style={cardStyle}>
                    <h2>LGU Officials & Administrator Accounts</h2>

                    <input
                        placeholder="Primary Official Name"
                        style={inputStyle}
                        onChange={e => updateLguForm("primaryAdminName", e.target.value)}
                    />

                    <input
                        placeholder="Position Title (e.g. City Transport Officer)"
                        style={inputStyle}
                        onChange={e => updateLguForm("primaryAdminPosition", e.target.value)}
                    />

                    <input
                        placeholder="Official Email"
                        style={inputStyle}
                        onChange={e => updateLguForm("primaryAdminEmail", e.target.value)}
                    />

                    <input
                        placeholder="Secondary / Backup Email"
                        style={inputStyle}
                        onChange={e => updateLguForm("secondaryAdminEmail", e.target.value)}
                    />
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
                    disabled={clientStep === 3}
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
    width: "80vh",
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


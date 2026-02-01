import { useState, useEffect } from "react";
import { RouteEditor } from "../src/RouteEditor.jsx";
import { supabase } from "../src/supabase.jsx";
import { RouteManager } from "../src/RouteManager.jsx";
import { createAccount } from "../src/createAccount.jsx";
import { fetchAccounts } from "../src/fetchAccounts.jsx";
import { deleteAccount } from "../src/deleteAccount.jsx";
import { editAccount } from "../src/editAccount.jsx";

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

    // --- Accounts ---
    const [accounts, setAccounts] = useState([]);
    const [accountsLoading, setAccountsLoading] = useState(true);
    const [accountsError, setAccountsError] = useState(null);
    const [searchId, setSearchId] = useState("");

    const [modalOpen, setModalOpen] = useState(false);
    const [newAccountData, setNewAccountData] = useState({
        email: "",
        full_name: "",
        role: "operator",
        role_variant: "",
    });
    const [creationResult, setCreationResult] = useState(null);
    const [creationLoading, setCreationLoading] = useState(false);
    const [creationError, setCreationError] = useState(null);

    const [editingAccount, setEditingAccount] = useState(null);
    const [editForm, setEditForm] = useState({
        full_name: "",
        role: "operator",
        role_variant: "",
    });

    const updateLguForm = (field, value) => {
        setLguForm((prev) => ({ ...prev, [field]: value }));
    };

    useEffect(() => {
        const fetchRegions = async () => {
            const { data, error } = await supabase.from("regions").select("*");
            if (error) return console.error(error);
            setRegions(data);
            if (data?.length > 0) setSelectedRegionId(data[0].id);
        };

        fetchRegions();
    }, []);

    useEffect(() => {
        reloadAccounts();
    }, []);

    const reloadAccounts = async () => {
        setAccountsLoading(true);
        const { data, error } = await supabase
            .from("users")
            .select("*")
            .order("created_at", { ascending: false });
        if (error) setAccountsError(error.message);
        else setAccounts(data);
        setAccountsLoading(false);
    };

    // --- Render Helpers ---
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

    const renderRoutes = () => <RouteManager />;

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

    const filteredAccounts = accounts.filter((acc) =>
        (acc.staff_id ?? "").toLowerCase().includes((searchId ?? "").toLowerCase())
    );

    const renderAccountManagement = () => {
        return (
            <div>
                <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                    <button style={primaryButtonStyle} onClick={() => setModalOpen(true)}>
                        + Create Account
                    </button>

                    <input
                        type="text"
                        placeholder="Search by Staff ID"
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: 4, width: 220 }}
                    />
                </div>

                {accountsLoading && <p>Loading accounts…</p>}
                {accountsError && <p style={{ color: "red" }}>{accountsError}</p>}
                {!accountsLoading && filteredAccounts.length === 0 && <p>No accounts found.</p>}

                <div style={{ border: "1px solid #e5e7eb" }}>
                    {filteredAccounts.map((acc) => (
                        <div
                            key={acc.id}
                            style={{
                                display: "grid",
                                gridTemplateColumns: "140px 0.9fr 160px 120px",
                                alignItems: "center",
                                padding: "0.5rem 0.75rem",
                                borderBottom: "1px solid #e5e7eb",
                                fontSize: "0.9rem",
                            }}
                        >
                            <div style={{ fontWeight: 600 }}>{acc.staff_id}</div>

                            <div>
                                <div>
                                    <strong>{acc.full_name || "—"}</strong>
                                </div>
                                <div style={{ opacity: 0.6 }}>{acc.email}</div>
                                <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>
                                    Created: {new Date(acc.created_at).toLocaleDateString()}
                                </div>
                            </div>

                            <div style={{ textTransform: "capitalize" }}>{acc.role}</div>

                            <div style={{ display: "flex", gap: "0.25rem" }}>
                                <button
                                    style={secondaryButtonStyle}
                                    onClick={() => {
                                        setEditingAccount(acc);
                                        setEditForm({
                                            full_name: acc.full_name || "",
                                            role: acc.role,
                                            role_variant: acc.role_variant || "",
                                        });
                                    }}
                                >
                                    Edit
                                </button>
                                <button style={secondaryButtonStyle} onClick={() => alert("Reset password")}>
                                    Reset
                                </button>
                                <button
                                    style={secondaryButtonStyle}
                                    onClick={async () => {
                                        if (!confirm("Delete this account?")) return;
                                        await deleteAccount(acc.id);
                                        await reloadAccounts();
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // --- Modal Component for Create Account ---
    const renderCreateAccountModal = () => {
        if (!modalOpen) return null;

        const handleCreate = async (e) => {
            e.preventDefault();
            setCreationError(null);
            setCreationResult(null);
            setCreationLoading(true);

            try {
                const result = await createAccount(newAccountData);
                setCreationResult(result);
                await reloadAccounts();
            } catch (err) {
                setCreationError(err.message || "Failed to create account.");
            } finally {
                setCreationLoading(false);
            }
        };

        return (
            <div style={modalBackdropStyle}>
                <div style={modalStyle}>
                    <h3>Create Account</h3>
                    <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <input
                            type="email"
                            placeholder="Email"
                            value={newAccountData.email}
                            onChange={(e) => setNewAccountData((prev) => ({ ...prev, email: e.target.value }))}
                            required
                            style={inputStyle}
                        />
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={newAccountData.full_name}
                            onChange={(e) => setNewAccountData((prev) => ({ ...prev, full_name: e.target.value }))}
                            style={inputStyle}
                        />
                        <select
                            value={newAccountData.role}
                            onChange={(e) => setNewAccountData((prev) => ({ ...prev, role: e.target.value }))}
                            style={inputStyle}
                        >
                            <option value="operator">Operator</option>
                            <option value="administration">Administration</option>
                        </select>
                        <input
                            type="text"
                            placeholder="Role Variant (optional)"
                            value={newAccountData.role_variant}
                            onChange={(e) => setNewAccountData((prev) => ({ ...prev, role_variant: e.target.value }))}
                            style={inputStyle}
                        />

                        {creationError && <p style={{ color: "red" }}>{creationError}</p>}

                        <button type="submit" style={primaryButtonStyle} disabled={creationLoading}>
                            {creationLoading ? "Creating…" : "Create"}
                        </button>
                        <button type="button" style={secondaryButtonStyle} onClick={() => setModalOpen(false)}>
                            Cancel
                        </button>
                    </form>

                    {creationResult && (
                        <div style={{ marginTop: "1rem", backgroundColor: "#f3f4f6", padding: "0.75rem", borderRadius: 4 }}>
                            <p>
                                <strong>Staff ID:</strong> {creationResult.staff_id}
                            </p>
                            <p>
                                <strong>Password:</strong> {creationResult.password}
                            </p>
                            <p>
                                <strong>Email:</strong> {creationResult.email}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // --- Modal Component for Editing Account ---
    const renderEditAccountModal = () => {
        if (!editingAccount) return null;
        return (
            <div style={modalBackdropStyle}>
                <div style={modalStyle}>
                    <h3>Edit Account</h3>
                    <input
                        placeholder="Full Name"
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    />
                    <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                        <option value="operator">Operator</option>
                        <option value="administration">Administration</option>
                    </select>
                    <input
                        placeholder="Role Variant (optional)"
                        value={editForm.role_variant}
                        onChange={(e) => setEditForm({ ...editForm, role_variant: e.target.value })}
                    />
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                        <button
                            style={primaryButtonStyle}
                            onClick={async () => {
                                await editAccount({ user_id: editingAccount.id, ...editForm });
                                setEditingAccount(null);
                                await reloadAccounts();
                            }}
                        >
                            Save
                        </button>
                        <button style={secondaryButtonStyle} onClick={() => setEditingAccount(null)}>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // --- Content switch ---
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
                <header style={headerStyle}></header>
                <section style={{ marginTop: "1rem" }}>{renderContent()}</section>
            </main>

            {/* Modals */}
            {renderCreateAccountModal()}
            {renderEditAccountModal()}
        </div>
    );
}

// --- Styles (unchanged) ---
const sidebarStyle = {
    width: "240px",
    backgroundColor: "#1f2937",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    padding: "1rem",
};
const mainStyle = { flex: 1, padding: "1rem 2rem", overflowY: "auto", backgroundColor: "#f3f4f6" };
const headerStyle = { display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" };
const cardStyle = { backgroundColor: "#fff", borderRadius: "12px", padding: "1rem", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" };
const inputStyle = { width: "100%", padding: "0.5rem", marginBottom: "0.5rem", borderRadius: "8px", border: "1px solid #d1d5db" };
const primaryButtonStyle = { width: "100%", padding: "0.5rem", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" };
const secondaryButtonStyle = { width: "100%", padding: "0.5rem", backgroundColor: "#e5e7eb", border: "none", borderRadius: "8px", cursor: "pointer" };
const modalBackdropStyle = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)", display: "flex", justifyContent: "center", alignItems: "center" };
const modalStyle = { backgroundColor: "#fff", padding: "1.5rem", borderRadius: 6, width: 400 };

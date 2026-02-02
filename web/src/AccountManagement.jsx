import { useState, useEffect } from "react";
import { supabase } from "../src/supabase.jsx";
import { createAccount } from "../src/createAccount.jsx";

export default function AccountManagement() {
    const [accounts, setAccounts] = useState([]);
    const [accountsLoading, setAccountsLoading] = useState(true);
    const [accountsError, setAccountsError] = useState(null);
    const [searchId, setSearchId] = useState("");

    // Modals
    const [modalOpen, setModalOpen] = useState(false);
    const [newAccountData, setNewAccountData] = useState({
        email: "",
        full_name: "",
        phone: "",
        role: "operator",
        role_variant: "",
    });
    const [creationResult, setCreationResult] = useState(null);
    const [creationLoading, setCreationLoading] = useState(false);
    const [creationError, setCreationError] = useState(null);

    const [editingAccount, setEditingAccount] = useState(null);
    const [editForm, setEditForm] = useState({
        full_name: "",
        phone: "",
        role: "operator",
        role_variant: "",
    });

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

    // --- Account Management Functions ---
    const handleCreate = async (e) => {
        e.preventDefault();
        setCreationError(null);
        setCreationResult(null);
        setCreationLoading(true);

        try {
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-account`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify(newAccountData),
                }
            );
            const data = await res.json();
            if (!data.success) throw new Error(data.error || "Failed to create account");

            setCreationResult(data);
            await reloadAccounts();
        } catch (err) {
            setCreationError(err.message);
        } finally {
            setCreationLoading(false);
        }
    };

    const handleEdit = async () => {
        try {
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/edit-account`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify({ user_id: editingAccount.id, ...editForm }),
                }
            );
            const data = await res.json();
            if (!data.success) throw new Error(data.error || "Edit failed");

            setEditingAccount(null);
            await reloadAccounts();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleResetPassword = async (user_id) => {
        if (!confirm("Reset password for this account?")) return;

        try {
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify({ user_id }),
                }
            );
            const data = await res.json();
            if (!data.success) throw new Error(data.error || "Reset failed");

            alert(`New password: ${data.password}`);
        } catch (err) {
            alert(err.message);
        }
    };

    const handleDeleteAccount = async (user_id) => {
        if (!confirm("Delete this account?")) return;

        try {
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify({ user_id }),
                }
            );
            const data = await res.json();
            if (!data.success) throw new Error(data.error || "Delete failed");

            await reloadAccounts();
        } catch (err) {
            alert(err.message);
        }
    };

    const filteredAccounts = accounts.filter((acc) =>
        (acc.staff_id ?? "").toLowerCase().includes(searchId.toLowerCase())
    );

    // --- Render JSX ---
    return (
        <div style={{ padding: "1rem", fontFamily: "'Inter', sans-serif" }}>
            {/* Header: Search + Create */}
            <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginBottom: "1rem" }}>
                <button
                    style={primaryButtonStyle}
                    onClick={() => setModalOpen(true)}
                >
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

            {/* Account List */}
            {accountsLoading && <p>Loading accounts…</p>}
            {accountsError && <p style={{ color: "red" }}>{accountsError}</p>}
            {!accountsLoading && filteredAccounts.length === 0 && <p>No accounts found.</p>}

            <div style={{ border: "1px solid #e5e7eb", borderRadius: 4 }}>
                {filteredAccounts.map((acc) => (
                    <div
                        key={acc.id}
                        style={{
                            display: "grid",
                            gridTemplateColumns: "140px 1fr 120px 150px 180px",
                            alignItems: "center",
                            padding: "0.5rem 0.75rem",
                            borderBottom: "1px solid #e5e7eb",
                            fontSize: "0.9rem",
                        }}
                    >
                        <div style={{ fontWeight: 600 }}>{acc.staff_id}</div>
                        <div>
                            <div><strong>{acc.full_name || "—"}</strong></div>
                            <div style={{ opacity: 0.6 }}>{acc.email}</div>
                            <div style={{ opacity: 0.6 }}>{acc.phone || "—"}</div>
                        </div>
                        <div style={{ textTransform: "capitalize" }}>{acc.role}</div>
                        <div>{new Date(acc.created_at).toLocaleString()}</div>
                        <div style={{ display: "flex", gap: "0.25rem" }}>
                            <button style={secondaryButtonStyle} onClick={() => {
                                setEditingAccount(acc);
                                setEditForm({
                                    full_name: acc.full_name || "",
                                    phone: acc.phone || "",
                                    role: acc.role,
                                    role_variant: acc.role_variant || "",
                                });
                            }}>Edit</button>
                            <button style={secondaryButtonStyle} onClick={() => handleResetPassword(acc.id)}>Reset</button>
                            <button style={secondaryButtonStyle} onClick={() => handleDeleteAccount(acc.id)}>Delete</button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Modal */}
            {modalOpen && (
                <div style={modalBackdropStyle}>
                    <div style={modalStyle}>
                        <h3>Create Account</h3>
                        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            <input
                                type="email"
                                placeholder="Email"
                                value={newAccountData.email}
                                onChange={(e) => setNewAccountData(prev => ({ ...prev, email: e.target.value }))}
                                required
                                style={inputStyle}
                            />
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={newAccountData.full_name}
                                onChange={(e) => setNewAccountData(prev => ({ ...prev, full_name: e.target.value }))}
                                style={inputStyle}
                            />
                            <input
                                type="tel"
                                placeholder="Phone"
                                value={newAccountData.phone}
                                onChange={(e) => setNewAccountData(prev => ({ ...prev, phone: e.target.value }))}
                                style={inputStyle}
                            />
                            <select
                                value={newAccountData.role}
                                onChange={(e) => setNewAccountData(prev => ({ ...prev, role: e.target.value }))}
                                style={inputStyle}
                            >
                                <option value="operator">Operator</option>
                                <option value="administration">Administration</option>
                            </select>
                            <input
                                type="text"
                                placeholder="Role Variant (optional)"
                                value={newAccountData.role_variant}
                                onChange={(e) => setNewAccountData(prev => ({ ...prev, role_variant: e.target.value }))}
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
                                <p><strong>Staff ID:</strong> {creationResult.staff_id}</p>
                                <p><strong>Password:</strong> {creationResult.password}</p>
                                <p><strong>Email:</strong> {creationResult.email}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingAccount && (
                <div style={modalBackdropStyle}>
                    <div style={modalStyle}>
                        <h3>Edit Account</h3>
                        <input
                            placeholder="Full Name"
                            value={editForm.full_name}
                            onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                        />
                        <input
                            placeholder="Phone"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
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
                            <button style={primaryButtonStyle} onClick={handleEdit}>Save</button>
                            <button style={secondaryButtonStyle} onClick={() => setEditingAccount(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Styles ---
const inputStyle = { width: "100%", padding: "0.5rem", borderRadius: 8, border: "1px solid #d1d5db" };
const primaryButtonStyle = { padding: "0.5rem", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" };
const secondaryButtonStyle = { padding: "0.5rem", backgroundColor: "#e5e7eb", border: "none", borderRadius: 8, cursor: "pointer" };
const modalBackdropStyle = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)", display: "flex", justifyContent: "center", alignItems: "center" };
const modalStyle = { backgroundColor: "#fff", padding: "1.5rem", borderRadius: 6, width: 400 };
const primaryButtonStyleSmall = { padding: "0.25rem 0.5rem", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" };

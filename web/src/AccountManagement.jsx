import { useState, useEffect } from "react";
import { supabase } from "../src/supabase.jsx";

export default function AccountManagement() {
    // State management
    const [accounts, setAccounts] = useState([]);
    const [filteredAccounts, setFilteredAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedRole, setSelectedRole] = useState("all");
    const [sortBy, setSortBy] = useState("created_at");
    const [sortOrder, setSortOrder] = useState("desc");

    // Modals
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState(null);

    // Form states
    const [newAccount, setNewAccount] = useState({
        email: "",
        full_name: "",
        phone: "",
        role: "operator",
        role_variant: "",
    });

    const [editForm, setEditForm] = useState({
        full_name: "",
        phone: "",
        role: "",
        role_variant: "",
    });

    const [creationResult, setCreationResult] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState(null);

    // Role configurations
    const roles = [
        { value: "operator", label: "Operator", color: "#0ea5e9", bgColor: "#f0f9ff" },
        { value: "admin", label: "Administrator", color: "#8b5cf6", bgColor: "#f5f3ff" },
        { value: "driver", label: "Driver", color: "#10b981", bgColor: "#f0fdf4" },
        { value: "passenger", label: "Passenger", color: "#f59e0b", bgColor: "#fffbeb" }
    ];

    useEffect(() => {
        fetchAccounts();
    }, []);

    useEffect(() => {
        filterAndSortAccounts();
    }, [accounts, searchTerm, selectedRole, sortBy, sortOrder]);

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("users")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setAccounts(data || []);
            setError(null);
        } catch (err) {
            setError(err.message);
            console.error("Error fetching accounts:", err);
        } finally {
            setLoading(false);
        }
    };

    const filterAndSortAccounts = () => {
        let filtered = [...accounts];

        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(acc =>
                (acc.staff_id || "").toLowerCase().includes(term) ||
                (acc.full_name || "").toLowerCase().includes(term) ||
                (acc.email || "").toLowerCase().includes(term) ||
                (acc.phone || "").includes(term)
            );
        }

        // Filter by role
        if (selectedRole !== "all") {
            filtered = filtered.filter(acc => acc.role === selectedRole);
        }

        // Sort
        filtered.sort((a, b) => {
            const aVal = a[sortBy] || "";
            const bVal = b[sortBy] || "";

            if (sortOrder === "asc") {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        setFilteredAccounts(filtered);
    };

    const handleCreateAccount = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        setActionError(null);
        setCreationResult(null);

        try {
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-account`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify(newAccount),
                }
            );

            const data = await res.json();

            if (!data.success) {
                throw new Error(data.error || "Failed to create account");
            }

            setCreationResult(data);
            setNewAccount({
                email: "",
                full_name: "",
                phone: "",
                role: "operator",
                role_variant: "",
            });

            await fetchAccounts();
        } catch (err) {
            setActionError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleEditAccount = async () => {
        setActionLoading(true);
        setActionError(null);

        try {
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/edit-account`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify({
                        user_id: selectedAccount.id,
                        ...editForm
                    }),
                }
            );

            const data = await res.json();

            if (!data.success) {
                throw new Error(data.error || "Failed to update account");
            }

            setEditModalOpen(false);
            setSelectedAccount(null);
            await fetchAccounts();
        } catch (err) {
            setActionError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleResetPassword = async (userId) => {
        if (!window.confirm("Are you sure you want to reset the password for this account?")) return;

        try {
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify({ user_id: userId }),
                }
            );

            const data = await res.json();

            if (!data.success) {
                throw new Error(data.error || "Failed to reset password");
            }

            alert(`Password reset successful!\nNew password: ${data.password}\n\nPlease provide this to the user securely.`);
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleDeleteAccount = async (userId) => {
        if (!window.confirm("Are you sure you want to delete this account? This action cannot be undone.")) return;

        try {
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify({ user_id: userId }),
                }
            );

            const data = await res.json();

            if (!data.success) {
                throw new Error(data.error || "Failed to delete account");
            }

            await fetchAccounts();
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    const getRoleConfig = (roleValue) => {
        return roles.find(r => r.value === roleValue) || roles[0];
    };

    const getRoleCount = (roleValue) => {
        return accounts.filter(acc => acc.role === roleValue).length;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div style={styles.container}>
            {/* Simplified Control Panel */}
            <div style={styles.controlPanel}>
                <div style={styles.controlRow}>
                    <div style={styles.searchContainer}>
                        <input
                            type="text"
                            placeholder="Search accounts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={styles.searchInput}
                        />
                    </div>

                    <button
                        style={styles.primaryButton}
                        onClick={() => setCreateModalOpen(true)}
                    >
                        + Create Account
                    </button>
                </div>

                {/* Simplified Filters */}
                <div style={styles.filterRow}>
                    <div style={styles.filterGroup}>
                        <span style={styles.filterLabel}>Filter:</span>
                        <div style={styles.roleFilters}>
                            <button
                                style={{
                                    ...styles.roleFilterButton,
                                    ...(selectedRole === "all" ? styles.roleFilterActive : {})
                                }}
                                onClick={() => setSelectedRole("all")}
                            >
                                All ({accounts.length})
                            </button>
                            {roles.map(role => {
                                const count = getRoleCount(role.value);
                                return (
                                    <button
                                        key={role.value}
                                        style={{
                                            ...styles.roleFilterButton,
                                            backgroundColor: role.bgColor,
                                            color: role.color,
                                            border: `1px solid ${role.color}20`,
                                            ...(selectedRole === role.value ? styles.roleFilterActive : {})
                                        }}
                                        onClick={() => setSelectedRole(role.value)}
                                    >
                                        {role.label} ({count})
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div style={styles.sortContainer}>
                        <span style={styles.sortLabel}>Sort by:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            style={styles.select}
                        >
                            <option value="created_at">Creation Date</option>
                            <option value="full_name">Name</option>
                            <option value="role">Role</option>
                        </select>
                        <button
                            style={styles.sortButton}
                            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                            title={sortOrder === "asc" ? "Sort ascending" : "Sort descending"}
                        >
                            {sortOrder === "asc" ? "↑" : "↓"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Account Table */}
            <div style={styles.tableContainer}>
                {loading ? (
                    <div style={styles.loadingContainer}>
                        <div style={styles.spinner}></div>
                        <p>Loading accounts...</p>
                    </div>
                ) : error ? (
                    <div style={styles.errorContainer}>
                        <p style={styles.errorText}>Error: {error}</p>
                        <button style={styles.secondaryButton} onClick={fetchAccounts}>
                            Retry
                        </button>
                    </div>
                ) : filteredAccounts.length === 0 ? (
                    <div style={styles.emptyState}>
                        <p>No accounts found matching your criteria.</p>
                    </div>
                ) : (
                    <table style={styles.table}>
                        <thead>
                        <tr>
                            <th style={styles.th}>Staff ID</th>
                            <th style={styles.th}>User Information</th>
                            <th style={styles.th}>Role</th>
                            <th style={styles.th}>Created</th>
                            <th style={styles.th}>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredAccounts.map(account => {
                            const roleConfig = getRoleConfig(account.role);
                            return (
                                <tr key={account.id} style={styles.tr}>
                                    <td style={styles.td}>
                                        <div style={styles.staffId}>{account.staff_id}</div>
                                    </td>
                                    <td style={styles.td}>
                                        <div style={styles.userInfo}>
                                            <div style={styles.userName}>{account.full_name || "—"}</div>
                                            <div style={styles.userDetail}>{account.email}</div>
                                            <div style={styles.userDetail}>{account.phone || "No phone"}</div>
                                        </div>
                                    </td>
                                    <td style={styles.td}>
                                            <span style={{
                                                ...styles.roleBadge,
                                                backgroundColor: roleConfig.bgColor,
                                                color: roleConfig.color
                                            }}>
                                                {roleConfig.label}
                                            </span>
                                        {account.role_variant && (
                                            <div style={styles.roleVariant}>
                                                {account.role_variant}
                                            </div>
                                        )}
                                    </td>
                                    <td style={styles.td}>
                                        {formatDate(account.created_at)}
                                    </td>
                                    <td style={styles.td}>
                                        <div style={styles.actionButtons}>
                                            <button
                                                style={styles.actionButton}
                                                onClick={() => {
                                                    setSelectedAccount(account);
                                                    setViewModalOpen(true);
                                                }}
                                            >
                                                View
                                            </button>
                                            <button
                                                style={styles.actionButton}
                                                onClick={() => {
                                                    setSelectedAccount(account);
                                                    setEditForm({
                                                        full_name: account.full_name || "",
                                                        phone: account.phone || "",
                                                        role: account.role,
                                                        role_variant: account.role_variant || "",
                                                    });
                                                    setEditModalOpen(true);
                                                }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                style={styles.actionButton}
                                                onClick={() => handleResetPassword(account.id)}
                                            >
                                                Reset
                                            </button>
                                            <button
                                                style={{...styles.actionButton, ...styles.deleteButton}}
                                                onClick={() => handleDeleteAccount(account.id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create Account Modal */}
            {createModalOpen && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>Create New Account</h2>
                            <button
                                style={styles.closeButton}
                                onClick={() => {
                                    setCreateModalOpen(false);
                                    setCreationResult(null);
                                    setActionError(null);
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleCreateAccount} style={styles.form}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Email Address *</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="user@government.gov"
                                    value={newAccount.email}
                                    onChange={(e) => setNewAccount({...newAccount, email: e.target.value})}
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Full Name</label>
                                <input
                                    type="text"
                                    placeholder="John Doe"
                                    value={newAccount.full_name}
                                    onChange={(e) => setNewAccount({...newAccount, full_name: e.target.value})}
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Phone Number</label>
                                <input
                                    type="tel"
                                    placeholder="+1 (555) 123-4567"
                                    value={newAccount.phone}
                                    onChange={(e) => setNewAccount({...newAccount, phone: e.target.value})}
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Role *</label>
                                <div style={styles.roleOptions}>
                                    {roles.map(role => (
                                        <label
                                            key={role.value}
                                            style={{
                                                ...styles.roleOption,
                                                borderColor: newAccount.role === role.value ? role.color : "#e5e7eb",
                                                backgroundColor: newAccount.role === role.value ? role.bgColor : "#fff"
                                            }}
                                        >
                                            <input
                                                type="radio"
                                                name="role"
                                                value={role.value}
                                                checked={newAccount.role === role.value}
                                                onChange={(e) => setNewAccount({...newAccount, role: e.target.value})}
                                                style={styles.radioInput}
                                            />
                                            <span style={{color: role.color}}>{role.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Role Variant / Department (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Transportation Division, Field Operations"
                                    value={newAccount.role_variant}
                                    onChange={(e) => setNewAccount({...newAccount, role_variant: e.target.value})}
                                    style={styles.input}
                                />
                            </div>

                            {actionError && (
                                <div style={styles.errorAlert}>
                                    {actionError}
                                </div>
                            )}

                            <div style={styles.modalActions}>
                                <button
                                    type="submit"
                                    style={styles.primaryButton}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? "Creating..." : "Create Account"}
                                </button>
                                <button
                                    type="button"
                                    style={styles.secondaryButton}
                                    onClick={() => {
                                        setCreateModalOpen(false);
                                        setCreationResult(null);
                                        setActionError(null);
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>

                        {creationResult && (
                            <div style={styles.resultCard}>
                                <h3 style={styles.resultTitle}>Account Created Successfully</h3>
                                <div style={styles.resultDetails}>
                                    <div style={styles.resultRow}>
                                        <strong>Staff ID:</strong> {creationResult.staff_id}
                                    </div>
                                    <div style={styles.resultRow}>
                                        <strong>Temporary Password:</strong>
                                        <span style={styles.password}>{creationResult.password}</span>
                                    </div>
                                    <div style={styles.resultRow}>
                                        <strong>Email:</strong> {creationResult.email}
                                    </div>
                                    <div style={styles.resultRow}>
                                        <strong>Role:</strong> {roles.find(r => r.value === creationResult.role)?.label}
                                    </div>
                                </div>
                                <p style={styles.resultNote}>
                                    Please provide these credentials to the user securely.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Edit Account Modal */}
            {editModalOpen && selectedAccount && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>Edit Account</h2>
                            <button
                                style={styles.closeButton}
                                onClick={() => {
                                    setEditModalOpen(false);
                                    setSelectedAccount(null);
                                    setActionError(null);
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <div style={styles.form}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Current Staff ID</label>
                                <input
                                    type="text"
                                    value={selectedAccount.staff_id}
                                    disabled
                                    style={styles.disabledInput}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Full Name</label>
                                <input
                                    type="text"
                                    value={editForm.full_name}
                                    onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Phone Number</label>
                                <input
                                    type="tel"
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Role</label>
                                <select
                                    value={editForm.role}
                                    onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                                    style={styles.select}
                                >
                                    {roles.map(role => (
                                        <option key={role.value} value={role.value}>
                                            {role.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Role Variant / Department</label>
                                <input
                                    type="text"
                                    value={editForm.role_variant}
                                    onChange={(e) => setEditForm({...editForm, role_variant: e.target.value})}
                                    style={styles.input}
                                />
                            </div>

                            {actionError && (
                                <div style={styles.errorAlert}>
                                    {actionError}
                                </div>
                            )}

                            <div style={styles.modalActions}>
                                <button
                                    style={styles.primaryButton}
                                    onClick={handleEditAccount}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? "Saving..." : "Save Changes"}
                                </button>
                                <button
                                    style={styles.secondaryButton}
                                    onClick={() => {
                                        setEditModalOpen(false);
                                        setSelectedAccount(null);
                                        setActionError(null);
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View Account Modal */}
            {viewModalOpen && selectedAccount && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>Account Details</h2>
                            <button
                                style={styles.closeButton}
                                onClick={() => {
                                    setViewModalOpen(false);
                                    setSelectedAccount(null);
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <div style={styles.detailsContainer}>
                            <div style={styles.detailRow}>
                                <strong>Staff ID:</strong>
                                <span>{selectedAccount.staff_id}</span>
                            </div>
                            <div style={styles.detailRow}>
                                <strong>Full Name:</strong>
                                <span>{selectedAccount.full_name || "—"}</span>
                            </div>
                            <div style={styles.detailRow}>
                                <strong>Email:</strong>
                                <span>{selectedAccount.email}</span>
                            </div>
                            <div style={styles.detailRow}>
                                <strong>Phone:</strong>
                                <span>{selectedAccount.phone || "—"}</span>
                            </div>
                            <div style={styles.detailRow}>
                                <strong>Role:</strong>
                                <span style={{
                                    ...styles.roleBadge,
                                    backgroundColor: getRoleConfig(selectedAccount.role).bgColor,
                                    color: getRoleConfig(selectedAccount.role).color
                                }}>
                                    {getRoleConfig(selectedAccount.role).label}
                                </span>
                            </div>
                            {selectedAccount.role_variant && (
                                <div style={styles.detailRow}>
                                    <strong>Department:</strong>
                                    <span>{selectedAccount.role_variant}</span>
                                </div>
                            )}
                            <div style={styles.detailRow}>
                                <strong>Account Created:</strong>
                                <span>{formatDate(selectedAccount.created_at)}</span>
                            </div>
                            <div style={styles.detailRow}>
                                <strong>Last Login:</strong>
                                <span>{selectedAccount.last_login_at ? formatDate(selectedAccount.last_login_at) : "Never"}</span>
                            </div>
                        </div>

                        <div style={styles.modalActions}>
                            <button
                                style={styles.secondaryButton}
                                onClick={() => {
                                    setViewModalOpen(false);
                                    setSelectedAccount(null);
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Styles
const styles = {
    container: {
        padding: "1.5rem",
        fontFamily: "'Segoe UI', 'Roboto', sans-serif",
        backgroundColor: "#f8fafc",
        minHeight: "100vh",
        color: "#1e293b"
    },
    controlPanel: {
        backgroundColor: "#fff",
        padding: "1rem",
        borderRadius: "0.375rem",
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        marginBottom: "1rem"
    },
    controlRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1rem"
    },
    searchContainer: {
        flex: 1,
        marginRight: "1rem"
    },
    searchInput: {
        width: "100%",
        padding: "0.625rem 0.875rem",
        border: "1px solid #d1d5db",
        borderRadius: "0.375rem",
        fontSize: "0.875rem"
    },
    filterRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: "0.75rem",
        borderTop: "1px solid #f3f4f6"
    },
    filterGroup: {
        display: "flex",
        alignItems: "center",
        gap: "0.75rem"
    },
    filterLabel: {
        fontSize: "0.875rem",
        fontWeight: "500",
        color: "#4b5563"
    },
    roleFilters: {
        display: "flex",
        gap: "0.375rem"
    },
    roleFilterButton: {
        padding: "0.375rem 0.75rem",
        border: "1px solid transparent",
        borderRadius: "0.375rem",
        fontSize: "0.75rem",
        fontWeight: "500",
        cursor: "pointer",
        transition: "all 0.15s"
    },
    roleFilterActive: {
        transform: "translateY(-1px)",
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)"
    },
    sortContainer: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem"
    },
    sortLabel: {
        fontSize: "0.875rem",
        fontWeight: "500",
        color: "#4b5563"
    },
    select: {
        padding: "0.375rem 0.75rem",
        border: "1px solid #d1d5db",
        borderRadius: "0.375rem",
        backgroundColor: "#fff",
        fontSize: "0.875rem"
    },
    sortButton: {
        padding: "0.375rem 0.75rem",
        minWidth: "2.25rem",
        border: "1px solid #d1d5db",
        borderRadius: "0.375rem",
        backgroundColor: "#fff",
        cursor: "pointer",
        fontSize: "0.875rem",
        fontWeight: "500"
    },
    primaryButton: {
        padding: "0.625rem 1.25rem",
        backgroundColor: "#1d4ed8",
        color: "#fff",
        border: "none",
        borderRadius: "0.375rem",
        cursor: "pointer",
        fontWeight: "500",
        fontSize: "0.875rem",
        transition: "background-color 0.15s"
    },
    secondaryButton: {
        padding: "0.625rem 1.25rem",
        backgroundColor: "#fff",
        color: "#374151",
        border: "1px solid #d1d5db",
        borderRadius: "0.375rem",
        cursor: "pointer",
        fontWeight: "500",
        fontSize: "0.875rem",
        transition: "all 0.15s"
    },
    tableContainer: {
        backgroundColor: "#fff",
        borderRadius: "0.375rem",
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        overflow: "hidden"
    },
    loadingContainer: {
        padding: "2rem",
        textAlign: "center",
        color: "#6b7280"
    },
    spinner: {
        border: "3px solid #f3f3f3",
        borderTop: "3px solid #1d4ed8",
        borderRadius: "50%",
        width: "36px",
        height: "36px",
        animation: "spin 1s linear infinite",
        margin: "0 auto 0.75rem"
    },
    errorContainer: {
        padding: "1.5rem",
        textAlign: "center"
    },
    errorText: {
        color: "#dc2626",
        marginBottom: "0.75rem"
    },
    emptyState: {
        padding: "2rem",
        textAlign: "center",
        color: "#6b7280"
    },
    table: {
        width: "100%",
        borderCollapse: "collapse"
    },
    th: {
        padding: "0.75rem 1rem",
        textAlign: "left",
        backgroundColor: "#f9fafb",
        borderBottom: "1px solid #e5e7eb",
        fontSize: "0.75rem",
        fontWeight: "600",
        color: "#4b5563",
        textTransform: "uppercase",
        letterSpacing: "0.05em"
    },
    tr: {
        borderBottom: "1px solid #f3f4f6",
        transition: "background-color 0.15s"
    },
    td: {
        padding: "1rem",
        fontSize: "0.875rem"
    },
    staffId: {
        fontWeight: "600",
        color: "#1e293b",
        fontFamily: "monospace"
    },
    userInfo: {
        lineHeight: "1.5"
    },
    userName: {
        fontWeight: "500",
        color: "#1e293b",
        marginBottom: "0.125rem"
    },
    userDetail: {
        fontSize: "0.75rem",
        color: "#6b7280",
        marginBottom: "0.125rem"
    },
    roleBadge: {
        padding: "0.25rem 0.625rem",
        borderRadius: "9999px",
        fontSize: "0.75rem",
        fontWeight: "500",
        display: "inline-block"
    },
    roleVariant: {
        fontSize: "0.75rem",
        color: "#6b7280",
        marginTop: "0.25rem"
    },
    actionButtons: {
        display: "flex",
        gap: "0.375rem"
    },
    actionButton: {
        padding: "0.375rem 0.625rem",
        border: "1px solid #e5e7eb",
        borderRadius: "0.25rem",
        backgroundColor: "#fff",
        color: "#374151",
        cursor: "pointer",
        fontSize: "0.75rem",
        fontWeight: "500",
        transition: "all 0.15s"
    },
    deleteButton: {
        color: "#dc2626",
        borderColor: "#fecaca"
    },
    modalOverlay: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000
    },
    modal: {
        backgroundColor: "#fff",
        borderRadius: "0.5rem",
        width: "100%",
        maxWidth: "500px",
        maxHeight: "90vh",
        overflow: "auto"
    },
    modalHeader: {
        padding: "1.25rem",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
    },
    modalTitle: {
        fontSize: "1.125rem",
        fontWeight: "600",
        color: "#1e293b",
        margin: 0
    },
    closeButton: {
        padding: "0.25rem",
        border: "none",
        backgroundColor: "transparent",
        fontSize: "1.5rem",
        cursor: "pointer",
        color: "#6b7280",
        lineHeight: 1
    },
    form: {
        padding: "1.25rem"
    },
    formGroup: {
        marginBottom: "1rem"
    },
    label: {
        display: "block",
        fontSize: "0.875rem",
        fontWeight: "500",
        color: "#374151",
        marginBottom: "0.375rem"
    },
    input: {
        width: "100%",
        padding: "0.625rem",
        border: "1px solid #d1d5db",
        borderRadius: "0.375rem",
        fontSize: "0.875rem",
        transition: "border-color 0.15s"
    },
    disabledInput: {
        width: "100%",
        padding: "0.625rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "#f9fafb",
        borderRadius: "0.375rem",
        fontSize: "0.875rem",
        color: "#6b7280"
    },
    roleOptions: {
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "0.5rem"
    },
    roleOption: {
        padding: "0.625rem",
        border: "1px solid #e5e7eb",
        borderRadius: "0.375rem",
        cursor: "pointer",
        fontSize: "0.875rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem"
    },
    radioInput: {
        margin: 0
    },
    errorAlert: {
        padding: "0.625rem",
        backgroundColor: "#fef2f2",
        border: "1px solid #fee2e2",
        color: "#dc2626",
        borderRadius: "0.375rem",
        fontSize: "0.875rem",
        marginBottom: "0.75rem"
    },
    modalActions: {
        display: "flex",
        gap: "0.5rem",
        justifyContent: "flex-end"
    },
    resultCard: {
        marginTop: "1.25rem",
        padding: "1rem",
        backgroundColor: "#f0f9ff",
        border: "1px solid #0ea5e9",
        borderRadius: "0.375rem"
    },
    resultTitle: {
        fontSize: "0.875rem",
        fontWeight: "600",
        color: "#0369a1",
        margin: "0 0 0.75rem 0"
    },
    resultDetails: {
        display: "flex",
        flexDirection: "column",
        gap: "0.375rem"
    },
    resultRow: {
        display: "flex",
        gap: "0.5rem",
        fontSize: "0.875rem"
    },
    password: {
        fontFamily: "monospace",
        backgroundColor: "#fff",
        padding: "0.125rem 0.375rem",
        borderRadius: "0.25rem",
        border: "1px solid #d1d5db",
        marginLeft: "0.375rem"
    },
    resultNote: {
        fontSize: "0.75rem",
        color: "#64748b",
        marginTop: "0.5rem",
        fontStyle: "italic"
    },
    detailsContainer: {
        padding: "1.25rem"
    },
    detailRow: {
        display: "flex",
        justifyContent: "space-between",
        padding: "0.625rem 0",
        borderBottom: "1px solid #f3f4f6",
        fontSize: "0.875rem"
    }
};

const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`, styleSheet.cssRules.length);
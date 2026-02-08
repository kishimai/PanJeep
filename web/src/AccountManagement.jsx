import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "../src/supabase.jsx";

// Role configurations
const ROLES = [
    { value: "operator", label: "Operator", color: "#1d4ed8", bgColor: "#eff6ff" },
    { value: "admin", label: "Administrator", color: "#7c3aed", bgColor: "#f5f3ff" },
    { value: "driver", label: "Driver", color: "#059669", bgColor: "#f0fdf4" },
    { value: "passenger", label: "Passenger", color: "#d97706", bgColor: "#fffbeb" }
];

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

    // Modal state
    const [activeModal, setActiveModal] = useState(null);
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
    const [formErrors, setFormErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState(null);

    // Refs
    const modalRef = useRef();
    const firstInputRef = useRef();
    const closeButtonRef = useRef();

    // Memoized values
    const roleCounts = useMemo(() => {
        const counts = { all: accounts.length };
        ROLES.forEach(role => {
            counts[role.value] = accounts.filter(acc => acc.role === role.value).length;
        });
        return counts;
    }, [accounts]);

    const getRoleConfig = useCallback((roleValue) =>
        ROLES.find(r => r.value === roleValue) || ROLES[0], []
    );

    // Effects
    useEffect(() => {
        fetchAccounts();
    }, []);

    useEffect(() => {
        filterAndSortAccounts();
    }, [accounts, searchTerm, selectedRole, sortBy, sortOrder]);

    useEffect(() => {
        const handleEscapeKey = (event) => {
            if (event.key === 'Escape' && activeModal) {
                closeModal();
            }
        };

        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target) && activeModal) {
                closeModal();
            }
        };

        document.addEventListener('keydown', handleEscapeKey);
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('keydown', handleEscapeKey);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [activeModal]);

    useEffect(() => {
        if (activeModal) {
            setTimeout(() => {
                if (firstInputRef.current) {
                    firstInputRef.current.focus();
                } else if (closeButtonRef.current) {
                    closeButtonRef.current.focus();
                }
            }, 100);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [activeModal]);

    // Functions
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

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(acc =>
                (acc.staff_id || "").toLowerCase().includes(term) ||
                (acc.full_name || "").toLowerCase().includes(term) ||
                (acc.email || "").toLowerCase().includes(term) ||
                (acc.phone || "").includes(term)
            );
        }

        if (selectedRole !== "all") {
            filtered = filtered.filter(acc => acc.role === selectedRole);
        }

        filtered.sort((a, b) => {
            const aVal = a[sortBy] || "";
            const bVal = b[sortBy] || "";
            return sortOrder === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
        });

        setFilteredAccounts(filtered);
    };

    const validateEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const validateCreateForm = () => {
        const errors = {};

        if (!newAccount.email.trim()) {
            errors.email = "Email is required";
        } else if (!validateEmail(newAccount.email)) {
            errors.email = "Please enter a valid email address";
        }

        if (newAccount.phone && !/^[\+]?[1-9][\d]{0,14}$/.test(newAccount.phone.replace(/\D/g, ''))) {
            errors.phone = "Please enter a valid phone number";
        }

        if (!newAccount.role.trim()) {
            errors.role = "Role is required";
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreateAccount = async (e) => {
        e.preventDefault();

        if (!validateCreateForm()) return;

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
            setFormErrors({});

            await fetchAccounts();
        } catch (err) {
            setActionError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleEditAccount = async () => {
        if (!editForm.role.trim()) {
            setActionError("Role is required");
            return;
        }

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

            setSuccessMessage("Account updated successfully!");
            setTimeout(() => {
                closeModal();
                setSuccessMessage(null);
            }, 1500);

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

            alert(`Password reset successful!\n\nNew password: ${data.password}\n\nPlease provide this to the user securely.`);
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

    const openModal = (modalType, account = null) => {
        setActiveModal(modalType);
        setSelectedAccount(account);
        setActionError(null);
        setFormErrors({});

        if (modalType === 'edit' && account) {
            setEditForm({
                full_name: account.full_name || "",
                phone: account.phone || "",
                role: account.role,
                role_variant: account.role_variant || "",
            });
        }
    };

    const closeModal = () => {
        setActiveModal(null);
        setSelectedAccount(null);
        setCreationResult(null);
        setActionError(null);
        setSuccessMessage(null);
        setFormErrors({});
    };

    const formatDate = (dateString) => {
        if (!dateString) return "Never";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Render Functions
    const renderControlPanel = () => (
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
                    onClick={() => openModal('create')}
                >
                    Create New Account
                </button>
            </div>

            <div style={styles.filterRow}>
                <div style={styles.filterGroup}>
                    <span style={styles.filterLabel}>Filter by role:</span>
                    <div style={styles.roleFilters}>
                        <button
                            style={{
                                ...styles.roleFilterButton,
                                ...(selectedRole === "all" && styles.roleFilterActive)
                            }}
                            onClick={() => setSelectedRole("all")}
                        >
                            All ({roleCounts.all})
                        </button>
                        {ROLES.map(role => (
                            <button
                                key={role.value}
                                style={{
                                    ...styles.roleFilterButton,
                                    backgroundColor: role.bgColor,
                                    border: `1px solid ${role.color}`,
                                    ...(selectedRole === role.value && styles.roleFilterActive)
                                }}
                                onClick={() => setSelectedRole(role.value)}
                            >
                                {role.label} ({roleCounts[role.value]})
                            </button>
                        ))}
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
    );

    const renderAccountTable = () => {
        if (loading) {
            return (
                <div style={styles.loadingContainer}>
                    <div style={styles.spinner}></div>
                    <p style={styles.loadingText}>Loading accounts...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div style={styles.errorContainer}>
                    <p style={styles.errorText}>Error: {error}</p>
                    <button style={styles.secondaryButton} onClick={fetchAccounts}>
                        Retry
                    </button>
                </div>
            );
        }

        if (filteredAccounts.length === 0) {
            return (
                <div style={styles.emptyState}>
                    <p>No accounts found matching your criteria.</p>
                </div>
            );
        }

        return (
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
                                    <div style={styles.userDetail}>{account.phone || "No phone number"}</div>
                                </div>
                            </td>
                            <td style={styles.td}>
                                <div style={styles.roleCell}>
                    <span style={{
                        ...styles.roleBadge,
                        backgroundColor: roleConfig.bgColor,
                        border: `1px solid ${roleConfig.color}`
                    }}>
                      {roleConfig.label}
                    </span>
                                    {account.role_variant && (
                                        <div style={styles.roleVariant}>
                                            {account.role_variant}
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td style={styles.td}>
                                <div style={styles.dateCell}>
                                    {formatDate(account.created_at)}
                                </div>
                            </td>
                            <td style={styles.td}>
                                <div style={styles.actionButtons}>
                                    <button
                                        style={styles.viewButton}
                                        onClick={() => openModal('view', account)}
                                        title="View account details"
                                    >
                                        View
                                    </button>
                                    <button
                                        style={styles.editButton}
                                        onClick={() => openModal('edit', account)}
                                        title="Edit account"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        style={styles.resetButton}
                                        onClick={() => handleResetPassword(account.id)}
                                        title="Reset password"
                                    >
                                        Reset
                                    </button>
                                    <button
                                        style={styles.deleteButton}
                                        onClick={() => handleDeleteAccount(account.id)}
                                        title="Delete account"
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
        );
    };

    const renderCreateModal = () => (
        <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
                <div style={styles.modalTitleSection}>
                    <h2 id="modal-title" style={styles.modalTitle}>Create New Account</h2>
                    <p style={styles.modalSubtitle}>Add a new user to the system</p>
                </div>
                <button
                    ref={closeButtonRef}
                    style={styles.closeButton}
                    onClick={closeModal}
                    aria-label="Close modal"
                >
                    ×
                </button>
            </div>

            <form onSubmit={handleCreateAccount} style={styles.form}>
                <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Email Address *</label>
                        <input
                            ref={firstInputRef}
                            type="email"
                            required
                            placeholder="user@government.gov"
                            value={newAccount.email}
                            onChange={(e) => {
                                setNewAccount({...newAccount, email: e.target.value});
                                if (formErrors.email) setFormErrors({...formErrors, email: null});
                            }}
                            style={{
                                ...styles.input,
                                ...(formErrors.email && styles.inputError)
                            }}
                        />
                        {formErrors.email && (
                            <div style={styles.errorTextInline}>{formErrors.email}</div>
                        )}
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
                            onChange={(e) => {
                                setNewAccount({...newAccount, phone: e.target.value});
                                if (formErrors.phone) setFormErrors({...formErrors, phone: null});
                            }}
                            style={{
                                ...styles.input,
                                ...(formErrors.phone && styles.inputError)
                            }}
                        />
                        {formErrors.phone && (
                            <div style={styles.errorTextInline}>{formErrors.phone}</div>
                        )}
                    </div>

                    <div style={{...styles.formGroup, gridColumn: "span 2"}}>
                        <label style={styles.label}>Role *</label>
                        <input
                            type="text"
                            required
                            placeholder="Enter role (e.g., Operator, Administrator, Driver, Passenger)"
                            value={newAccount.role}
                            onChange={(e) => {
                                setNewAccount({...newAccount, role: e.target.value});
                                if (formErrors.role) setFormErrors({...formErrors, role: null});
                            }}
                            style={{
                                ...styles.input,
                                ...(formErrors.role && styles.inputError)
                            }}
                        />
                        {formErrors.role && (
                            <div style={styles.errorTextInline}>{formErrors.role}</div>
                        )}
                        <div style={styles.roleHint}>
                            Standard roles: Operator, Administrator, Driver, Passenger
                        </div>
                    </div>

                    <div style={{...styles.formGroup, gridColumn: "span 2"}}>
                        <label style={styles.label}>Department / Variant</label>
                        <input
                            type="text"
                            placeholder="e.g., Transportation Division, Field Operations"
                            value={newAccount.role_variant}
                            onChange={(e) => setNewAccount({...newAccount, role_variant: e.target.value})}
                            style={styles.input}
                        />
                    </div>
                </div>

                {actionError && (
                    <div style={styles.errorAlert}>
                        <div style={styles.alertIcon}>!</div>
                        <div>{actionError}</div>
                    </div>
                )}

                <div style={styles.modalFooter}>
                    <button
                        type="submit"
                        style={styles.submitButton}
                        disabled={actionLoading}
                    >
                        {actionLoading ? (
                            <>
                                <span style={styles.spinnerSmall}></span>
                                Creating...
                            </>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                    <button
                        type="button"
                        style={styles.cancelButton}
                        onClick={closeModal}
                        disabled={actionLoading}
                    >
                        Cancel
                    </button>
                </div>
            </form>

            {creationResult && (
                <div style={styles.successCard}>
                    <div style={styles.successHeader}>
                        <div style={styles.successIcon}>✓</div>
                        <h3 style={styles.successTitle}>Account Created Successfully</h3>
                    </div>
                    <div style={styles.successDetails}>
                        <div style={styles.successDetailRow}>
                            <span style={styles.successLabel}>Staff ID:</span>
                            <span style={styles.successValue}>{creationResult.staff_id}</span>
                        </div>
                        <div style={styles.successDetailRow}>
                            <span style={styles.successLabel}>Temporary Password:</span>
                            <code style={styles.passwordDisplay}>{creationResult.password}</code>
                        </div>
                        <div style={styles.successDetailRow}>
                            <span style={styles.successLabel}>Email:</span>
                            <span style={styles.successValue}>{creationResult.email}</span>
                        </div>
                        <div style={styles.successDetailRow}>
                            <span style={styles.successLabel}>Role:</span>
                            <span style={styles.successValue}>{creationResult.role}</span>
                        </div>
                    </div>
                    <div style={styles.successNote}>
                        Please provide these credentials to the user securely. The temporary password can only be viewed now.
                    </div>
                    <button
                        style={styles.continueButton}
                        onClick={closeModal}
                    >
                        Continue
                    </button>
                </div>
            )}
        </div>
    );

    const renderEditModal = () => (
        <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
                <div style={styles.modalTitleSection}>
                    <h2 id="modal-title" style={styles.modalTitle}>Edit Account</h2>
                    <p style={styles.modalSubtitle}>Update user information</p>
                </div>
                <button
                    ref={closeButtonRef}
                    style={styles.closeButton}
                    onClick={closeModal}
                    aria-label="Close modal"
                >
                    ×
                </button>
            </div>

            <div style={styles.form}>
                <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Staff ID</label>
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
                            ref={firstInputRef}
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
                        <label style={styles.label}>Role *</label>
                        <input
                            type="text"
                            required
                            placeholder="Enter role"
                            value={editForm.role}
                            onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Department / Variant</label>
                        <input
                            type="text"
                            value={editForm.role_variant}
                            onChange={(e) => setEditForm({...editForm, role_variant: e.target.value})}
                            style={styles.input}
                        />
                    </div>
                </div>

                {actionError && (
                    <div style={styles.errorAlert}>
                        <div style={styles.alertIcon}>!</div>
                        <div>{actionError}</div>
                    </div>
                )}

                {successMessage && (
                    <div style={styles.successAlert}>
                        <div style={styles.alertIcon}>✓</div>
                        <div>{successMessage}</div>
                    </div>
                )}

                <div style={styles.modalFooter}>
                    <button
                        style={styles.submitButton}
                        onClick={handleEditAccount}
                        disabled={actionLoading}
                    >
                        {actionLoading ? (
                            <>
                                <span style={styles.spinnerSmall}></span>
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                    <button
                        style={styles.cancelButton}
                        onClick={closeModal}
                        disabled={actionLoading}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );

    const renderViewModal = () => (
        <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
                <div style={styles.modalTitleSection}>
                    <h2 id="modal-title" style={styles.modalTitle}>Account Details</h2>
                    <p style={styles.modalSubtitle}>View user information</p>
                </div>
                <button
                    ref={closeButtonRef}
                    style={styles.closeButton}
                    onClick={closeModal}
                    aria-label="Close modal"
                >
                    ×
                </button>
            </div>

            <div style={styles.detailsGrid}>
                <div style={styles.detailSection}>
                    <div style={styles.detailLabel}>Staff ID</div>
                    <div style={styles.detailValue}>{selectedAccount.staff_id}</div>
                </div>

                <div style={styles.detailSection}>
                    <div style={styles.detailLabel}>Full Name</div>
                    <div style={styles.detailValue}>{selectedAccount.full_name || "Not specified"}</div>
                </div>

                <div style={styles.detailSection}>
                    <div style={styles.detailLabel}>Email Address</div>
                    <div style={styles.detailValue}>{selectedAccount.email}</div>
                </div>

                <div style={styles.detailSection}>
                    <div style={styles.detailLabel}>Phone Number</div>
                    <div style={styles.detailValue}>{selectedAccount.phone || "Not specified"}</div>
                </div>

                <div style={styles.detailSection}>
                    <div style={styles.detailLabel}>Role</div>
                    <div style={styles.detailValue}>
            <span style={{
                ...styles.roleBadgeLarge,
                backgroundColor: getRoleConfig(selectedAccount.role).bgColor,
                border: `1px solid ${getRoleConfig(selectedAccount.role).color}`
            }}>
              {getRoleConfig(selectedAccount.role).label}
            </span>
                    </div>
                </div>

                {selectedAccount.role_variant && (
                    <div style={styles.detailSection}>
                        <div style={styles.detailLabel}>Department</div>
                        <div style={styles.detailValue}>{selectedAccount.role_variant}</div>
                    </div>
                )}

                <div style={styles.detailSection}>
                    <div style={styles.detailLabel}>Account Created</div>
                    <div style={styles.detailValue}>{formatDate(selectedAccount.created_at)}</div>
                </div>

                <div style={styles.detailSection}>
                    <div style={styles.detailLabel}>Last Login</div>
                    <div style={styles.detailValue}>
                        {selectedAccount.last_login_at ? formatDate(selectedAccount.last_login_at) : "Never"}
                    </div>
                </div>
            </div>

            <div style={styles.modalFooter}>
                <button
                    style={styles.editButton}
                    onClick={() => openModal('edit', selectedAccount)}
                >
                    Edit Account
                </button>
                <button
                    style={styles.cancelButton}
                    onClick={closeModal}
                >
                    Close
                </button>
            </div>
        </div>
    );

    return (
        <div style={styles.container}>
            {renderControlPanel()}

            <div style={styles.tableContainer}>
                {renderAccountTable()}
            </div>

            {activeModal && (
                <div style={styles.modalBackdrop}>
                    <div
                        ref={modalRef}
                        style={styles.modalContainer}
                        role="dialog"
                        aria-labelledby="modal-title"
                    >
                        {activeModal === 'create' && renderCreateModal()}
                        {activeModal === 'edit' && selectedAccount && renderEditModal()}
                        {activeModal === 'view' && selectedAccount && renderViewModal()}
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
        fontFamily: "'Helvetica Neue', 'Arial', sans-serif",
        backgroundColor: "#f8f9fa",
        minHeight: "100vh",
        color: "#212529",
        fontSize: "14px"
    },
    controlPanel: {
        backgroundColor: "#ffffff",
        padding: "1.5rem",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
        marginBottom: "1.5rem",
        border: "1px solid #dee2e6"
    },
    controlRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1.25rem",
        gap: "1rem"
    },
    searchContainer: {
        flex: 1
    },
    searchInput: {
        width: "100%",
        padding: "0.75rem 1rem",
        border: "1px solid #ced4da",
        borderRadius: "6px",
        fontSize: "0.875rem",
        backgroundColor: "#ffffff",
        color: "#212529"
    },
    filterRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: "1rem",
        borderTop: "1px solid #e9ecef"
    },
    filterGroup: {
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        flexWrap: "wrap"
    },
    filterLabel: {
        fontSize: "0.875rem",
        fontWeight: "600",
        color: "#495057"
    },
    roleFilters: {
        display: "flex",
        gap: "0.5rem",
        flexWrap: "wrap"
    },
    roleFilterButton: {
        padding: "0.5rem 0.875rem",
        border: "1px solid transparent",
        borderRadius: "6px",
        fontSize: "0.75rem",
        fontWeight: "500",
        cursor: "pointer",
        color: "#212529",
        backgroundColor: "#ffffff"
    },
    roleFilterActive: {
        borderColor: "#0052cc",
        boxShadow: "0 0 0 2px rgba(0, 82, 204, 0.2)"
    },
    sortContainer: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem"
    },
    sortLabel: {
        fontSize: "0.875rem",
        fontWeight: "600",
        color: "#495057"
    },
    select: {
        padding: "0.5rem 0.75rem",
        border: "1px solid #ced4da",
        borderRadius: "6px",
        backgroundColor: "#ffffff",
        fontSize: "0.875rem",
        cursor: "pointer",
        color: "#212529"
    },
    sortButton: {
        padding: "0.5rem 0.875rem",
        minWidth: "2.5rem",
        border: "1px solid #ced4da",
        borderRadius: "6px",
        backgroundColor: "#ffffff",
        cursor: "pointer",
        fontSize: "0.875rem",
        fontWeight: "600",
        color: "#212529"
    },
    primaryButton: {
        padding: "0.75rem 1.5rem",
        backgroundColor: "#0052cc",
        color: "#ffffff",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        fontWeight: "600",
        fontSize: "0.875rem",
        transition: "background-color 0.2s",
        "&:hover": {
            backgroundColor: "#003d99"
        }
    },
    secondaryButton: {
        padding: "0.75rem 1.5rem",
        backgroundColor: "#ffffff",
        color: "#495057",
        border: "1px solid #ced4da",
        borderRadius: "6px",
        cursor: "pointer",
        fontWeight: "600",
        fontSize: "0.875rem",
        transition: "all 0.2s",
        "&:hover": {
            backgroundColor: "#f8f9fa"
        }
    },
    tableContainer: {
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
        overflow: "hidden",
        border: "1px solid #dee2e6"
    },
    loadingContainer: {
        padding: "3rem",
        textAlign: "center"
    },
    loadingText: {
        marginTop: "1rem",
        color: "#6c757d"
    },
    spinner: {
        border: "3px solid #e9ecef",
        borderTop: "3px solid #0052cc",
        borderRadius: "50%",
        width: "48px",
        height: "48px",
        animation: "spin 1s linear infinite",
        margin: "0 auto"
    },
    spinnerSmall: {
        border: "2px solid rgba(255, 255, 255, 0.3)",
        borderTop: "2px solid #ffffff",
        borderRadius: "50%",
        width: "16px",
        height: "16px",
        animation: "spin 1s linear infinite",
        marginRight: "0.5rem",
        display: "inline-block"
    },
    errorContainer: {
        padding: "2rem",
        textAlign: "center"
    },
    errorText: {
        color: "#dc3545",
        marginBottom: "1rem",
        fontSize: "0.875rem"
    },
    errorTextInline: {
        color: "#dc3545",
        fontSize: "0.75rem",
        marginTop: "0.25rem"
    },
    emptyState: {
        padding: "3rem",
        textAlign: "center",
        color: "#6c757d"
    },
    table: {
        width: "100%",
        borderCollapse: "collapse"
    },
    th: {
        padding: "1rem",
        textAlign: "left",
        backgroundColor: "#f8f9fa",
        borderBottom: "1px solid #dee2e6",
        fontSize: "0.75rem",
        fontWeight: "600",
        color: "#495057",
        textTransform: "uppercase",
        letterSpacing: "0.05em"
    },
    tr: {
        borderBottom: "1px solid #e9ecef",
        transition: "background-color 0.2s",
        "&:hover": {
            backgroundColor: "#f8f9fa"
        }
    },
    td: {
        padding: "1rem",
        fontSize: "0.875rem",
        color: "#212529"
    },
    staffId: {
        fontWeight: "600",
        fontFamily: "'Courier New', monospace",
        fontSize: "0.8125rem",
        color: "#212529"
    },
    userInfo: {
        lineHeight: "1.5"
    },
    userName: {
        fontWeight: "600",
        color: "#212529",
        marginBottom: "0.25rem"
    },
    userDetail: {
        fontSize: "0.8125rem",
        color: "#6c757d",
        marginBottom: "0.125rem"
    },
    roleCell: {
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem"
    },
    roleBadge: {
        padding: "0.375rem 0.75rem",
        borderRadius: "4px",
        fontSize: "0.75rem",
        fontWeight: "600",
        display: "inline-block",
        width: "fit-content",
        color: "#212529"
    },
    roleBadgeLarge: {
        padding: "0.5rem 1rem",
        borderRadius: "4px",
        fontSize: "0.875rem",
        fontWeight: "600",
        display: "inline-block",
        color: "#212529"
    },
    roleVariant: {
        fontSize: "0.75rem",
        color: "#6c757d"
    },
    dateCell: {
        color: "#495057",
        fontSize: "0.8125rem"
    },
    actionButtons: {
        display: "flex",
        gap: "0.375rem",
        flexWrap: "wrap"
    },
    viewButton: {
        padding: "0.5rem 0.75rem",
        border: "1px solid #dee2e6",
        borderRadius: "4px",
        backgroundColor: "#ffffff",
        color: "#495057",
        cursor: "pointer",
        fontSize: "0.75rem",
        fontWeight: "500",
        transition: "all 0.2s",
        "&:hover": {
            backgroundColor: "#f8f9fa"
        }
    },
    editButton: {
        padding: "0.5rem 0.75rem",
        border: "1px solid #0d6efd",
        borderRadius: "4px",
        backgroundColor: "#ffffff",
        color: "#0d6efd",
        cursor: "pointer",
        fontSize: "0.75rem",
        fontWeight: "500",
        transition: "all 0.2s",
        "&:hover": {
            backgroundColor: "#f0f7ff"
        }
    },
    resetButton: {
        padding: "0.5rem 0.75rem",
        border: "1px solid #ffc107",
        borderRadius: "4px",
        backgroundColor: "#ffffff",
        color: "#ffc107",
        cursor: "pointer",
        fontSize: "0.75rem",
        fontWeight: "500",
        transition: "all 0.2s",
        "&:hover": {
            backgroundColor: "#fff9e6"
        }
    },
    deleteButton: {
        padding: "0.5rem 0.75rem",
        border: "1px solid #dc3545",
        borderRadius: "4px",
        backgroundColor: "#ffffff",
        color: "#dc3545",
        cursor: "pointer",
        fontSize: "0.75rem",
        fontWeight: "500",
        transition: "all 0.2s",
        "&:hover": {
            backgroundColor: "#fff5f5"
        }
    },
    modalBackdrop: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        animation: "fadeIn 0.2s ease-out"
    },
    modalContainer: {
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        width: "100%",
        maxWidth: "600px",
        maxHeight: "90vh",
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
        animation: "slideUp 0.3s ease-out"
    },
    modalContent: {
        display: "flex",
        flexDirection: "column"
    },
    modalHeader: {
        padding: "1.5rem",
        backgroundColor: "#f8f9fa",
        borderBottom: "1px solid #dee2e6",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start"
    },
    modalTitleSection: {
        flex: 1
    },
    modalTitle: {
        fontSize: "1.25rem",
        fontWeight: "700",
        color: "#212529",
        margin: 0
    },
    modalSubtitle: {
        fontSize: "0.875rem",
        color: "#6c757d",
        margin: "0.25rem 0 0 0"
    },
    closeButton: {
        width: "32px",
        height: "32px",
        border: "1px solid #dee2e6",
        backgroundColor: "#ffffff",
        borderRadius: "4px",
        fontSize: "1.25rem",
        cursor: "pointer",
        color: "#495057",
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s",
        "&:hover": {
            backgroundColor: "#f8f9fa"
        }
    },
    form: {
        padding: "1.5rem"
    },
    formGrid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "1rem",
        marginBottom: "1.5rem"
    },
    formGroup: {
        display: "flex",
        flexDirection: "column",
        gridColumn: "span 1"
    },
    label: {
        fontSize: "0.8125rem",
        fontWeight: "600",
        color: "#495057",
        marginBottom: "0.375rem"
    },
    input: {
        width: "100%",
        padding: "0.625rem 0.875rem",
        border: "1px solid #ced4da",
        borderRadius: "4px",
        fontSize: "0.875rem",
        backgroundColor: "#ffffff",
        color: "#212529",
        transition: "border-color 0.2s, box-shadow 0.2s",
        "&:focus": {
            outline: "none",
            borderColor: "#0052cc",
            boxShadow: "0 0 0 3px rgba(0, 82, 204, 0.1)"
        }
    },
    inputError: {
        borderColor: "#dc3545",
        "&:focus": {
            borderColor: "#dc3545",
            boxShadow: "0 0 0 3px rgba(220, 53, 69, 0.1)"
        }
    },
    disabledInput: {
        width: "100%",
        padding: "0.625rem 0.875rem",
        border: "1px solid #dee2e6",
        backgroundColor: "#f8f9fa",
        borderRadius: "4px",
        fontSize: "0.875rem",
        color: "#6c757d",
        cursor: "not-allowed"
    },
    roleHint: {
        fontSize: "0.75rem",
        color: "#6c757d",
        marginTop: "0.25rem",
        fontStyle: "italic"
    },
    errorAlert: {
        padding: "0.875rem",
        backgroundColor: "#f8d7da",
        border: "1px solid #f5c6cb",
        color: "#721c24",
        borderRadius: "4px",
        fontSize: "0.8125rem",
        marginBottom: "1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem"
    },
    successAlert: {
        padding: "0.875rem",
        backgroundColor: "#d4edda",
        border: "1px solid #c3e6cb",
        color: "#155724",
        borderRadius: "4px",
        fontSize: "0.8125rem",
        marginBottom: "1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem"
    },
    alertIcon: {
        width: "20px",
        height: "20px",
        borderRadius: "50%",
        backgroundColor: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "bold",
        fontSize: "0.75rem"
    },
    modalFooter: {
        padding: "1rem 0 0",
        display: "flex",
        justifyContent: "flex-end",
        gap: "0.75rem",
        borderTop: "1px solid #dee2e6"
    },
    submitButton: {
        padding: "0.75rem 1.5rem",
        backgroundColor: "#0052cc",
        color: "#ffffff",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        fontWeight: "600",
        fontSize: "0.875rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background-color 0.2s",
        "&:disabled": {
            opacity: 0.6,
            cursor: "not-allowed"
        },
        "&:hover:not(:disabled)": {
            backgroundColor: "#003d99"
        }
    },
    cancelButton: {
        padding: "0.75rem 1.5rem",
        backgroundColor: "#ffffff",
        color: "#495057",
        border: "1px solid #ced4da",
        borderRadius: "4px",
        cursor: "pointer",
        fontWeight: "600",
        fontSize: "0.875rem",
        transition: "all 0.2s",
        "&:hover": {
            backgroundColor: "#f8f9fa"
        }
    },
    successCard: {
        marginTop: "1.5rem",
        padding: "1.5rem",
        backgroundColor: "#e8f4ff",
        border: "1px solid #b6d4fe",
        borderRadius: "4px",
        animation: "slideUp 0.3s ease-out"
    },
    successHeader: {
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        marginBottom: "1rem"
    },
    successIcon: {
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        backgroundColor: "#0052cc",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "bold",
        fontSize: "0.875rem"
    },
    successTitle: {
        fontSize: "1rem",
        fontWeight: "700",
        color: "#0052cc",
        margin: 0
    },
    successDetails: {
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        marginBottom: "1rem"
    },
    successDetailRow: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        fontSize: "0.875rem"
    },
    successLabel: {
        fontWeight: "600",
        color: "#495057",
        minWidth: "140px"
    },
    successValue: {
        color: "#212529",
        fontWeight: "500"
    },
    passwordDisplay: {
        fontFamily: "'Courier New', monospace",
        backgroundColor: "#ffffff",
        padding: "0.25rem 0.5rem",
        borderRadius: "4px",
        border: "1px solid #b6d4fe",
        fontSize: "0.8125rem",
        fontWeight: "600",
        color: "#212529"
    },
    successNote: {
        fontSize: "0.75rem",
        color: "#6c757d",
        marginBottom: "1rem",
        lineHeight: 1.4,
        fontStyle: "italic"
    },
    continueButton: {
        padding: "0.75rem 1.5rem",
        backgroundColor: "#0052cc",
        color: "#ffffff",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        fontWeight: "600",
        fontSize: "0.875rem",
        width: "100%",
        transition: "background-color 0.2s",
        "&:hover": {
            backgroundColor: "#003d99"
        }
    },
    detailsGrid: {
        padding: "1.5rem",
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "1rem"
    },
    detailSection: {
        padding: "0.75rem",
        backgroundColor: "#f8f9fa",
        borderRadius: "4px",
        border: "1px solid #dee2e6",
        gridColumn: "span 1"
    },
    detailLabel: {
        fontSize: "0.75rem",
        fontWeight: "600",
        color: "#6c757d",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        marginBottom: "0.25rem"
    },
    detailValue: {
        fontSize: "0.875rem",
        color: "#212529",
        fontWeight: "500",
        wordBreak: "break-word"
    }
};

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
document.head.appendChild(style);
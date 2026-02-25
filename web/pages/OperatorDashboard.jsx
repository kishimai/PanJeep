import { useState, useMemo } from "react";
import { useProfile } from "../src/ProfileContext"; // adjust path if needed
import AccountManagement from "../src/AccountManagement";
import { RouteManager } from "../src/RouteManager.jsx";
import { RegionManagement } from "../src/RegionManagement.jsx";
import { DataQuality } from "../src/DataQuality";

export function OperatorDashboard({ profile }) {
    const { signOut } = useProfile(); // Get signOut from context
    const [signingOut, setSigningOut] = useState(false);

    const operatorTabs = [
        { id: "summary", label: "Summary" },
        { id: "route-overview", label: "Route Overview" },
        { id: "driver-onboarding", label: "Driver Onboarding" },
        { id: "support-tickets", label: "Support Tickets" },
        { id: "data-quality", label: "Data Quality" },
        { id: "account-management", label: "Account Management" },
        { id: "region-management", label: "Regions" },
    ];

    const [activeTab, setActiveTab] = useState("summary");

    const isFullScreenTab = useMemo(() =>
            activeTab === "route-overview",
        [activeTab]);

    const handleSignOut = async () => {
        setSigningOut(true);
        try {
            await signOut();
            // No need to navigate – the PublicRoute in App will redirect automatically
        } catch (error) {
            console.error('Sign out error:', error);
            alert('Failed to sign out. Please try again.');
        } finally {
            setSigningOut(false);
        }
    };

    const renderContent = () => {
        switch(activeTab) {
            case "account-management":
                return <AccountManagement />;
            case "route-overview":
                return (
                    <div style={routeManagerContainerStyle}>
                        <RouteManager operatorId={profile?.id || "SYSTEM"} />
                    </div>
                );
            case "region-management":
                return <RegionManagement />;
            case "data-quality":
                return <DataQuality />;
            default:
                return (
                    <div style={placeholderStyle}>
                        <h3 style={{ color: "#1f2937", marginBottom: "1rem" }}>
                            {operatorTabs.find(t => t.id === activeTab)?.label || "Dashboard"}
                        </h3>
                        <p style={{ color: "#6b7280" }}>Content for this section is under development.</p>
                    </div>
                );
        }
    };

    return (
        <div style={dashboardStyle}>
            <aside style={sidebarStyle}>
                <div style={sidebarHeaderStyle}>
                    <h2 style={sidebarTitleStyle}>Operator Dashboard</h2>
                    <p style={welcomeTextStyle}>
                        Welcome, {profile?.name || "Operator"}
                    </p>
                </div>

                <nav style={navStyle}>
                    {operatorTabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                ...tabButtonStyle,
                                ...(activeTab === tab.id ? activeTabStyle : {}),
                            }}
                            className="tab-button"
                        >
                            <span>{tab.label}</span>
                            {activeTab === tab.id && (
                                <div style={activeTabMarkerStyle}>
                                    <div style={activeTabGlowStyle} />
                                </div>
                            )}
                        </button>
                    ))}
                </nav>

                <div style={sidebarFooterStyle}>
                    {profile?.role && (
                        <div style={roleBadgeStyle}>
                            <span style={roleLabelStyle}>Role:</span>
                            <span style={roleValueStyle}>{profile.role}</span>
                        </div>
                    )}

                    {/* Sign Out Button */}
                    <button
                        onClick={handleSignOut}
                        disabled={signingOut}
                        style={signOutButtonStyle}
                    >
                        {signingOut ? 'Signing out...' : 'Sign Out'}
                    </button>

                    <div style={lastLoginStyle}>
                        <small style={footerTextStyle}>
                            Last login: {new Date().toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                        </small>
                    </div>
                </div>
            </aside>

            <main style={{
                ...mainStyle,
                ...(isFullScreenTab ? fullScreenMainStyle : {}),
            }}>
                {!isFullScreenTab && (
                    <header style={headerStyle}>
                        <div style={breadcrumbStyle}>
                            <span style={breadcrumbItemStyle}>Operator</span>
                            <span style={breadcrumbSeparatorStyle}>›</span>
                            <span style={{...breadcrumbItemStyle, ...breadcrumbActiveStyle}}>
                                {operatorTabs.find(t => t.id === activeTab)?.label}
                            </span>
                        </div>
                    </header>
                )}

                <section style={{
                    ...contentStyle,
                    ...(isFullScreenTab ? fullScreenContentStyle : {}),
                }}>
                    {renderContent()}
                </section>
            </main>
        </div>
    );
}

// Add this new style object for the sign-out button
const signOutButtonStyle = {
    width: '100%',
    padding: '0.625rem 0.75rem',
    marginBottom: '0.75rem',
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    border: '1px solid rgba(220, 38, 38, 0.3)',
    borderRadius: '6px',
    color: '#f87171',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    outline: 'none',
    ':hover': {
        backgroundColor: 'rgba(220, 38, 38, 0.2)',
        borderColor: '#ef4444',
        color: '#fee2e2'
    },
    ':disabled': {
        opacity: 0.5,
        cursor: 'not-allowed'
    }
};

// --- Professional Dashboard Styles ---
const dashboardStyle = {
    display: "flex",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    height: "100vh",
    width: "100vw",
    overflow: "hidden",
    backgroundColor: "#0f172a"
};

const sidebarStyle = {
    width: "260px",
    backgroundColor: "#1e293b",
    color: "#f1f5f9",
    display: "flex",
    flexDirection: "column",
    padding: "1.5rem 1rem",
    borderRight: "1px solid #334155",
    boxShadow: "4px 0 20px rgba(0, 0, 0, 0.3)",
    flexShrink: 0,
    zIndex: 100
};

const sidebarHeaderStyle = {
    marginBottom: "2rem",
    paddingBottom: "1.5rem",
    borderBottom: "1px solid #334155"
};

const sidebarTitleStyle = {
    fontSize: "1.1rem",
    fontWeight: 600,
    letterSpacing: "0.5px",
    marginBottom: "0.25rem",
    color: "#e2e8f0"
};

const welcomeTextStyle = {
    fontSize: "0.875rem",
    color: "#94a3b8",
    fontWeight: 400
};

const navStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    flex: 1
};

const tabButtonStyle = {
    background: "none",
    border: "none",
    color: "#cbd5e1",
    textAlign: "left",
    padding: "0.875rem 1rem",
    cursor: "pointer",
    fontSize: "0.875rem",
    outline: "none",
    borderRadius: "6px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    transition: "all 0.15s ease",
    position: "relative",
    fontWeight: 400,
    letterSpacing: "0.3px",
    backgroundColor: "transparent",
    ':hover': {
        backgroundColor: "rgba(148, 163, 184, 0.08)",
        color: "#f8fafc"
    }
};

const activeTabStyle = {
    backgroundColor: "rgba(30, 64, 175, 0.15)",
    color: "#3b82f6",
    fontWeight: 500,
    boxShadow: "inset 0 0 0 1px rgba(59, 130, 246, 0.2)"
};

const activeTabMarkerStyle = {
    width: "3px",
    height: "20px",
    backgroundColor: "#3b82f6",
    borderRadius: "2px",
    position: "absolute",
    left: "0",
    boxShadow: "0 0 8px rgba(59, 130, 246, 0.4)"
};

const activeTabGlowStyle = {
    width: "100%",
    height: "100%",
    background: "linear-gradient(180deg, rgba(59, 130, 246, 0.8) 0%, rgba(59, 130, 246, 0.4) 100%)",
    borderRadius: "2px"
};

const sidebarFooterStyle = {
    paddingTop: "1.5rem",
    borderTop: "1px solid #334155",
    marginTop: "auto"
};

const roleBadgeStyle = {
    backgroundColor: "rgba(30, 64, 175, 0.2)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    borderRadius: "6px",
    padding: "0.5rem 0.75rem",
    marginBottom: "1rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
};

const roleLabelStyle = {
    fontSize: "0.75rem",
    color: "#94a3b8",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.5px"
};

const roleValueStyle = {
    fontSize: "0.8125rem",
    color: "#3b82f6",
    fontWeight: 600
};

const lastLoginStyle = {
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    borderRadius: "6px",
    padding: "0.5rem 0.75rem",
    border: "1px solid rgba(255, 255, 255, 0.05)"
};

const footerTextStyle = {
    color: "#64748b",
    fontSize: "0.75rem",
    lineHeight: "1.4"
};

const mainStyle = {
    flex: 1,
    padding: "1.5rem",
    overflow: "hidden",
    backgroundColor: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    minWidth: 0
};

const fullScreenMainStyle = {
    padding: "0",
    backgroundColor: "#ffffff"
};

const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid #e2e8f0"
};

const breadcrumbStyle = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.875rem",
    color: "#64748b",
    fontWeight: 400
};

const breadcrumbItemStyle = {
    padding: "0.25rem 0"
};

const breadcrumbSeparatorStyle = {
    color: "#94a3b8",
    fontSize: "0.75rem"
};

const breadcrumbActiveStyle = {
    color: "#1e293b",
    fontWeight: 500
};

const contentStyle = {
    flex: 1,
    marginTop: "1rem",
    borderRadius: "8px",
    backgroundColor: "white",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
    overflow: "hidden"
};

const fullScreenContentStyle = {
    marginTop: 0,
    borderRadius: 0,
    backgroundColor: "#f8fafc",
    boxShadow: "none",
    overflow: "hidden"
};

const routeManagerContainerStyle = {
    width: "100%",
    height: "100%",
    position: "relative",
    overflow: "hidden",
    background: "#ffffff"
};

const placeholderStyle = {
    backgroundColor: "white",
    padding: "3rem 2rem",
    borderRadius: "8px",
    textAlign: "center",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
    minHeight: "400px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center"
};
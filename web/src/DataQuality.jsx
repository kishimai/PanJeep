// DataQuality.jsx - Debug version with detailed logging
import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

export function DataQuality() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [filters, setFilters] = useState({
        routeId: "",
        changeType: "",
        actor: "",
        startDate: "",
        endDate: "",
    });
    const [routes, setRoutes] = useState([]);
    const [stats, setStats] = useState({
        totalChanges: 0,
        uniqueActors: 0,
        routesAffected: 0,
        creditChanges: 0,
        geometryUpdates: 0,
    });
    const [showFilters, setShowFilters] = useState(false);
    const [exporting, setExporting] = useState(false);

    const changeTypes = [
        "geometry_update",
        "stop_update",
        "credit_granted",
        "credit_adjusted",
        "credit_revoked"
    ];

    // Fetch routes for filter dropdown
    useEffect(() => {
        const fetchRoutes = async () => {
            console.log("Fetching routes...");
            const { data, error } = await supabase
                .from("routes")
                .select("id, route_code, geometry->properties->>name")
                .is("deleted_at", null)
                .order("route_code");
            if (error) {
                console.error("Error fetching routes:", error);
            } else {
                console.log(`Fetched ${data?.length} routes`);
                setRoutes(data || []);
            }
        };
        fetchRoutes();
    }, []);

    // Fetch logs – simplified to avoid join issues
    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        console.log("Fetching logs with filters:", filters, "page:", page);

        try {
            // First, get the total count
            let countQuery = supabase
                .from("route_history")
                .select("*", { count: "exact", head: true });

            if (filters.routeId) countQuery = countQuery.eq("route_id", filters.routeId);
            if (filters.changeType) countQuery = countQuery.eq("change_type", filters.changeType);
            if (filters.actor) countQuery = countQuery.ilike("actor_user_id", `%${filters.actor}%`);
            if (filters.startDate) countQuery = countQuery.gte("recorded_at", filters.startDate);
            if (filters.endDate) countQuery = countQuery.lte("recorded_at", filters.endDate);

            const { count, error: countError } = await countQuery;
            if (countError) {
                console.error("Count query error:", countError);
                throw countError;
            }
            console.log("Total count:", count);
            setTotalCount(count || 0);

            // Then fetch the paginated rows (without joins)
            let dataQuery = supabase
                .from("route_history")
                .select("*")
                .order("recorded_at", { ascending: false });

            if (filters.routeId) dataQuery = dataQuery.eq("route_id", filters.routeId);
            if (filters.changeType) dataQuery = dataQuery.eq("change_type", filters.changeType);
            if (filters.actor) dataQuery = dataQuery.ilike("actor_user_id", `%${filters.actor}%`);
            if (filters.startDate) dataQuery = dataQuery.gte("recorded_at", filters.startDate);
            if (filters.endDate) dataQuery = dataQuery.lte("recorded_at", filters.endDate);

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            dataQuery = dataQuery.range(from, to);

            const { data, error: dataError } = await dataQuery;
            if (dataError) {
                console.error("Data query error:", dataError);
                throw dataError;
            }

            console.log(`Fetched ${data?.length} log rows`);
            if (data && data.length > 0) {
                // Now fetch related actor and route info for these rows
                const actorIds = [...new Set(data.map(d => d.actor_user_id).filter(Boolean))];
                const routeIds = [...new Set(data.map(d => d.route_id).filter(Boolean))];

                console.log("Fetching actors for IDs:", actorIds);
                console.log("Fetching routes for IDs:", routeIds);

                let actors = {};
                if (actorIds.length > 0) {
                    const { data: actorData, error: actorError } = await supabase
                        .from("users")
                        .select("id, email, role, full_name")
                        .in("id", actorIds);
                    if (actorError) console.error("Actor fetch error:", actorError);
                    else {
                        actors = Object.fromEntries(actorData.map(a => [a.id, a]));
                    }
                }

                let routesMap = {};
                if (routeIds.length > 0) {
                    const { data: routeData, error: routeError } = await supabase
                        .from("routes")
                        .select("id, route_code")
                        .in("id", routeIds);
                    if (routeError) console.error("Route fetch error:", routeError);
                    else {
                        routesMap = Object.fromEntries(routeData.map(r => [r.id, r]));
                    }
                }

                // Combine the data
                const enrichedLogs = data.map(log => ({
                    ...log,
                    actor: log.actor_user_id ? actors[log.actor_user_id] : null,
                    route: log.route_id ? routesMap[log.route_id] : null,
                }));

                setLogs(enrichedLogs);
            } else {
                setLogs([]);
            }
        } catch (error) {
            console.error("Error in fetchLogs:", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }, [filters, page, pageSize]);

    // Fetch summary stats (simplified)
    const fetchStats = useCallback(async () => {
        try {
            let query = supabase
                .from("route_history")
                .select("change_type, actor_user_id, route_id");

            if (filters.routeId) query = query.eq("route_id", filters.routeId);
            if (filters.changeType) query = query.eq("change_type", filters.changeType);
            if (filters.actor) query = query.ilike("actor_user_id", `%${filters.actor}%`);
            if (filters.startDate) query = query.gte("recorded_at", filters.startDate);
            if (filters.endDate) query = query.lte("recorded_at", filters.endDate);

            const { data, error } = await query;
            if (error) throw error;

            const total = data.length;
            const uniqueActors = new Set(data.map(d => d.actor_user_id)).size;
            const routesAffected = new Set(data.map(d => d.route_id).filter(Boolean)).size;
            const creditChanges = data.filter(d => d.change_type?.includes('credit')).length;
            const geometryUpdates = data.filter(d => d.change_type === 'geometry_update').length;

            setStats({
                totalChanges: total,
                uniqueActors,
                routesAffected,
                creditChanges,
                geometryUpdates,
            });
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    }, [filters]);

    useEffect(() => {
        fetchLogs();
        fetchStats();
    }, [fetchLogs, fetchStats]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setPage(1);
    };

    const clearFilters = () => {
        setFilters({
            routeId: "",
            changeType: "",
            actor: "",
            startDate: "",
            endDate: "",
        });
        setPage(1);
    };

    const formatActor = (log) => {
        if (!log.actor) return "System";
        const name = log.actor.full_name || log.actor.email || "Unknown";
        const role = log.actor_role_at_time || log.actor.role || "user";
        return `${name} (${role})`;
    };

    const formatRoute = (log) => {
        if (!log.route) return "Deleted route";
        return log.route.route_code;
    };

    const formatDetails = (log) => {
        if (log.change_type?.includes("credit")) {
            return `Delta: ${log.credit_delta ?? 0} | Confidence: ${log.credit_confidence_after ?? "—"}`;
        }
        if (log.change_type === "geometry_update" && log.geometry_snapshot) {
            const coords = log.geometry_snapshot.coordinates;
            const count = coords?.length || 0;
            return `Points: ${count}`;
        }
        return "—";
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    const exportToCSV = async () => {
        setExporting(true);
        try {
            let query = supabase
                .from("route_history")
                .select("*")
                .order("recorded_at", { ascending: false });

            if (filters.routeId) query = query.eq("route_id", filters.routeId);
            if (filters.changeType) query = query.eq("change_type", filters.changeType);
            if (filters.actor) query = query.ilike("actor_user_id", `%${filters.actor}%`);
            if (filters.startDate) query = query.gte("recorded_at", filters.startDate);
            if (filters.endDate) query = query.lte("recorded_at", filters.endDate);

            const { data, error } = await query;
            if (error) throw error;

            // We'll export raw data; you could also fetch actors/routes if needed
            const csvRows = [];
            csvRows.push([
                "Timestamp",
                "Actor ID",
                "Route ID",
                "Change Type",
                "Credit Delta",
                "Credit Confidence",
                "Resolution Method",
                "Points Count"
            ].join(","));

            data.forEach(log => {
                const row = [
                    new Date(log.recorded_at).toISOString(),
                    log.actor_user_id || "",
                    log.route_id || "",
                    log.change_type || "",
                    log.credit_delta ?? "",
                    log.credit_confidence_after ?? "",
                    log.resolution_method || "",
                    log.geometry_snapshot?.coordinates?.length ?? ""
                ];
                csvRows.push(row.join(","));
            });

            const csvString = csvRows.join("\n");
            const blob = new Blob([csvString], { type: "text/csv" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `audit_logs_${new Date().toISOString().slice(0,10)}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export failed:", error);
        } finally {
            setExporting(false);
        }
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h2 style={styles.title}>Data Quality & Audit Trail</h2>
                    <p style={styles.subtitle}>Complete history of all route and credit changes</p>
                </div>
                <button
                    onClick={exportToCSV}
                    disabled={exporting || logs.length === 0}
                    style={styles.exportButton}
                >
                    {exporting ? "Exporting..." : "Export CSV"}
                </button>
            </div>

            {/* Summary Cards */}
            <div style={styles.cardGrid}>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{stats.totalChanges.toLocaleString()}</div>
                    <div style={styles.statLabel}>Total Changes</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{stats.uniqueActors}</div>
                    <div style={styles.statLabel}>Unique Actors</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{stats.routesAffected}</div>
                    <div style={styles.statLabel}>Routes Affected</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{stats.creditChanges}</div>
                    <div style={styles.statLabel}>Credit Changes</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{stats.geometryUpdates}</div>
                    <div style={styles.statLabel}>Geometry Updates</div>
                </div>
            </div>

            {/* Filter Toggle */}
            <div style={styles.filterToggle}>
                <button onClick={() => setShowFilters(!showFilters)} style={styles.toggleButton}>
                    {showFilters ? "Hide Filters ▲" : "Show Filters ▼"}
                </button>
            </div>

            {/* Filter Bar */}
            {showFilters && (
                <div style={styles.filterBar}>
                    <select
                        name="routeId"
                        value={filters.routeId}
                        onChange={handleFilterChange}
                        style={styles.filterSelect}
                    >
                        <option value="">All Routes</option>
                        {routes.map(route => (
                            <option key={route.id} value={route.id}>
                                {route.route_code} - {route.name || ""}
                            </option>
                        ))}
                    </select>

                    <select
                        name="changeType"
                        value={filters.changeType}
                        onChange={handleFilterChange}
                        style={styles.filterSelect}
                    >
                        <option value="">All Change Types</option>
                        {changeTypes.map(type => (
                            <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                        ))}
                    </select>

                    <input
                        type="text"
                        name="actor"
                        value={filters.actor}
                        onChange={handleFilterChange}
                        style={styles.filterInput}
                        placeholder="Actor (name or ID)"
                    />

                    <input
                        type="date"
                        name="startDate"
                        value={filters.startDate}
                        onChange={handleFilterChange}
                        style={styles.filterInput}
                    />

                    <input
                        type="date"
                        name="endDate"
                        value={filters.endDate}
                        onChange={handleFilterChange}
                        style={styles.filterInput}
                    />

                    <button onClick={clearFilters} style={styles.clearButton}>
                        Clear
                    </button>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div style={styles.error}>
                    <strong>Error loading data:</strong> {error}
                    <p style={{ marginTop: "0.5rem", fontSize: "0.75rem" }}>
                        Check the browser console for more details.
                    </p>
                </div>
            )}

            {/* Log Table */}
            <div style={styles.tableContainer}>
                {loading ? (
                    <div style={styles.loading}>Loading audit logs...</div>
                ) : logs.length === 0 ? (
                    <div style={styles.empty}>
                        {totalCount === 0 ? "No audit logs found in the database." : "No logs match the current filters."}
                    </div>
                ) : (
                    <table style={styles.table}>
                        <thead style={styles.tableHead}>
                        <tr>
                            <th style={styles.th}>Timestamp</th>
                            <th style={styles.th}>Actor</th>
                            <th style={styles.th}>Route</th>
                            <th style={styles.th}>Change Type</th>
                            <th style={styles.th}>Details</th>
                            <th style={styles.th}>Resolution</th>
                        </tr>
                        </thead>
                        <tbody>
                        {logs.map(log => (
                            <tr key={log.id} style={styles.tr}>
                                <td style={styles.td}>
                                    {new Date(log.recorded_at).toLocaleString()}
                                </td>
                                <td style={styles.td}>
                                    {formatActor(log)}
                                </td>
                                <td style={styles.td}>
                                    {formatRoute(log)}
                                </td>
                                <td style={styles.td}>
                                        <span style={{
                                            ...styles.changeTypeBadge,
                                            backgroundColor: log.change_type?.includes('credit') ? '#FEF3C7' :
                                                log.change_type === 'geometry_update' ? '#E0F2FE' : '#F1F5F9',
                                            color: log.change_type?.includes('credit') ? '#92400E' :
                                                log.change_type === 'geometry_update' ? '#0369A1' : '#1E293B'
                                        }}>
                                            {log.change_type?.replace(/_/g, ' ') || "unknown"}
                                        </span>
                                </td>
                                <td style={styles.td}>
                                    {formatDetails(log)}
                                </td>
                                <td style={styles.td}>
                                    {log.resolution_method || "—"}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={styles.pagination}>
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        style={styles.pageButton}
                    >
                        Previous
                    </button>
                    <span style={styles.pageInfo}>
                        Page {page} of {totalPages} ({totalCount} total records)
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        style={styles.pageButton}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}

// Styles – unchanged from previous version (keep them as before)
const styles = {
    container: {
        padding: "1.5rem",
        height: "100%",
        overflowY: "auto",
        backgroundColor: "#f8fafc",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1.5rem",
    },
    title: {
        fontSize: "1.5rem",
        fontWeight: 600,
        color: "#1e293b",
        marginBottom: "0.25rem",
    },
    subtitle: {
        fontSize: "0.875rem",
        color: "#64748b",
    },
    exportButton: {
        padding: "0.5rem 1rem",
        backgroundColor: "#0066CC",
        color: "#ffffff",
        border: "none",
        borderRadius: "6px",
        fontSize: "0.875rem",
        fontWeight: 500,
        cursor: "pointer",
        transition: "background 0.2s",
        ':hover': {
            backgroundColor: "#0052A3",
        },
        ':disabled': {
            opacity: 0.5,
            cursor: "not-allowed",
        },
    },
    cardGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: "1rem",
        marginBottom: "1.5rem",
    },
    statCard: {
        padding: "1rem",
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        textAlign: "center",
    },
    statValue: {
        fontSize: "1.5rem",
        fontWeight: 600,
        color: "#1e293b",
        lineHeight: 1.2,
        marginBottom: "0.25rem",
    },
    statLabel: {
        fontSize: "0.75rem",
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
    },
    filterToggle: {
        marginBottom: "0.75rem",
        textAlign: "right",
    },
    toggleButton: {
        background: "none",
        border: "none",
        color: "#0066CC",
        fontSize: "0.875rem",
        fontWeight: 500,
        cursor: "pointer",
        padding: "0.25rem 0.5rem",
    },
    filterBar: {
        display: "flex",
        gap: "0.75rem",
        flexWrap: "wrap",
        marginBottom: "1.5rem",
        padding: "1rem",
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    },
    filterSelect: {
        padding: "0.5rem 0.75rem",
        border: "1px solid #cbd5e1",
        borderRadius: "6px",
        fontSize: "0.875rem",
        backgroundColor: "#ffffff",
        color: "#1e293b",
        minWidth: "180px",
        flex: "1 1 auto",
    },
    filterInput: {
        padding: "0.5rem 0.75rem",
        border: "1px solid #cbd5e1",
        borderRadius: "6px",
        fontSize: "0.875rem",
        backgroundColor: "#ffffff",
        color: "#1e293b",
        minWidth: "150px",
        flex: "1 1 auto",
    },
    clearButton: {
        padding: "0.5rem 1rem",
        backgroundColor: "#f1f5f9",
        border: "1px solid #cbd5e1",
        borderRadius: "6px",
        fontSize: "0.875rem",
        color: "#475569",
        cursor: "pointer",
        transition: "background 0.2s",
        ':hover': {
            backgroundColor: "#e2e8f0",
        },
    },
    error: {
        padding: "1rem",
        backgroundColor: "#FEF2F2",
        border: "1px solid #FEE2E2",
        borderRadius: "6px",
        color: "#991B1B",
        marginBottom: "1rem",
        fontSize: "0.875rem",
    },
    tableContainer: {
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        border: "1px solid #e2e8f0",
        overflowX: "auto",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        marginBottom: "1.5rem",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "0.875rem",
    },
    tableHead: {
        backgroundColor: "#f8fafc",
        borderBottom: "2px solid #e2e8f0",
    },
    th: {
        padding: "1rem",
        textAlign: "left",
        fontWeight: 600,
        color: "#475569",
        whiteSpace: "nowrap",
    },
    tr: {
        borderBottom: "1px solid #e2e8f0",
        ':hover': {
            backgroundColor: "#f8fafc",
        },
    },
    td: {
        padding: "1rem",
        color: "#1e293b",
        verticalAlign: "top",
    },
    changeTypeBadge: {
        display: "inline-block",
        padding: "0.25rem 0.5rem",
        borderRadius: "4px",
        fontSize: "0.75rem",
        fontWeight: 500,
        textTransform: "capitalize",
    },
    loading: {
        padding: "3rem",
        textAlign: "center",
        color: "#64748b",
    },
    empty: {
        padding: "3rem",
        textAlign: "center",
        color: "#94a3b8",
        fontStyle: "italic",
    },
    pagination: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "1rem",
    },
    pageButton: {
        padding: "0.5rem 1rem",
        backgroundColor: "#ffffff",
        border: "1px solid #cbd5e1",
        borderRadius: "6px",
        fontSize: "0.875rem",
        color: "#475569",
        cursor: "pointer",
        transition: "background 0.2s",
        ':hover:not(:disabled)': {
            backgroundColor: "#f1f5f9",
        },
        ':disabled': {
            opacity: 0.5,
            cursor: "not-allowed",
        },
    },
    pageInfo: {
        fontSize: "0.875rem",
        color: "#475569",
    },
};
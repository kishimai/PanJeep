// POIManager.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePOIs } from './usePOIs';

const styles = {
    // Layout
    section: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
    },
    sectionHeader: {
        padding: '12px 20px',
        borderBottom: '1px solid #e5e7eb',
        background: '#f9fafb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionTitle: {
        color: '#374151',
        fontSize: '14px',
        fontWeight: 600,
        letterSpacing: '-0.01em',
    },
    primaryButton: {
        background: '#1d4ed8',
        color: '#ffffff',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'background-color 0.2s',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    },
    backButton: {
        background: 'transparent',
        border: '1px solid #d1d5db',
        color: '#4b5563',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    // List items
    regionsList: {
        flex: 1,
        overflowY: 'auto',
    },
    regionItem: {
        padding: '12px 16px',
        borderBottom: '1px solid #e5e7eb',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        '&:hover': {
            background: '#f9fafb',
        },
    },
    regionHeader: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    regionNameRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    regionName: {
        fontWeight: 600,
        color: '#1f2937',
        fontSize: '14px',
        flex: 1,
    },
    deleteButton: {
        background: 'transparent',
        border: 'none',
        color: '#9ca3af',
        cursor: 'pointer',
        fontSize: '14px',
        padding: '2px 6px',
        borderRadius: '4px',
        '&:hover': {
            background: '#fee2e2',
            color: '#dc2626',
        },
    },
    regionMeta: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    regionBadge: {
        fontSize: '10px',
        padding: '2px 6px',
        borderRadius: '10px',
        fontWeight: 500,
        textTransform: 'uppercase',
        background: '#e5e7eb',
        color: '#374151',
    },
    regionCode: {
        fontSize: '11px',
        color: '#6b7280',
        fontFamily: 'monospace',
        background: '#f3f4f6',
        padding: '2px 6px',
        borderRadius: '4px',
    },
    emptyState: {
        padding: '40px 20px',
        textAlign: 'center',
        color: '#9ca3af',
    },
    emptyIcon: {
        fontSize: '36px',
        marginBottom: '12px',
    },
    emptyTitle: {
        fontSize: '14px',
        fontWeight: 600,
        marginBottom: '8px',
        color: '#6b7280',
    },
    emptyText: {
        fontSize: '13px',
        marginBottom: '16px',
    },
    // Form
    detailsCard: {
        padding: '16px',
    },
    formGroup: {
        marginBottom: '16px',
    },
    formLabel: {
        display: 'block',
        marginBottom: '4px',
        fontSize: '13px',
        fontWeight: 500,
        color: '#374151',
    },
    formInput: {
        width: '100%',
        padding: '8px 12px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '13px',
        color: '#1f2937',
        backgroundColor: '#ffffff',
    },
    formSelect: {
        width: '100%',
        padding: '8px 12px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '13px',
        color: '#1f2937',
        backgroundColor: '#ffffff',
    },
    formTextarea: {
        width: '100%',
        padding: '8px 12px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '13px',
        fontFamily: 'monospace',
        color: '#1f2937',
        backgroundColor: '#ffffff',
        resize: 'vertical',
    },
    locationInput: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        background: '#f9fafb',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '13px',
        color: '#1f2937',
    },
    smallButton: {
        padding: '4px 8px',
        background: '#e5e7eb',
        border: 'none',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 500,
        cursor: 'pointer',
        color: '#1f2937',
    },
    instruction: {
        marginTop: '4px',
        fontSize: '12px',
        color: '#3b82f6',
        fontStyle: 'italic',
    },
    // Details
    detailsName: {
        color: '#1f2937',
        fontSize: '18px',
        fontWeight: 700,
        flex: 1,
        marginBottom: '12px',
    },
    detailsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        marginBottom: '16px',
    },
    detailItem: {
        marginBottom: '12px',
    },
    detailLabel: {
        color: '#6b7280',
        fontSize: '11px',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '2px',
    },
    detailValue: {
        color: '#1f2937',
        fontSize: '13px',
        fontWeight: 500,
    },
    detailActions: {
        display: 'flex',
        gap: '8px',
        marginTop: '16px',
        flexWrap: 'wrap',
    },
    warningButton: {
        background: '#fef3c7',
        color: '#92400e',
        border: '1px solid #fbbf24',
        padding: '8px 16px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    dangerButton: {
        background: '#fee2e2',
        color: '#dc2626',
        border: '1px solid #fca5a5',
        padding: '8px 16px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    jsonPreview: {
        background: '#f3f4f6',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontFamily: 'monospace',
        overflow: 'auto',
        maxHeight: '150px',
        color: '#1f2937',
    },
    loadingContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#6b7280',
        fontSize: '14px',
    },
    errorContainer: {
        padding: '20px',
        color: '#dc2626',
        textAlign: 'center',
    },
    closeButton: {
        background: 'transparent',
        border: 'none',
        color: '#6b7280',
        fontSize: '20px',
        cursor: 'pointer',
        padding: '0 8px',
        lineHeight: 1,
    },
    headerButtons: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
    },
};

export function POIManager({ map, regions, regionFilter = null, onClose, alwaysShowMarkers = true }) {
    const {
        pois,
        isLoading,
        error,
        fetchPOIs,
        createPOI,
        updatePOI,
        deletePOI,
        drawMarkers,
        addTempMarker,
        removeTempMarker,
    } = usePOIs(regionFilter);

    const [viewMode, setViewMode] = useState('list'); // list, create, edit, details
    const [selectedPoi, setSelectedPoi] = useState(null);
    const [form, setForm] = useState({
        name: '',
        type: 'landmark',
        region_id: null,
        geometry: null,
        metadata: {},
    });
    const [isSelectingLocation, setIsSelectingLocation] = useState(false);
    const markersDrawnRef = useRef(false);

    // Fetch POIs on mount and when regionFilter changes
    useEffect(() => {
        fetchPOIs();
    }, [fetchPOIs]);

    // Draw markers whenever pois or map changes - ALWAYS, regardless of component visibility
    useEffect(() => {
        if (map && pois.length > 0) {
            drawMarkers(map);
            markersDrawnRef.current = true;
        }
    }, [map, pois, drawMarkers]);

    // Also draw markers when map becomes available (e.g., after initialization)
    useEffect(() => {
        if (map && !markersDrawnRef.current && pois.length > 0) {
            drawMarkers(map);
            markersDrawnRef.current = true;
        }
    }, [map, pois, drawMarkers]);

    // Handle map click for location selection
    useEffect(() => {
        if (!map || !isSelectingLocation) return;

        const handleMapClick = (e) => {
            const { lng, lat } = e.lngLat;
            setForm(prev => ({
                ...prev,
                geometry: { type: 'Point', coordinates: [lng, lat] },
            }));
            setIsSelectingLocation(false);
            addTempMarker(map, [lng, lat]);
        };

        map.on('click', handleMapClick);
        map.getCanvas().style.cursor = 'crosshair';

        return () => {
            map.off('click', handleMapClick);
            map.getCanvas().style.cursor = '';
            removeTempMarker();
        };
    }, [map, isSelectingLocation, addTempMarker, removeTempMarker]);

    const resetForm = () => {
        setForm({ name: '', type: 'landmark', region_id: null, geometry: null, metadata: {} });
        setIsSelectingLocation(false);
        removeTempMarker();
    };

    const handleCreate = async () => {
        if (!form.name.trim()) {
            alert('Please enter a name');
            return;
        }
        if (!form.geometry) {
            alert('Please set a location on the map');
            return;
        }
        try {
            await createPOI(form);
            resetForm();
            setViewMode('list');
        } catch (err) {
            alert('Failed to create POI');
        }
    };

    const handleUpdate = async () => {
        if (!selectedPoi) return;
        try {
            await updatePOI(selectedPoi.id, form);
            resetForm();
            setViewMode('details');
            setSelectedPoi({ ...selectedPoi, ...form });
        } catch (err) {
            alert('Failed to update POI');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this POI?')) return;
        try {
            await deletePOI(id);
            if (selectedPoi?.id === id) {
                setSelectedPoi(null);
                setViewMode('list');
            }
        } catch (err) {
            alert('Failed to delete POI');
        }
    };

    const zoomToPoi = useCallback((poi) => {
        if (!map || !poi.geometry) return;
        const [lng, lat] = poi.geometry.coordinates;
        map.flyTo({ center: [lng, lat], zoom: 14, duration: 1500 });
    }, [map]);

    const handleEdit = (poi) => {
        setForm({
            name: poi.name,
            type: poi.type,
            region_id: poi.region_id,
            geometry: poi.geometry,
            metadata: poi.metadata || {},
        });
        setSelectedPoi(poi);
        setViewMode('edit');
    };

    // Render list view
    const renderList = () => (
        <div style={styles.section}>
            <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>Points of Interest</div>
                <div style={styles.headerButtons}>
                    <button
                        onClick={() => { resetForm(); setViewMode('create'); }}
                        style={styles.primaryButton}
                    >
                        + New POI
                    </button>
                    {onClose && (
                        <button onClick={onClose} style={styles.closeButton} title="Close">
                            ×
                        </button>
                    )}
                </div>
            </div>
            <div style={styles.regionsList}>
                {pois.map(poi => (
                    <div
                        key={poi.id}
                        onClick={() => { setSelectedPoi(poi); setViewMode('details'); zoomToPoi(poi); }}
                        style={styles.regionItem}
                    >
                        <div style={styles.regionHeader}>
                            <div style={styles.regionNameRow}>
                                <div style={styles.regionName}>{poi.name}</div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(poi.id); }}
                                    style={styles.deleteButton}
                                    title="Delete POI"
                                >
                                    🗑️
                                </button>
                            </div>
                            <div style={styles.regionMeta}>
                                <span style={styles.regionBadge}>{poi.type}</span>
                                {poi.region && (
                                    <span style={styles.regionCode}>{poi.region.name}</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {pois.length === 0 && (
                    <div style={styles.emptyState}>
                        <div style={styles.emptyIcon}>📍</div>
                        <div style={styles.emptyTitle}>No POIs yet</div>
                        <div style={styles.emptyText}>Create your first point of interest</div>
                    </div>
                )}
            </div>
        </div>
    );

    // Render create/edit form
    const renderForm = (isEdit = false) => (
        <div style={styles.section}>
            <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>{isEdit ? 'Edit POI' : 'New POI'}</div>
                <button
                    onClick={() => { resetForm(); setViewMode('list'); }}
                    style={styles.backButton}
                >
                    Cancel
                </button>
            </div>
            <div style={styles.detailsCard}>
                <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Name *</label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        style={styles.formInput}
                        placeholder="e.g. Manila City Hall"
                    />
                </div>
                <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Type</label>
                    <select
                        value={form.type}
                        onChange={e => setForm({ ...form, type: e.target.value })}
                        style={styles.formSelect}
                    >
                        <option value="terminal">Terminal</option>
                        <option value="stop">Stop</option>
                        <option value="landmark">Landmark</option>
                        <option value="hub">Hub</option>
                    </select>
                </div>
                <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Region</label>
                    <select
                        value={form.region_id || ''}
                        onChange={e => setForm({ ...form, region_id: e.target.value || null })}
                        style={styles.formSelect}
                    >
                        <option value="">None</option>
                        {regions.map(r => (
                            <option key={r.region_id} value={r.region_id}>{r.name}</option>
                        ))}
                    </select>
                </div>
                <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Location</label>
                    <div style={styles.locationInput}>
                        {form.geometry
                            ? `${form.geometry.coordinates[1].toFixed(6)}, ${form.geometry.coordinates[0].toFixed(6)}`
                            : 'Not set'}
                        <button
                            onClick={() => setIsSelectingLocation(true)}
                            style={styles.smallButton}
                        >
                            {form.geometry ? 'Change' : 'Set on Map'}
                        </button>
                    </div>
                    {isSelectingLocation && (
                        <div style={styles.instruction}>Click on the map to place the POI</div>
                    )}
                </div>
                <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Metadata (JSON)</label>
                    <textarea
                        value={JSON.stringify(form.metadata, null, 2)}
                        onChange={e => {
                            try {
                                const metadata = JSON.parse(e.target.value);
                                setForm({ ...form, metadata });
                            } catch {
                                // ignore invalid JSON
                            }
                        }}
                        style={styles.formTextarea}
                        rows={4}
                        placeholder='{"key": "value"}'
                    />
                </div>
                <button
                    onClick={isEdit ? handleUpdate : handleCreate}
                    style={styles.primaryButton}
                >
                    {isEdit ? 'Update' : 'Create'}
                </button>
            </div>
        </div>
    );

    // Render details view
    const renderDetails = () => (
        <div style={styles.section}>
            <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>POI Details</div>
                <button onClick={() => setViewMode('list')} style={styles.backButton}>
                    ← Back
                </button>
            </div>
            {selectedPoi && (
                <div style={styles.detailsCard}>
                    <div style={styles.detailsName}>{selectedPoi.name}</div>
                    <div style={styles.detailsGrid}>
                        <div style={styles.detailItem}>
                            <div style={styles.detailLabel}>Type</div>
                            <div style={styles.detailValue}>{selectedPoi.type}</div>
                        </div>
                        <div style={styles.detailItem}>
                            <div style={styles.detailLabel}>Region</div>
                            <div style={styles.detailValue}>
                                {selectedPoi.region?.name || 'None'}
                            </div>
                        </div>
                        <div style={styles.detailItem}>
                            <div style={styles.detailLabel}>Location</div>
                            <div style={styles.detailValue}>
                                {selectedPoi.geometry?.coordinates[1].toFixed(6)},{' '}
                                {selectedPoi.geometry?.coordinates[0].toFixed(6)}
                            </div>
                        </div>
                        <div style={styles.detailItem}>
                            <div style={styles.detailLabel}>Created</div>
                            <div style={styles.detailValue}>
                                {new Date(selectedPoi.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                    {selectedPoi.metadata && Object.keys(selectedPoi.metadata).length > 0 && (
                        <div style={styles.detailItem}>
                            <div style={styles.detailLabel}>Metadata</div>
                            <pre style={styles.jsonPreview}>
                {JSON.stringify(selectedPoi.metadata, null, 2)}
              </pre>
                        </div>
                    )}
                    <div style={styles.detailActions}>
                        <button
                            onClick={() => handleEdit(selectedPoi)}
                            style={styles.warningButton}
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => handleDelete(selectedPoi.id)}
                            style={styles.dangerButton}
                        >
                            Delete
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    if (isLoading) {
        return (
            <div style={styles.loadingContainer}>
                <div>Loading POIs...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.errorContainer}>
                <div>Error: {error}</div>
                <button onClick={fetchPOIs} style={styles.primaryButton}>
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div style={{ height: '100%', overflowY: 'auto', background: '#ffffff' }}>
            {viewMode === 'list' && renderList()}
            {viewMode === 'create' && renderForm(false)}
            {viewMode === 'edit' && renderForm(true)}
            {viewMode === 'details' && renderDetails()}
        </div>
    );
}
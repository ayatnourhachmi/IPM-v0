/**
 * DiscoveryPanel — 4 tool cards. Each can be launched to reveal results.
 * Selected items roll up into a recap section at the bottom.
 */

"use client";

import { useState, useCallback } from "react";
import { ALL_SOURCES, type DiscoveryItem, type DiscoverySource } from "@/lib/discoveryStubs";

type CardState = "idle" | "active" | "done";

const TOOL_META: Record<string, { icon: string; description: string }> = {
    dxc_catalog:  { icon: "⬡", description: "Search DXC's internal AI product catalog for existing solutions." },
    tech_signals: { icon: "◈", description: "Scan patents, research papers, and industry trend signals." },
    startups:     { icon: "◎", description: "Discover relevant startups via StartupConnect AI matching." },
    tech_watch:   { icon: "◉", description: "Browse curated AI Watch market & regulatory intelligence." },
};

interface DiscoveryPanelProps {
    onSelectionChange?: (selected: DiscoveryItem[]) => void;
}

export function DiscoveryPanel({ onSelectionChange }: DiscoveryPanelProps) {
    const [sources] = useState<DiscoverySource[]>(ALL_SOURCES);
    const [cardStates, setCardStates] = useState<Record<string, CardState>>(
        Object.fromEntries(ALL_SOURCES.map((s) => [s.key, "idle"]))
    );
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [refreshedKeys, setRefreshedKeys] = useState<Set<string>>(new Set());

    const allItems = sources.flatMap((s) => s.items);

    const setCardState = (key: string, state: CardState) =>
        setCardStates((prev) => ({ ...prev, [key]: state }));

    const toggleItem = useCallback((itemId: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(itemId) ? next.delete(itemId) : next.add(itemId);
            onSelectionChange?.(allItems.filter((i) => next.has(i.id)));
            return next;
        });
    }, [allItems, onSelectionChange]);

    const handleRefresh = (key: string) =>
        setRefreshedKeys((prev) => new Set(prev).add(key));

    const selectedBySource = sources
        .map((s) => ({ source: s, items: s.items.filter((i) => selectedIds.has(i.id)) }))
        .filter((g) => g.items.length > 0);

    const totalSelected = selectedIds.size;

    return (
        <div className="disc-layout">
            {/* ── 4 Tool Cards ── */}
            <div className="disc-grid">
                {sources.map((source) => {
                    const state = cardStates[source.key];
                    const meta = TOOL_META[source.key];
                    const sourceSelected = source.items.filter((i) => selectedIds.has(i.id)).length;

                    return (
                        <div key={source.key} className={`disc-card ${state}`}>
                            {/* Card header */}
                            <div className="disc-card-header">
                                <div className="disc-card-icon">{meta.icon}</div>
                                <div className="disc-card-titles">
                                    <div className="disc-card-title">{source.title}</div>
                                    <div className="disc-card-source">{source.sourceLabel}</div>
                                </div>
                                {state === "done" && sourceSelected > 0 && (
                                    <span className="disc-card-badge">{sourceSelected} selected</span>
                                )}
                                {(state === "active" || state === "done") && (
                                    <button
                                        className="disc-card-toggle"
                                        onClick={() => setCardState(source.key, state === "active" ? "done" : "active")}
                                        title={state === "active" ? "Collapse" : "Expand"}
                                    >
                                        {state === "active" ? "↑" : "↓"}
                                    </button>
                                )}
                            </div>

                            {/* Idle state */}
                            {state === "idle" && (
                                <div className="disc-card-idle">
                                    <p className="disc-card-desc">{meta.description}</p>
                                    <button
                                        className="disc-launch-btn"
                                        onClick={() => setCardState(source.key, "active")}
                                    >
                                        ▶ Launch Tool
                                    </button>
                                </div>
                            )}

                            {/* Active state — results */}
                            {state === "active" && (
                                <div className="disc-card-results">
                                    {source.items.map((item) => (
                                        <label key={item.id} className="disc-item">
                                            <input
                                                type="checkbox"
                                                className="discovery-item-checkbox"
                                                checked={selectedIds.has(item.id)}
                                                onChange={() => toggleItem(item.id)}
                                            />
                                            <div className="disc-item-info">
                                                <div className="disc-item-name">{item.name}</div>
                                                <div className="disc-item-desc">{item.description}</div>
                                            </div>
                                            <span className={`disc-item-score ${item.relevance >= 80 ? "high" : item.relevance >= 65 ? "mid" : "low"}`}>
                                                {item.relevance}%
                                            </span>
                                        </label>
                                    ))}
                                    <div className="disc-card-actions">
                                        <button
                                            className="disc-action-ghost"
                                            onClick={() => handleRefresh(source.key)}
                                        >
                                            ↻ Refresh
                                        </button>
                                        <button
                                            className="disc-action-done"
                                            onClick={() => setCardState(source.key, "done")}
                                        >
                                            ✓ Done
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Done state — collapsed summary */}
                            {state === "done" && (
                                <div className="disc-card-summary">
                                    {sourceSelected > 0 ? (
                                        source.items
                                            .filter((i) => selectedIds.has(i.id))
                                            .map((i) => (
                                                <span key={i.id} className="disc-summary-chip">
                                                    {i.name}
                                                    <button onClick={() => toggleItem(i.id)}>×</button>
                                                </span>
                                            ))
                                    ) : (
                                        <span className="disc-summary-none">No items selected</span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Recap section ── */}
            {totalSelected > 0 && (
                <div className="disc-recap">
                    <div className="disc-recap-label">
                        <span className="disc-recap-dot" />
                        {totalSelected} item{totalSelected !== 1 ? "s" : ""} selected to carry forward
                    </div>
                    <div className="disc-recap-groups">
                        {selectedBySource.map(({ source, items }) => (
                            <div key={source.key} className="disc-recap-group">
                                <span className="disc-recap-group-title">{source.title}</span>
                                {items.map((i) => (
                                    <span key={i.id} className="disc-recap-item">
                                        {i.name}
                                        <button onClick={() => toggleItem(i.id)}>×</button>
                                    </span>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

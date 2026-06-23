/**
 * RecapPanel — Left SUMMARY panel: single source of truth for metadata
 * (Pitch, Objective, Domains, Impact, Origin, Horizon) with inline editing.
 */

"use client";

import { useState } from "react";
import type { Horizon, Tags } from "@/lib/types";
import { HORIZON_LABELS } from "@/lib/types";
import { TagChips } from "@/components/sourcing/TagChips";

interface RecapPanelProps {
    pitch: string;
    onPitchChange: (value: string) => void;
    tags: Tags | null;
    horizon: Horizon | null;
    summaryObjective: string;
    onSummaryObjectiveChange: (value: string) => void;
    summaryDomains: string;
    onSummaryDomainsChange: (value: string) => void;
    summaryImpact: string;
    onSummaryImpactChange: (value: string) => void;
    summaryOrigin: string;
    detectedOnly?: boolean;
}

type EditableField = "pitch" | "objective" | "domains" | "impact" | null;

export function RecapPanel({
    pitch,
    onPitchChange,
    tags,
    horizon,
    summaryObjective,
    onSummaryObjectiveChange,
    summaryDomains,
    onSummaryDomainsChange,
    summaryImpact,
    onSummaryImpactChange,
    summaryOrigin,
    detectedOnly = false,
}: RecapPanelProps) {
    const [editing, setEditing] = useState<EditableField>(null);

    const hasAnything =
        !!summaryObjective ||
        !!summaryDomains ||
        !!summaryImpact ||
        !!summaryOrigin ||
        (!detectedOnly && (pitch.trim().length > 0 || horizon !== null)) ||
        !!tags;

    const renderValueOrPlaceholder = (value: string, placeholder: string) => (
        <div className="recap-value" style={!value ? { opacity: 0.6 } : undefined}>
            {value || placeholder}
        </div>
    );

    const domainValues = summaryDomains
        .split(",")
        .map((domain) => domain.trim())
        .filter(Boolean);
    const impactValues = summaryImpact
        .split(",")
        .map((impact) => impact.trim())
        .filter(Boolean);

    const handleDismissDomain = (tagKey: string) => {
        const removedDomain = tagKey.replace(/^dom-/, "").trim().toLowerCase();
        const nextDomains = domainValues.filter(
            (domain) => domain.trim().toLowerCase() !== removedDomain
        );
        onSummaryDomainsChange(nextDomains.join(", "));
    };

    return (
        <div className="panel panel-scroll">
            <div className="panel-title">SUMMARY</div>
            {hasAnything && tags && (
                <div className="tag-confidence-legend" aria-label="Confidence legend">
                    <span className="tag-confidence-legend-label">AI confidence:</span>
                    <span><span className="tag-confidence-dot confidence-high">H</span> High</span>
                    <span><span className="tag-confidence-dot confidence-medium">M</span> Medium</span>
                    <span><span className="tag-confidence-dot confidence-low">L</span> Low</span>
                </div>
            )}

            {!hasAnything ? (
                <div className="recap-empty">
                    <div className="recap-empty-icon">◇</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 300 }}>
                        Information will appear here as you type
                    </div>
                </div>
            ) : (
                <>
                    {/* PITCH */}
                    {!detectedOnly && <div className="recap-field">
                        <div className="recap-label">PITCH</div>
                        {editing === "pitch" ? (
                            <textarea
                                className="recap-edit-input"
                                value={pitch}
                                onChange={(e) => onPitchChange(e.target.value)}
                                onBlur={() => setEditing(null)}
                                rows={3}
                                autoFocus
                            />
                        ) : (
                            renderValueOrPlaceholder(
                                pitch,
                                "Start writing your pitch in the main panel"
                            )
                        )}
                        <button
                            className="recap-edit"
                            aria-label="Edit pitch"
                            type="button"
                            onClick={() => setEditing(editing === "pitch" ? null : "pitch")}
                        >
                            ✎
                        </button>
                    </div>}

                    {/* OBJECTIVE */}
                    <div className="recap-field" style={{ animationDelay: "0.06s" }}>
                        <div className="recap-label">OBJECTIVE</div>
                        {editing === "objective" ? (
                            <input
                                className="recap-edit-input"
                                value={summaryObjective}
                                onChange={(e) => onSummaryObjectiveChange(e.target.value)}
                                onBlur={() => setEditing(null)}
                                autoFocus
                            />
                        ) : tags && summaryObjective ? (
                            <TagChips
                                tags={tags}
                                field="objective"
                                values={[summaryObjective]}
                            />
                        ) : (
                            renderValueOrPlaceholder(
                                summaryObjective,
                                "Will be inferred from your pitch"
                            )
                        )}
                        <button
                            className="recap-edit"
                            aria-label="Edit objective"
                            type="button"
                            onClick={() => setEditing(editing === "objective" ? null : "objective")}
                        >
                            ✎
                        </button>
                    </div>

                    {/* DOMAINS */}
                    <div className="recap-field" style={{ animationDelay: "0.12s" }}>
                        <div className="recap-label">DOMAINS</div>
                        {editing === "domains" ? (
                            <input
                                className="recap-edit-input"
                                value={summaryDomains}
                                onChange={(e) => onSummaryDomainsChange(e.target.value)}
                                onBlur={() => setEditing(null)}
                                autoFocus
                            />
                        ) : tags && domainValues.length > 0 ? (
                            <TagChips
                                tags={tags}
                                field="domain"
                                domains={domainValues}
                                onDismiss={handleDismissDomain}
                            />
                        ) : (
                            renderValueOrPlaceholder(
                                "",
                                "AI will suggest relevant domains"
                            )
                        )}
                        <button
                            className="recap-edit"
                            aria-label="Edit domains"
                            type="button"
                            onClick={() => setEditing(editing === "domains" ? null : "domains")}
                        >
                            ✎
                        </button>
                    </div>

                    {/* IMPACT */}
                    <div className="recap-field" style={{ animationDelay: "0.18s" }}>
                        <div className="recap-label">IMPACT</div>
                        {editing === "impact" ? (
                            <textarea
                                className="recap-edit-input"
                                value={summaryImpact}
                                onChange={(e) => onSummaryImpactChange(e.target.value)}
                                onBlur={() => setEditing(null)}
                                rows={2}
                                autoFocus
                            />
                        ) : tags && impactValues.length > 0 ? (
                            <TagChips
                                tags={tags}
                                field="impact"
                                values={impactValues}
                            />
                        ) : (
                            renderValueOrPlaceholder(
                                summaryImpact,
                                "Expected impact will be proposed by AI"
                            )
                        )}
                        <button
                            className="recap-edit"
                            aria-label="Edit impact"
                            type="button"
                            onClick={() => setEditing(editing === "impact" ? null : "impact")}
                        >
                            ✎
                        </button>
                    </div>

                    {/* ORIGIN */}
                    <div className="recap-field" style={{ animationDelay: "0.24s" }}>
                        <div className="recap-label">ORIGIN</div>
                        {tags && summaryOrigin ? (
                            <TagChips
                                tags={tags}
                                field="origin"
                                values={[summaryOrigin]}
                            />
                        ) : (
                            renderValueOrPlaceholder(
                                summaryOrigin,
                                "Business origin will be inferred by AI"
                            )
                        )}
                    </div>

                    {/* TIME HORIZON */}
                    {!detectedOnly && <div className="recap-field" style={{ animationDelay: "0.30s" }}>
                        <div className="recap-label">TIME HORIZON</div>
                        <div className="recap-value">
                            {horizon ? HORIZON_LABELS[horizon].label : "Not selected yet"}
                        </div>
                    </div>}
                </>
            )}
        </div>
    );
}

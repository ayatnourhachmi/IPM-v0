"use client";

import { useState } from "react";
import type { ConfidenceLevel, Tags } from "@/lib/types";
import { formatImpactLabel, OBJECTIF_LABELS, ORIGINE_LABELS } from "@/lib/types";
import { ConfidenceChip } from "@/components/sourcing/ConfidenceChip";
import { PhaseLoading } from "@/components/sourcing/PhaseLoading";

interface SummaryPanelProps {
    tags: Tags | null;
    isLoading?: boolean;
    objectiveLabel: string;
    domainsLabel: string;
    impactLabel: string;
    originLabel: string;
    onObjectiveChange?: (value: string) => void;
    onDomainsChange?: (value: string) => void;
    onImpactChange?: (value: string) => void;
    onOriginChange?: (value: string) => void;
}

type Chip = {
    label: string;
    confidence: ConfidenceLevel;
};

function formatDomainLabel(value: string) {
    return value.trim().toUpperCase() === "IA" ? "AI" : value.trim();
}

function splitValues(value: string) {
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function getSummaryChips(
    tags: Tags | null,
    objectiveLabel: string,
    domainsLabel: string,
    impactLabel: string,
    originLabel: string
) {
    const objectiveConfidence = tags?.objectif?.confidence ?? "low";
    const objective: Chip[] = objectiveLabel || tags?.objectif?.value
        ? [{
            label: objectiveLabel || (tags?.objectif?.value ? OBJECTIF_LABELS[tags.objectif.value] : ""),
            confidence: objectiveConfidence,
        }]
        : [];

    const domainConfidence = new Map(
        tags?.domaine.map((domain) => [domain.value.trim().toLowerCase(), domain.confidence]) ?? []
    );
    const domainsSource = splitValues(domainsLabel);
    const domains: Chip[] = (domainsSource.length ? domainsSource : tags?.domaine.map((domain) => domain.value) ?? [])
        .map((domain) => ({
            label: formatDomainLabel(domain),
            confidence: domainConfidence.get(domain.trim().toLowerCase()) ?? "low",
        }));

    const impactConfidence = new Map<string, ConfidenceLevel>();
    tags?.impact.forEach((impact) => {
        impactConfidence.set(impact.value.trim().toLowerCase(), impact.confidence);
        impactConfidence.set(formatImpactLabel(impact.value).trim().toLowerCase(), impact.confidence);
    });
    const impactSource = splitValues(impactLabel);
    const impact: Chip[] = (impactSource.length ? impactSource : tags?.impact.map((item) => formatImpactLabel(item.value)) ?? [])
        .map((item) => ({
            label: item,
            confidence: impactConfidence.get(item.trim().toLowerCase()) ?? "low",
        }));

    const originConfidence = tags?.origine?.confidence ?? "low";
    const origin: Chip[] = originLabel || tags?.origine?.value
        ? [{
            label: originLabel || (tags?.origine?.value ? ORIGINE_LABELS[tags.origine.value] : ""),
            confidence: originConfidence,
        }]
        : [];

    return { objective, domains, impact, origin };
}

function SummaryCard({
    title,
    chips,
    value,
    isEditing,
    onEdit,
    onChange,
    onDone,
}: {
    title: string;
    chips: Chip[];
    value: string;
    isEditing: boolean;
    onEdit?: () => void;
    onChange?: (value: string) => void;
    onDone?: () => void;
}) {
    return (
        <section className="ipm-summary-card">
            <div className="ipm-summary-card-head">
                <h3>{title}</h3>
                <button type="button" className="ipm-summary-edit" aria-label={`Edit ${title.toLowerCase()}`} onClick={onEdit}>
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                            d="M16.862 4.487 19.5 7.125M11.25 20.25H18.75M5.25 19.5l9.53-9.53a1.5 1.5 0 0 0 0-2.121l-.659-.659a1.5 1.5 0 0 0-2.121 0L2.47 16.659A1.5 1.5 0 0 0 2.25 18v1.5h1.5a1.5 1.5 0 0 0 1.05-.429Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
            </div>
            {isEditing ? (
                <div className="ipm-summary-editor">
                    <textarea
                        className="ipm-summary-edit-input"
                        value={value}
                        onChange={(event) => onChange?.(event.target.value)}
                        onBlur={onDone}
                        autoFocus
                        rows={3}
                        placeholder={`Add ${title.toLowerCase()} tags`}
                    />
                    <button type="button" className="ipm-summary-done" onMouseDown={(event) => event.preventDefault()} onClick={onDone}>
                        Done
                    </button>
                </div>
            ) : (
                <div className="ipm-summary-chip-row">
                    {chips.length > 0 ? (
                        chips.map((chip) => (
                            <ConfidenceChip key={`${chip.label}-${chip.confidence}`} {...chip} />
                        ))
                    ) : (
                        <span className="ipm-summary-empty">Click the pencil to add tags</span>
                    )}
                </div>
            )}
        </section>
    );
}

export function SummaryPanel({
    tags,
    isLoading = false,
    objectiveLabel,
    domainsLabel,
    impactLabel,
    originLabel,
    onObjectiveChange,
    onDomainsChange,
    onImpactChange,
    onOriginChange,
}: SummaryPanelProps) {
    const [editingField, setEditingField] = useState<"objective" | "domains" | "impact" | "origin" | null>(null);
    const chips = getSummaryChips(tags, objectiveLabel, domainsLabel, impactLabel, originLabel);

    return (
        <aside className="ipm-summary-panel">
            <h2>SUMMARY</h2>
            <p>
                Keep enriching your business need description so the AI confidence level
                reaches at least Medium or High.
            </p>

            {isLoading ? (
                <PhaseLoading phase="sourcing" variant="skeleton" label="Classifying your business need..." />
            ) : (
            <div className="ipm-summary-grid">
                <SummaryCard
                    title="OBJECTIVE"
                    chips={chips.objective}
                    value={objectiveLabel}
                    isEditing={editingField === "objective"}
                    onEdit={() => setEditingField("objective")}
                    onChange={onObjectiveChange}
                    onDone={() => setEditingField(null)}
                />
                <SummaryCard
                    title="DOMAINS"
                    chips={chips.domains}
                    value={domainsLabel}
                    isEditing={editingField === "domains"}
                    onEdit={() => setEditingField("domains")}
                    onChange={onDomainsChange}
                    onDone={() => setEditingField(null)}
                />
                <SummaryCard
                    title="IMPACT"
                    chips={chips.impact}
                    value={impactLabel}
                    isEditing={editingField === "impact"}
                    onEdit={() => setEditingField("impact")}
                    onChange={onImpactChange}
                    onDone={() => setEditingField(null)}
                />
                <SummaryCard
                    title="ORIGIN"
                    chips={chips.origin}
                    value={originLabel}
                    isEditing={editingField === "origin"}
                    onEdit={() => setEditingField("origin")}
                    onChange={onOriginChange}
                    onDone={() => setEditingField(null)}
                />
            </div>
            )}

            <div className="ipm-confidence-legend" aria-label="AI confidence legend">
                <span>AI Confidence :</span>
                <ConfidenceChip confidence="high" label="High" />
                <ConfidenceChip confidence="medium" label="Medium" />
                <ConfidenceChip confidence="low" label="Low" />
            </div>
        </aside>
    );
}

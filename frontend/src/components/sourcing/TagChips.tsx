/**
 * TagChips — Displays AI-generated tags with confidence indicators.
 * Each chip has a left accent border + a compact H/M/L badge showing AI confidence.
 */

"use client";

import type { Tags } from "@/lib/types";
import { formatImpactLabel, OBJECTIF_LABELS, ORIGINE_LABELS, type ConfidenceLevel } from "@/lib/types";

interface TagChipsProps {
    tags: Tags;
    field?: "objectif" | "domaine" | "impact" | "origine";
    values?: string[];
    domains?: string[];
    dismissedTags?: Set<string>;
    onDismiss?: (tagKey: string) => void;
}

const TAG_COLORS: Record<string, string> = {
    objectif: "amber",
    domaine: "blue",
    impact: "green",
    origine: "purple",
};

const CONFIDENCE_LABEL: Record<string, string> = {
    high: "H",
    medium: "M",
    low: "L",
};

const CONFIDENCE_TITLE: Record<string, string> = {
    high:   "AI confidence: high — pitch clearly signals this classification",
    medium: "AI confidence: medium — pitch implies this classification",
    low:    "AI confidence: low — classification inferred from weak signals",
};

function normalise(value: string) {
    return value.trim().toLowerCase();
}

export function TagChips({
    tags,
    field = "domaine",
    values,
    domains,
    dismissedTags = new Set(),
    onDismiss,
}: TagChipsProps) {
    const chips: Array<{
        key: string;
        label: string;
        color: string;
        confidence: ConfidenceLevel;
        removable: boolean;
    }> = [];

    if (field === "objectif" && tags.objectif?.value) {
        const label = values?.[0]?.trim() || OBJECTIF_LABELS[tags.objectif.value];
        chips.push({
            key: `obj-${tags.objectif.value}`,
            label,
            color: TAG_COLORS.objectif,
            confidence: tags.objectif.confidence,
            removable: false,
        });
    }

    const confidenceByDomain = new Map(
        tags.domaine.map((d) => [normalise(d.value), d.confidence])
    );
    const domainValues = domains?.length ? domains : values?.length ? values : tags.domaine.map((d) => d.value);

    if (field === "domaine") {
        domainValues.forEach((domain) => {
            const value = domain.trim();
            if (!value) return;
            const confidence = confidenceByDomain.get(normalise(value)) ?? "low";
            chips.push({
                key: `dom-${value}`,
                label: value,
                color: TAG_COLORS.domaine,
                confidence,
                removable: true,
            });
        });
    }

    if (field === "impact") {
        const confidenceByImpact = new Map<string, ConfidenceLevel>();
        tags.impact.forEach((impact) => {
            confidenceByImpact.set(normalise(impact.value), impact.confidence);
            confidenceByImpact.set(normalise(formatImpactLabel(impact.value)), impact.confidence);
        });
        const impactValues = values?.length ? values : tags.impact.map((impact) => formatImpactLabel(impact.value));

        impactValues.forEach((impact) => {
            const value = impact.trim();
            if (!value) return;
            chips.push({
                key: `imp-${value}`,
                label: value,
                color: TAG_COLORS.impact,
                confidence: confidenceByImpact.get(normalise(value)) ?? "low",
                removable: false,
            });
        });
    }

    if (field === "origine" && tags.origine?.value) {
        const label = values?.[0]?.trim() || ORIGINE_LABELS[tags.origine.value];
        chips.push({
            key: `ori-${tags.origine.value}`,
            label,
            color: TAG_COLORS.origine,
            confidence: tags.origine.confidence,
            removable: false,
        });
    }

    const visibleChips = chips.filter((chip) => !dismissedTags.has(chip.key));

    if (visibleChips.length === 0) return null;

    return (
        <div className="tags-block">
            <div className="tags-row">
                {visibleChips.map((chip) => (
                    <span
                        key={chip.key}
                        className={`tag-chip ${chip.color} confidence-border-${chip.confidence}${chip.removable ? "" : " static"}`}
                        onClick={chip.removable && onDismiss ? () => onDismiss(chip.key) : undefined}
                        title={CONFIDENCE_TITLE[chip.confidence]}
                    >
                        <span className={`tag-confidence-dot confidence-${chip.confidence}`}>
                            {CONFIDENCE_LABEL[chip.confidence]}
                        </span>
                        {chip.label}
                        {chip.removable && (
                            <button className="tag-chip-x" aria-label="Remove domain">×</button>
                        )}
                    </span>
                ))}
            </div>
        </div>
    );
}

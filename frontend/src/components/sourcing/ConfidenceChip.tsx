"use client";

import type { ConfidenceLevel } from "@/lib/types";

interface ConfidenceChipProps {
    confidence: ConfidenceLevel;
    label: string;
}

const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
    high: "H",
    medium: "M",
    low: "L",
};

export function ConfidenceChip({ confidence, label }: ConfidenceChipProps) {
    return (
        <span className={`ipm-confidence-chip ${confidence}`}>
            <span className="ipm-confidence-badge">{CONFIDENCE_LABEL[confidence]}</span>
            <span>{label}</span>
        </span>
    );
}

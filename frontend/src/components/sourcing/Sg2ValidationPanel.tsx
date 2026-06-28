"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { StageGateValidation } from "./StageGateValidation";

type Solution = {
    id: string;
    name: string;
    relevance: number;
    gap_analysis?: {
        features_matching?: string[];
        features_missing?: string[];
        resources_needed?: string[];
        fit_score?: number;
    } | null;
};

interface Sg2ValidationPanelProps {
    open: boolean;
    onGo: () => void;
    onRework: () => void;
    onAbandon: () => void;
}

function normalizeSolutions(value: unknown): Solution[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const candidate = item as Partial<Solution>;
        if (typeof candidate.id !== "string" || typeof candidate.name !== "string") return [];
        return [{
            id: candidate.id,
            name: candidate.name,
            relevance: typeof candidate.relevance === "number" ? candidate.relevance : 0,
            gap_analysis: candidate.gap_analysis || null,
        }];
    });
}

export function Sg2ValidationPanel({ open, onGo, onRework }: Sg2ValidationPanelProps) {
    const [solutions, setSolutions] = useState<Solution[]>([]);

    useEffect(() => {
        if (!open) return;
        const saved = localStorage.getItem("ipm_selected_solutions");
        if (!saved) {
            setSolutions([]);
            return;
        }
        try {
            setSolutions(normalizeSolutions(JSON.parse(saved)));
        } catch {
            setSolutions([]);
        }
    }, [open]);

    const selected = solutions[0];
    const gap = selected?.gap_analysis;
    const hasSolutions = solutions.length > 0;
    const selectedLabel = selected
        ? solutions.length > 1 ? `${selected.name} + ${solutions.length - 1} more` : selected.name
        : "None selected";

    const summaryItems = useMemo(() => [
        { label: "SELECTED SOLUTION", value: selectedLabel },
        { label: "FIT SCORE", value: gap?.fit_score !== undefined ? `${gap.fit_score}/10` : selected ? `${selected.relevance}%` : "Pending" },
        { label: "COVERED CAPABILITIES", value: gap?.features_matching?.length ?? "Pending" },
        { label: "MISSING CAPABILITIES", value: gap?.features_missing?.length ?? "Pending" },
        { label: "REQUIRED ENABLERS", value: gap?.resources_needed?.length ?? "Pending" },
    ], [gap, selected, selectedLabel]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="ipm-stagegate-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onRework}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.98 }}
                        transition={{ duration: 0.22 }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <StageGateValidation
                            gateId="SG-2"
                            phase="qualification"
                            title="Validation of Discovery"
                            subtitle="Review discovered solutions and alignment before moving to evaluation"
                            summaryItems={summaryItems}
                            checklistItems={[
                                { label: "Discovery completed", completed: true },
                                { label: "At least one solution shortlisted", completed: hasSolutions },
                                { label: "Business need alignment reviewed", completed: hasSolutions },
                            ]}
                            onBack={onRework}
                            onValidate={onGo}
                            isValidateDisabled={!hasSolutions}
                            disabledReason={!hasSolutions ? "Select at least one solution before validating VC-2." : undefined}
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

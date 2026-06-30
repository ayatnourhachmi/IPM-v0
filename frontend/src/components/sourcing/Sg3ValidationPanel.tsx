"use client";

import { AnimatePresence, motion } from "framer-motion";
import { formatIviPercent } from "@/lib/scores";
import { StageGateValidation } from "./StageGateValidation";

type SelectedSolution = {
    id: string;
    name: string;
    relevance: number;
    overall: number;
};

interface Sg3ValidationPanelProps {
    open: boolean;
    selectedSolutions: SelectedSolution[];
    onClose: () => void;
    onGo: () => void;
    onRework: () => void;
    onAbandon: () => void;
}

export function Sg3ValidationPanel({
    open,
    selectedSolutions,
    onClose,
    onGo,
    onRework,
}: Sg3ValidationPanelProps) {
    const selected = selectedSolutions[0];
    const hasSelection = selectedSolutions.length > 0;
    const selectedNames = selectedSolutions.map((solution) => solution.name).join(", ");

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="ipm-stagegate-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.98 }}
                        transition={{ duration: 0.22 }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <StageGateValidation
                            gateId="SG-3"
                            phase="qualification"
                            title="Validation before Delivery"
                            subtitle="Confirm the selected solutions and hand them off to recommendations"
                            summaryItems={[
                                { label: "SELECTED SOLUTIONS", value: selectedNames || "None selected" },
                                { label: "COUNT", value: hasSelection ? String(selectedSolutions.length) : "Pending" },
                                { label: "FIT SCORE", value: selected ? `${selected.relevance}%` : "Pending" },
                                { label: "IVI SCORE", value: selected ? formatIviPercent(selected.overall) : "Pending" },
                                { label: "MAIN STRENGTH", value: hasSelection ? "Highest ranked delivery candidates" : "Pending" },
                            ]}
                            checklistItems={[
                                { label: "At least one solution selected", completed: hasSelection },
                                { label: "Selected solutions reviewed against the ranking", completed: hasSelection },
                                { label: "Ready to hand off to recommendations", completed: hasSelection },
                            ]}
                            onBack={onRework}
                            onValidate={onGo}
                            isValidateDisabled={!hasSelection}
                            disabledReason={!hasSelection ? "Select at least one solution before validating VC-3." : undefined}
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

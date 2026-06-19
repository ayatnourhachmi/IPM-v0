"use client";

import { AnimatePresence, motion } from "framer-motion";
import { StageGateValidation } from "./StageGateValidation";

type DeliverySolution = {
    id: string;
    name: string;
    relevance: number;
    overall: number;
};

interface Sg4ValidationPanelProps {
    open: boolean;
    deliverySolutions: DeliverySolution[];
    hasRecommendations: boolean;
    technicalRecommendationsCount?: number;
    organizationalRecommendationsCount?: number;
    kpiCount?: number;
    onClose: () => void;
    onGo: () => void;
    onRework: () => void;
    onAbandon: () => void;
}

export function Sg4ValidationPanel({
    open,
    deliverySolutions,
    hasRecommendations,
    technicalRecommendationsCount = 0,
    organizationalRecommendationsCount = 0,
    kpiCount = 0,
    onClose,
    onGo,
    onRework,
}: Sg4ValidationPanelProps) {
    const selected = deliverySolutions[0];
    const hasSolution = deliverySolutions.length > 0;
    const hasKpis = kpiCount > 0;
    const readyForExport = hasRecommendations && hasKpis && hasSolution;

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
                            gateId="SG-4"
                            phase="delivery"
                            title="Final Validation"
                            subtitle="Review generated recommendations and confirm the final delivery package"
                            summaryItems={[
                                { label: "SELECTED SOLUTION", value: selected?.name || "None selected" },
                                { label: "TECHNICAL RECOS", value: technicalRecommendationsCount },
                                { label: "ORGANIZATIONAL RECOS", value: organizationalRecommendationsCount },
                                { label: "KPIS", value: kpiCount },
                                { label: "EXPORT STATUS", value: readyForExport ? "Ready for export" : "Missing items" },
                            ]}
                            checklistItems={[
                                { label: "Recommendations generated", completed: hasRecommendations },
                                { label: "KPIs defined", completed: hasKpis },
                                { label: "Final dossier ready for export", completed: readyForExport },
                            ]}
                            onBack={onRework}
                            onValidate={onGo}
                            isValidateDisabled={!readyForExport}
                            disabledReason={!readyForExport ? "Complete recommendations and KPIs before final validation." : undefined}
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

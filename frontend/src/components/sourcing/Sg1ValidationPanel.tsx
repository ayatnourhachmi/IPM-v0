"use client";

import { AnimatePresence, motion } from "framer-motion";
import { StageGateValidation } from "./StageGateValidation";

interface Sg1ValidationPanelProps {
    open: boolean;
    isProcessing: boolean;
    pitch: string;
    horizonLabel: string;
    objectif: string;
    domains: string;
    impact: string;
    origin: string;
    hasDuplicates?: boolean;
    onClose: () => void;
    onGo: () => void;
    onRework: (note?: string) => void;
    onAbandon: () => void;
}

export function Sg1ValidationPanel({
    open,
    isProcessing,
    pitch,
    horizonLabel,
    objectif,
    domains,
    impact,
    origin,
    hasDuplicates = false,
    onClose,
    onGo,
}: Sg1ValidationPanelProps) {
    const analyzed = pitch.trim().length > 20 && objectif.trim() !== "" && domains.trim() !== "" && impact.trim() !== "" && origin.trim() !== "";
    const noDuplicate = !hasDuplicates;

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="ipm-stagegate-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => !isProcessing && onClose()}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.98 }}
                        transition={{ duration: 0.22 }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <StageGateValidation
                            gateId="SG-1"
                            phase="sourcing"
                            title="Validation of Business Need"
                            subtitle="Review and confirm the business need before proceeding to discovery"
                            summaryItems={[
                                { label: "OBJECTIVE", value: objectif || "Pending" },
                                { label: "DOMAINS", value: domains || "Pending" },
                                { label: "IMPACT", value: impact || "Pending" },
                                { label: "ORIGIN", value: origin || "Pending" },
                                { label: "TIME HORIZON", value: horizonLabel || "Not selected" },
                            ]}
                            checklistItems={[
                                { label: "Business need fully analyzed", completed: analyzed, onClick: onClose },
                                { label: hasDuplicates ? "Potential duplicate detected" : "No duplicate detected", completed: noDuplicate },
                            ]}
                            onBack={onClose}
                            onValidate={onGo}
                            isProcessing={isProcessing}
                            isValidateDisabled={!analyzed || !noDuplicate}
                            disabledReason={hasDuplicates ? "Resolve duplicate matches before validating SG-1." : "Complete all checklist items before validating SG-1."}
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

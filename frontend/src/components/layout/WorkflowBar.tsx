/**
 * WorkflowBar — Full IPM pipeline visualization with 3 phases and 4 stage gates.
 * Pipeline: BN → [SG-1] → Discovery → [SG-2] → Evaluation → Selection → [SG-3] → Recos → [SG-4] → PDF/DOC
 *
 * Phase groupings:
 *   SOURCING:      Business Need, SG-1, Discovery
 *   QUALIFICATION: SG-2, Evaluation, Selection, SG-3
 *   DELIVERY:      Recos, SG-4, PDF/DOC
 *
 *   Row 1: IPM title + status badge + "Awaiting [gate] Validation"
 *   Region: Full animated diagram
 */

"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { toast } from "sonner";
import type { Status, BusinessNeed } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";
import WorkflowNode from "@/components/workflow/WorkflowNode";
import StageGate from "@/components/workflow/StageGate";
import GateModal from "@/components/workflow/GateModal";
import Connector from "@/components/workflow/Connector";
import PhaseContainer from "@/components/workflow/PhaseContainer";
import { useIsMobile } from "@/hooks/use-mobile";
import { getNeed, updateNeedStatus } from "@/lib/api";
import {
    SourcingWorkflowProgress,
    type SourcingWorkflowStepId,
    type WorkflowState,
} from "@/components/sourcing/SourcingWorkflowProgress";

// ---------------------------------------------------------------------------
// Pipeline step type
// ---------------------------------------------------------------------------

export type PipelineStep =
    | "business_need"
    | "sg1"
    | "discovery"
    | "sg2"
    | "evaluation"
    | "selection"
    | "sg3"
    | "recos"
    | "sg4"
    | "export";

// Gate data for the GateModal
const gateData = {
    "SG-1": {
        id: "SG-1",
        title: "Validation de la Business Need",
        subtitle: "Validate the business need and discovery results before proceeding to qualification.",
        checklist: [
            "Business need sufficiently formalized",
            "No confirmed duplicate detected",
            "Discovery results reviewed across all sources",
        ],
        color: "blue" as const,
    },
    "SG-2": {
        id: "SG-2",
        title: "Passage en Qualification",
        subtitle: "Confirm discovery outputs and selected solutions before proceeding to evaluation.",
        checklist: [
            "DXC Internal Catalog reviewed",
            "At least one solution selected",
            "Discovery results confirmed",
        ],
        color: "emerald" as const,
    },
    "SG-3": {
        id: "SG-3",
        title: "Validation avant livraison",
        subtitle: "Confirm evaluation and selection results before proceeding to delivery.",
        checklist: [
            "Exactly 1 solution selected",
            "Scoring grid completed",
            "Business need fully addressed",
        ],
        color: "emerald" as const,
    },
    "SG-4": {
        id: "SG-4",
        title: "Validation finale — Export",
        subtitle: "Final validation before generating delivery documents.",
        checklist: [
            "Recommendation document reviewed",
            "Solution confirmed for delivery",
        ],
        color: "orange" as const,
    },
};

type GateKey = keyof typeof gateData;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WorkflowBarProps {
    currentStep: PipelineStep;
    status?: Status;
    onStepClick?: (step: PipelineStep) => void;
    ipmId?: string;
    ipmTitle?: string;
    /** When false, gates are read-only and no validation CTA is shown. */
    isInteractive?: boolean;
}

// ---------------------------------------------------------------------------
// Derive state from status mapping
// ---------------------------------------------------------------------------

function deriveStatusState(status: Status | undefined, currentStep: PipelineStep) {
    const completedSteps = new Set<string>();
    const completedGates = new Set<string>();
    let currentActiveGate = "SG-1";

    if (!status || status === "draft" || status === "rework") {
        // Business Need not yet submitted — leave it unchecked
        currentActiveGate = "SG-1";
    } else if (status === "submitted") {
        completedSteps.add("business-need");
        completedGates.add("SG-1");   // SG-1 was passed — show ✓
        currentActiveGate = "SG-2";   // next decision point
    } else if (status === "solutions_reviewed") {
        completedSteps.add("business-need");
        completedSteps.add("discovery");
        completedSteps.add("evaluation");
        completedGates.add("SG-1");
        completedGates.add("SG-2");
        currentActiveGate = "SG-3";
    } else if (status === "selected") {
        completedSteps.add("business-need");
        completedSteps.add("discovery");
        completedSteps.add("evaluation");
        completedSteps.add("selection");
        completedGates.add("SG-1");
        completedGates.add("SG-2");
        completedGates.add("SG-3");
        currentActiveGate = "SG-4";
    } else if (status === "in_qualification") {
        // User has passed SG-2 — Discovery done, Evaluation is the current step, SG-3 upcoming
        completedSteps.add("business-need");
        completedSteps.add("discovery");
        if (currentStep === "selection" || currentStep === "recos" || currentStep === "sg3" || currentStep === "sg4" || currentStep === "export") {
            completedSteps.add("evaluation");
        }
        completedGates.add("SG-1");
        completedGates.add("SG-2");
        currentActiveGate = "SG-3";
    } else if (status === "delivery") {
        // SG-4 passed — delivery validated, export unlocked, pipeline done
        completedSteps.add("business-need");
        completedGates.add("SG-1");
        completedSteps.add("discovery");
        completedGates.add("SG-2");
        completedSteps.add("evaluation");
        completedSteps.add("selection");
        completedGates.add("SG-3");
        completedSteps.add("recos");
        completedGates.add("SG-4");
        completedSteps.add("done");
        currentActiveGate = "";
    } else if (status === "abandoned") {
        currentActiveGate = "";
    }

    return { completedSteps, completedGates, currentActiveGate };
}

function getWorkflowState(currentStep: PipelineStep, status: Status): WorkflowState {
    if (currentStep === "business_need") return "business_need";
    if (currentStep === "sg1") return "sg1_validation";
    if (currentStep === "discovery" || currentStep === "sg2") return "discovery";
    if (status === "in_qualification") return "evaluation";
    if (status === "solutions_reviewed") return "evaluation";
    if (currentStep === "evaluation") return "evaluation";
    if (currentStep === "selection" || currentStep === "sg3") return "selection";
    if (currentStep === "export") return "export";
    if (currentStep === "sg4") return "sg4_validation";
    if (currentStep === "recos") return status === "delivery" ? "export" : "recommendations";
    return "business_need";
}

function getWorkflowTarget(step: SourcingWorkflowStepId, ipmId?: string) {
    const query = ipmId ? `?id=${ipmId}` : "";
    if (step === "business_need" || step === "discovery") return `/sourcing${query}`;
    if (step === "evaluation") return `/evaluation${query}`;
    if (step === "selection") return `/selection${query}`;
    return `/recos${query}`;
}

// ---------------------------------------------------------------------------
// SG-2 Solution Recap (reads from localStorage)
// ---------------------------------------------------------------------------

function SolutionRecap() {
    const [solutions, setSolutions] = useState<{ id: string; name: string; relevance: number }[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem("ipm_selected_solutions");
        if (saved) {
            try { setSolutions(JSON.parse(saved)); } catch { /* malformed — ignore */ }
        }
    }, []);

    return (
        <div style={{ padding: "0 16px", marginBottom: 8 }}>
            <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontWeight: 500,
                color: "var(--wf-muted-fg)",
                display: "block",
                marginBottom: 12,
            }}>
                Selected Solutions
            </span>
            {solutions.length === 0 ? (
                <div style={{
                    fontSize: 12,
                    color: "var(--wf-muted-fg)",
                    opacity: 0.6,
                    padding: "8px 12px",
                    background: "var(--wf-muted)",
                    borderRadius: 6,
                    border: "1px solid var(--wf-border)",
                }}>
                    No solutions confirmed yet
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {solutions.map((s) => (
                        <motion.div
                            key={s.id}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "8px 12px",
                                borderRadius: 6,
                                background: "var(--wf-muted)",
                                border: "1px solid var(--wf-border)",
                            }}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15 }}
                        >
                            <span style={{ fontSize: 13, color: "var(--wf-fg)" }}>{s.name}</span>
                            <span style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: 11,
                                fontWeight: 600,
                                color: s.relevance >= 80 ? "var(--wf-qualification)" : s.relevance >= 65 ? "var(--wf-sourcing)" : "var(--wf-muted-fg)",
                            }}>
                                {s.relevance}%
                            </span>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WorkflowBar({ currentStep, status: propStatus, onStepClick, ipmId, ipmTitle: propTitle, isInteractive = true }: WorkflowBarProps) {
    const isMobile = useIsMobile();
    const [activeGate, setActiveGate] = useState<GateKey | null>(null);
    const [need, setNeed] = useState<BusinessNeed | null>(null);

    useEffect(() => {
        if (ipmId) {
            getNeed(ipmId).then(setNeed).catch(e => console.error("Error fetching need:", e));
        }
    }, [ipmId]);

    // propStatus is authoritative when provided — the parent page may intentionally
    // display a different status than what's in the DB (e.g. /discovery?sg1=completed
    // forces "submitted" even if the DB has already advanced to in_qualification/selected).
    const status = propStatus || (need?.status as Status) || "draft";
    const ipmTitle = (need?.tags?.objectif ? (STATUS_LABELS[status] + " Initiative") : propTitle) || "IPM — Innovation Progress Model";

    const { completedSteps, completedGates, currentActiveGate } = useMemo(
        () => deriveStatusState(status, currentStep),
        [status, currentStep]
    );

    const statusText = STATUS_LABELS[status] || "DRAFT";
    const gateSubtitle = currentActiveGate ? `Awaiting ${currentActiveGate} validation` : "Workflow progress";

    const activePhase = useMemo(() => {
        if (!currentActiveGate) return 0;
        if (currentActiveGate === "SG-1") return 1;
        if (currentActiveGate === "SG-2" || currentActiveGate === "SG-3") return 2;
        if (currentActiveGate === "SG-4") return 3;
        return 0;
    }, [currentActiveGate]);

    const v = isMobile;
    const phase1Done = completedSteps.has("discovery");
    const phase2Done = completedGates.has("SG-3");
    const phase2Reached =
        completedGates.has("SG-2") ||
        completedSteps.has("evaluation") ||
        completedSteps.has("selection") ||
        currentStep === "evaluation" ||
        currentStep === "selection" ||
        currentStep === "sg3" ||
        currentStep === "recos" ||
        currentStep === "sg4" ||
        currentStep === "export";
    const phase3Reached =
        completedGates.has("SG-3") ||
        completedSteps.has("recos") ||
        currentStep === "recos" ||
        currentStep === "sg4" ||
        currentStep === "export";
    const sg2Reached = phase2Reached || currentActiveGate === "SG-2";
    const sg3Reached = phase2Reached || phase3Reached || currentActiveGate === "SG-3";
    const sg4Reached = phase3Reached || currentActiveGate === "SG-4";

    const handleGo = useCallback(async () => {
        if (!activeGate || !ipmId) return;

        // SG-4 is frontend-only — no backend status change
        if (activeGate === "SG-4") {
            toast.success("SG-4 Validated", { description: "Export documents are now available." });
            setActiveGate(null);
            return;
        }

        let nextStatus: Status = "submitted";
        if (activeGate === "SG-1") nextStatus = "submitted";
        else if (activeGate === "SG-2") nextStatus = "in_qualification";
        else if (activeGate === "SG-3") nextStatus = "delivery";

        try {
            const updated = await updateNeedStatus(ipmId, { status: nextStatus });
            setNeed(updated);
            toast.success(`${activeGate} Validated`, {
                description: `IPM moved to ${STATUS_LABELS[nextStatus]}`
            });
            setActiveGate(null);
        } catch (err: unknown) {
            const e = err as Error;
            toast.error("Error updating status", { description: e.message });
        }
    }, [activeGate, ipmId]);

    const handleRework = useCallback(async (note: string) => {
        if (!activeGate || !ipmId) return;
        try {
            const updated = await updateNeedStatus(ipmId, { status: "rework", note });
            setNeed(updated);
            toast.warning(`${activeGate}: Returned for Revision`, { description: `Note: ${note}` });
            setActiveGate(null);
        } catch (err: unknown) {
            const e = err as Error;
            toast.error("Error updating status", { description: e.message });
        }
    }, [activeGate, ipmId]);

    const handleStop = useCallback(async (reason: string) => {
        if (!activeGate || !ipmId) return;
        try {
            const updated = await updateNeedStatus(ipmId, { status: "abandoned", note: reason });
            setNeed(updated);
            toast.error(`${activeGate}: Initiative Abandoned`, { description: `Reason: ${reason}` });
            setActiveGate(null);
        } catch (err: unknown) {
            const e = err as Error;
            toast.error("Error updating status", { description: e.message });
        }
    }, [activeGate, ipmId]);

    const sharedWorkflowState = getWorkflowState(currentStep, status);
    const workflowTitle = need?.pitch
        ? need.pitch.substring(0, 60) + (need.pitch.length > 60 ? "..." : "")
        : (ipmTitle ?? "IPM Flow");
    const handleSharedStepClick = (step: SourcingWorkflowStepId) => {
        onStepClick?.(
            step === "business_need" ? "business_need" :
            step === "discovery" ? "discovery" :
            step === "evaluation" ? "evaluation" :
            step === "selection" ? "selection" :
            step === "recommendations" ? "recos" :
            "export"
        );

        window.location.href = getWorkflowTarget(step, ipmId);
    };

    return (
        <div
            className="workflow-bar workflow-bar-compact"
            style={{
                zIndex: 30,
                background: "transparent",
                borderBottom: "1px solid var(--wf-border)",
                overflow: "visible",
            }}
        >
            <div
                style={{
                    width: "100%",
                    margin: "0",
                    padding: "12px var(--ipm-page-gutter-md) 4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                }}
            >
                <div style={{ minWidth: 0, display: "grid", gap: 2 }}>
                    <h1
                        style={{
                            fontSize: 18,
                            fontWeight: 650,
                            color: "var(--wf-fg)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            margin: 0,
                            lineHeight: 1.25,
                        }}
                    >
                        {workflowTitle}
                    </h1>
                    <span className="workflow-status-subtitle">
                        {gateSubtitle}
                    </span>
                </div>
                <span
                    className="workflow-status-badge"
                    style={{
                        whiteSpace: "nowrap",
                    }}
                >
                    {statusText}
                </span>
            </div>
            <SourcingWorkflowProgress currentState={sharedWorkflowState} onStepClick={handleSharedStepClick} />
        </div>
    );

    return (
        <>
            <div className="workflow-bar" style={{
                height: "var(--header-height)",
                display: "flex",
                flexDirection: "column",
                zIndex: 30,
                background: "transparent",
                borderBottom: "1px solid var(--wf-border)",
                overflow: "hidden",
            }}>
                {/* ===== ROW 1: App bar ===== */}
                <div style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--wf-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <h1 style={{
                            fontSize: 18,
                            fontWeight: 600,
                            color: "var(--wf-fg)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            margin: 0,
                            lineHeight: 1.3,
                        }}>
                            {workflowTitle}
                        </h1>
                        <p style={{
                            fontSize: 14,
                            color: "var(--wf-strip-muted-fg)",
                            marginTop: 2,
                            lineHeight: 1.3,
                        }}>
                            {currentStep === "sg1" ? (
                                <>
                                    <span style={{ color: "var(--wf-sourcing)", fontFamily: "var(--font-mono)" }}>◆ SG-1</span>
                                    {" "}— review duplicates and validate before proceeding
                                </>
                            ) : currentStep === "discovery" ? (
                                <>
                                    <span style={{ color: "var(--wf-discovery-label)", fontFamily: "var(--font-mono)" }}>◆ Discovery</span>
                                    {" "}— launch tools and select sources to carry forward
                                </>
                            ) : currentActiveGate ? (
                                <>
                                    Awaiting{" "}
                                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--wf-fg)" }}>
                                        {currentActiveGate}
                                    </span>{" "}
                                    Validation
                                </>
                            ) : "Pipeline complete"}
                        </p>
                    </div>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexShrink: 0,
                    }}>
                        <span style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 12,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            fontWeight: 500,
                            color: "var(--wf-strip-muted-fg)",
                        }}>
                            Status
                        </span>
                        <span style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 13,
                            color: "var(--wf-fg)",
                            background: "var(--wf-muted)",
                            padding: "4px 8px",
                            borderRadius: 4,
                        }}>
                            {statusText}
                        </span>
                    </div>
                </div>

                {/* ===== Full animated diagram ===== */}
                <div
                    style={{
                        flex: 1,
                        overflow: "hidden",
                        background: "transparent",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-start",
                        minHeight: 0,
                        paddingTop: 4,
                    }}
                >
                    <div style={{
                        display: "flex",
                        alignItems: isMobile ? "flex-start" : "center",
                        justifyContent: "center",
                        padding: isMobile ? 6 : "6px 12px",
                        overflowX: isMobile ? "hidden" : "auto",
                        overflowY: "hidden",
                        width: "100%",
                        boxSizing: "border-box",
                    }}>
                        <LayoutGroup>
                            <div style={{
                                display: "flex",
                                flexDirection: isMobile ? "column" : "row",
                                alignItems: "center",
                                gap: isMobile ? 3 : 10,
                                width: isMobile ? undefined : "100%",
                                maxWidth: "100%",
                                boxSizing: "border-box",
                            }}>
                                {/* Phase 1: Sourcing — BN, SG-1, Discovery */}
                                <PhaseContainer
                                    title="Sourcing"
                                    color="blue"
                                    isCollapsed={phase1Done && activePhase > 1}
                                    completedCount={[completedSteps.has("business-need"), completedSteps.has("discovery")].filter(Boolean).length}
                                    totalCount={2}
                                >
                                    <WorkflowNode label="Business Need" index="01" color="blue" isCompleted={completedSteps.has("business-need")} delay={0.1} />
                                    <Connector delay={0.2} vertical={v} />
                                    <StageGate label="SG-1" color="blue" isActive={currentActiveGate === "SG-1" || currentStep === "sg1"} isCompleted={completedGates.has("SG-1")} delay={0.3} onClick={isInteractive ? () => setActiveGate("SG-1") : undefined} />
                                    <Connector delay={0.35} vertical={v} />
                                    <WorkflowNode label="Discovery" index="02" color="blue" isActive={currentStep === "discovery" && !completedSteps.has("discovery")} isCompleted={completedSteps.has("discovery")} delay={0.4} />
                                </PhaseContainer>

                                <Connector delay={0.45} vertical={v} />

                                {/* SG-2: Entry gate into Qualification (outside phase box) */}
                                <StageGate label="SG-2" color="emerald" isActive={currentActiveGate === "SG-2"} isCompleted={completedGates.has("SG-2")} isMuted={!sg2Reached} delay={0.5} onClick={isInteractive ? () => setActiveGate("SG-2") : undefined} />

                                <Connector delay={0.55} vertical={v} />

                                {/* Solutions: display-only vertical label — no circle, no logic */}
                                <span style={{
                                    writingMode: "vertical-rl",
                                    textOrientation: "mixed",
                                    fontFamily: "var(--font-mono)",
                                    fontSize: 12,
                                    letterSpacing: "0.12em",
                                    textTransform: "uppercase",
                                    fontWeight: 500,
                                    color: "var(--wf-strip-muted-fg)",
                                    opacity: phase2Reached ? 1 : 0.55,
                                    userSelect: "none",
                                    flexShrink: 0,
                                }}>
                                    Solutions
                                </span>

                                <Connector delay={0.58} vertical={v} />

                                {/* Phase 2: Qualification — Evaluation, Selection */}
                                <PhaseContainer
                                    title="Qualification"
                                    color="emerald"
                                    isMuted={!phase2Reached}
                                    isCollapsed={phase2Done && activePhase > 2}
                                    completedCount={[completedSteps.has("evaluation"), completedSteps.has("selection")].filter(Boolean).length}
                                    totalCount={2}
                                >
                                    <WorkflowNode label="Evaluation" index="04" color="emerald" isActive={completedGates.has("SG-2") && !completedSteps.has("evaluation")} isCompleted={completedSteps.has("evaluation")} isMuted={!phase2Reached} delay={0.6} />
                                    <Connector delay={0.65} vertical={v} />
                                    <WorkflowNode label="Selection" index="05" color="emerald" isActive={completedSteps.has("evaluation") && !completedSteps.has("selection")} isCompleted={completedSteps.has("selection")} isMuted={!phase2Reached} delay={0.7} />
                                </PhaseContainer>

                                <Connector delay={0.75} vertical={v} />

                                {/* SG-3: Exit gate from Qualification (outside phase box) */}
                                <StageGate label="SG-3" color="emerald" isActive={currentActiveGate === "SG-3"} isCompleted={completedGates.has("SG-3")} isMuted={!sg3Reached} delay={0.8} onClick={isInteractive ? () => setActiveGate("SG-3") : undefined} />

                                <Connector delay={0.85} vertical={v} />

                                {/* Phase 3: Delivery — Recos, SG-4, PDF/DOC */}
                                <PhaseContainer
                                    title="Delivery"
                                    color="orange"
                                    isMuted={!phase3Reached}
                                    isCollapsed={false}
                                    completedCount={completedSteps.has("recos") ? 1 : 0}
                                    totalCount={1}
                                >
                                    <WorkflowNode label="Recos" index="06" color="orange" isActive={completedGates.has("SG-3") && !completedSteps.has("recos")} isCompleted={completedSteps.has("recos")} isMuted={!phase3Reached} delay={0.9} />
                                    <Connector delay={0.95} vertical={v} />
                                    <StageGate label="SG-4" color="orange" isActive={currentActiveGate === "SG-4"} isCompleted={completedGates.has("SG-4")} isMuted={!sg4Reached} delay={1.0} onClick={isInteractive ? () => setActiveGate("SG-4") : undefined} />
                                    <Connector delay={1.05} vertical={v} />
                                    <div style={{
                                        display: "flex",
                                        flexDirection: v ? "column" : "row",
                                        alignItems: "center",
                                        gap: v ? 5 : 8,
                                        flexShrink: 0,
                                    }}>
                                        {["PDF", "DOCX"].map((fmt) => (
                                            <button
                                                key={fmt}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 6,
                                                    padding: "4px 10px",
                                                    borderRadius: 6,
                                                    background: phase3Reached ? "var(--wf-delivery-bg-chip)" : "rgba(127, 127, 127, 0.04)",
                                                    border: `1px solid ${phase3Reached ? "var(--wf-delivery-border-chip)" : "var(--wf-border)"}`,
                                                    color: phase3Reached ? "var(--wf-delivery)" : "var(--wf-muted-fg)",
                                                    fontFamily: "var(--font-mono)",
                                                    fontSize: 13,
                                                    fontWeight: 500,
                                                    letterSpacing: "0.05em",
                                                    cursor: "pointer",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: phase3Reached ? "var(--wf-delivery)" : "var(--wf-muted-fg)", opacity: 0.7, flexShrink: 0 }} />
                                                {fmt}
                                            </button>
                                        ))}
                                    </div>
                                </PhaseContainer>
                            </div>
                        </LayoutGroup>
                    </div>

                    {currentActiveGate && isInteractive && currentStep !== "discovery" && currentStep !== "evaluation" && currentStep !== "selection" && (
                        <div style={{ borderTop: "1px solid var(--wf-border)", padding: "8px 16px", background: "var(--wf-footer-overlay)" }}>
                            <div style={{ display: "flex", justifyContent: "center" }}>
                                <button
                                    onClick={() => setActiveGate(currentActiveGate as GateKey)}
                                    style={{
                                        padding: "8px 20px", borderRadius: 6,
                                        background: "var(--wf-sourcing)", color: "var(--wf-btn-on-color)",
                                        fontWeight: 500, fontSize: 13, border: "none",
                                        cursor: "pointer", fontFamily: "var(--font-mono)",
                                    }}
                                >
                                    Validate {currentActiveGate}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Gate Modal */}
            {isInteractive && activeGate && (
                <GateModal
                    isOpen={!!activeGate}
                    onClose={() => setActiveGate(null)}
                    gate={gateData[activeGate as GateKey]}
                    onGo={handleGo}
                    onRework={handleRework}
                    onStop={handleStop}
                    headerContent={activeGate === "SG-2" ? <SolutionRecap /> : undefined}
                />
            )}
        </>
    );
}

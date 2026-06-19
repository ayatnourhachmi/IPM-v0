"use client";

import { Fragment } from "react";
import { IpmFlowActiveNode } from "@/components/sourcing/IpmFlowActiveNode";
import { IpmFlowCompletedNode } from "@/components/sourcing/IpmFlowCompletedNode";
import { IpmFlowFutureNode } from "@/components/sourcing/IpmFlowFutureNode";
import { IpmFlowLockedPhaseNode } from "@/components/sourcing/IpmFlowLockedPhaseNode";
import { IpmFlowDeliveryActiveNode } from "@/components/sourcing/IpmFlowDeliveryActiveNode";
import { IpmFlowQualificationActiveNode } from "@/components/sourcing/IpmFlowQualificationActiveNode";

export type WorkflowState =
    | "business_need"
    | "time_horizon"
    | "sg1_validation"
    | "discovery"
    | "sg2_validation"
    | "evaluation"
    | "selection"
    | "sg3_validation"
    | "recommendations"
    | "sg4_validation"
    | "export";
export type SourcingFlowState = WorkflowState;
export type SourcingWorkflowStepId = "business_need" | "discovery" | "evaluation" | "selection" | "recommendations" | "export";

type PhaseId = "sourcing" | "qualification" | "delivery";
type PhaseStatus = "active" | "completed" | "future";
type StepStatus = "active" | "completed" | "future";

type WorkflowStep = {
    id: SourcingWorkflowStepId;
    badge: string;
    label: string;
};

type Phase = {
    id: PhaseId;
    title: string;
    states: WorkflowState[];
    steps: WorkflowStep[];
};

const phases: Phase[] = [
    {
        id: "sourcing",
        title: "SOURCING",
        states: ["business_need", "time_horizon", "sg1_validation", "discovery", "sg2_validation"],
        steps: [
            { id: "business_need", badge: "Step 1", label: "BN" },
            { id: "discovery", badge: "Step 2", label: "Discovery" },
        ],
    },
    {
        id: "qualification",
        title: "QUALIFICATION",
        states: ["evaluation", "selection", "sg3_validation"],
        steps: [
            { id: "evaluation", badge: "Step 3", label: "Evaluation" },
            { id: "selection", badge: "Step 4", label: "Selection" },
        ],
    },
    {
        id: "delivery",
        title: "DELIVERY",
        states: ["recommendations", "sg4_validation", "export"],
        steps: [
            { id: "recommendations", badge: "Step 5", label: "Recos" },
            { id: "export", badge: "Step 6", label: "PoC Prepa" },
        ],
    },
];

const phaseOrder = phases.map((phase) => phase.id);

export function getActivePhase(currentState: WorkflowState): PhaseId {
    return phases.find((phase) => phase.states.includes(currentState))?.id ?? "sourcing";
}

export function getPhaseStatus(phase: PhaseId, currentState: WorkflowState): PhaseStatus {
    const phaseIndex = phaseOrder.indexOf(phase);
    const activePhaseIndex = phaseOrder.indexOf(getActivePhase(currentState));

    if (phaseIndex === activePhaseIndex) return "active";
    if (phaseIndex < activePhaseIndex) return "completed";
    return "future";
}

export function getStepStatus(stepState: SourcingWorkflowStepId, currentState: WorkflowState): StepStatus {
    const completedStates: Record<SourcingWorkflowStepId, WorkflowState[]> = {
        business_need: [
            "sg1_validation",
            "discovery",
            "sg2_validation",
            "evaluation",
            "selection",
            "sg3_validation",
            "recommendations",
            "sg4_validation",
            "export",
        ],
        discovery: ["evaluation", "selection", "sg3_validation", "recommendations", "sg4_validation", "export"],
        evaluation: ["selection", "sg3_validation", "recommendations", "sg4_validation", "export"],
        selection: ["recommendations", "sg4_validation", "export"],
        recommendations: ["export"],
        export: [],
    };

    const activeStates: Record<SourcingWorkflowStepId, WorkflowState[]> = {
        business_need: ["business_need", "time_horizon"],
        discovery: ["discovery", "sg2_validation"],
        evaluation: ["evaluation"],
        selection: ["selection", "sg3_validation"],
        recommendations: ["recommendations", "sg4_validation"],
        export: ["export"],
    };

    if (activeStates[stepState].includes(currentState)) return "active";
    if (completedStates[stepState].includes(currentState)) return "completed";
    return "future";
}

function isStepLineCompleted(phaseStatus: PhaseStatus, stepStatus: StepStatus) {
    return phaseStatus === "completed" || stepStatus === "completed";
}

function renderStepNode(phaseId: PhaseId, phaseStatus: PhaseStatus, stepStatus: StepStatus) {
    if (stepStatus === "completed") {
        const variant =
            phaseId === "qualification" ? "qualification" : phaseId === "delivery" ? "delivery" : "sourcing";
        return <IpmFlowCompletedNode variant={variant} />;
    }

    if (phaseStatus === "future") {
        return <IpmFlowLockedPhaseNode />;
    }

    if (stepStatus === "active") {
        if (phaseId === "qualification") {
            return <IpmFlowQualificationActiveNode />;
        }
        if (phaseId === "delivery") {
            return <IpmFlowDeliveryActiveNode />;
        }
        return <IpmFlowActiveNode />;
    }

    if (stepStatus === "future") {
        if (phaseId === "delivery") {
            return <IpmFlowLockedPhaseNode />;
        }
        return <IpmFlowFutureNode />;
    }

    return null;
}

export function SourcingWorkflowProgress({
    currentState,
    onStepClick,
}: {
    currentState: SourcingFlowState;
    onStepClick?: (stepId: SourcingWorkflowStepId) => void;
}) {
    return (
        <div className="ipm-flow-progress" aria-label="IPM workflow progress">
            {phases.map((phase, phaseIndex) => {
                const phaseStatus = getPhaseStatus(phase.id, currentState);

                return (
                    <Fragment key={phase.id}>
                        <div className={`ipm-flow-phase-wrap phase-${phase.id} status-${phaseStatus}`}>
                            <section
                                className={`ipm-flow-phase phase-${phase.id} status-${phaseStatus}${phaseStatus === "active" ? " active" : ""}`}
                            >
                                <div className="ipm-flow-phase-title">
                                    <span>{phase.title}</span>
                                </div>
                                <div className="ipm-flow-steps">
                                    {phase.steps.map((step, stepIndex) => {
                                        const stepStatus = getStepStatus(step.id, currentState);

                                        return (
                                            <div className="ipm-flow-step-group" key={step.id}>
                                                <button
                                                    type="button"
                                                    className={`ipm-flow-step ${stepStatus}${onStepClick ? " clickable" : ""}`}
                                                    onClick={() => onStepClick?.(step.id)}
                                                    aria-current={stepStatus === "active" ? "step" : undefined}
                                                    aria-label={`Open ${step.badge}: ${step.label}`}
                                                >
                                                    <span className="ipm-flow-step-number">{step.badge}</span>
                                                    <span className="ipm-flow-node">
                                                        {renderStepNode(phase.id, phaseStatus, stepStatus)}
                                                    </span>
                                                    <span className="ipm-flow-step-label">{step.label}</span>
                                                </button>
                                                {stepIndex < phase.steps.length - 1 && (
                                                    <div
                                                        className={`ipm-flow-step-line${isStepLineCompleted(phaseStatus, stepStatus) ? " completed" : ""}`}
                                                        aria-hidden="true"
                                                    >
                                                        <span />
                                                        <span />
                                                        <span />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        </div>
                        {phaseIndex < phases.length - 1 && (
                            <div className="ipm-flow-phase-connector" aria-hidden="true" />
                        )}
                    </Fragment>
                );
            })}
        </div>
    );
}

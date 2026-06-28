"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import {
    SourcingWorkflowProgress,
    type SourcingFlowState,
    type SourcingWorkflowStepId,
} from "@/components/sourcing/SourcingWorkflowProgress";

type FlowStatusMessage = {
    prefix: string;
    emphasis: string;
    suffix: string;
};

export function flowStatusMessage(currentState: SourcingFlowState): FlowStatusMessage {
    if (currentState === "sg1_validation") {
        return { prefix: "Awaiting", emphasis: " Validation Checkpoint 1", suffix: "" };
    }
    if (currentState === "sg2_validation") {
        return { prefix: "Awaiting", emphasis: " Validation Checkpoint 2", suffix: "" };
    }
    if (currentState === "sg3_validation") {
        return { prefix: "Awaiting", emphasis: " Validation Checkpoint 3", suffix: "" };
    }
    if (currentState === "sg4_validation") {
        return { prefix: "Awaiting", emphasis: " Validation Checkpoint 4", suffix: "" };
    }
    if (currentState === "business_need" || currentState === "time_horizon") {
        return { prefix: "Current step:", emphasis: " Business Need", suffix: "" };
    }
    if (currentState === "discovery") {
        return { prefix: "Current step:", emphasis: " Discovery", suffix: "" };
    }
    if (currentState === "evaluation") {
        return { prefix: "Current step:", emphasis: " Evaluation", suffix: "" };
    }
    if (currentState === "selection") {
        return { prefix: "Current step:", emphasis: " Selection", suffix: "" };
    }
    if (currentState === "recommendations") {
        return { prefix: "Current step:", emphasis: " Recommendations", suffix: "" };
    }
    if (currentState === "export") {
        return { prefix: "Current step:", emphasis: " PoC Preparation", suffix: "" };
    }
    return { prefix: "Awaiting", emphasis: " Validation Checkpoint 1", suffix: "" };
}

export function FlowStatusLine({ currentState }: { currentState: SourcingFlowState }) {
    const message = flowStatusMessage(currentState);

    return (
        <p className="ipm-flow-status">
            {message.prefix ? <span className="ipm-status-muted">{message.prefix}</span> : null}
            {message.emphasis ? <span className="ipm-status-emphasis">{message.emphasis}</span> : null}
            {message.suffix ? <span className="ipm-status-muted">{message.suffix}</span> : null}
        </p>
    );
}

export function createFlowStepClickHandler(router: ReturnType<typeof useRouter>, needId?: string) {
    const query = needId ? `?id=${needId}` : "";

    return (stepId: SourcingWorkflowStepId) => {
        if (stepId === "business_need") {
            router.push(`/sourcing${query}`);
            return;
        }
        if (stepId === "discovery") {
            router.push(needId ? `/discovery${query}` : "/discovery");
            return;
        }
        if (stepId === "evaluation") {
            router.push(`/evaluation${query}`);
            return;
        }
        if (stepId === "selection") {
            router.push(`/selection${query}`);
            return;
        }
        router.push(`/recos${query}`);
    };
}

interface IpmFlowShellProps {
    children: React.ReactNode;
    workflowState: SourcingFlowState;
    onStepClick?: (stepId: SourcingWorkflowStepId) => void;
}

export function IpmFlowShell({ children, workflowState, onStepClick }: IpmFlowShellProps) {
    return (
        <div className="ipm-sourcing-redesign">
            <header className="ipm-top-header">
                <div className="ipm-brand-lockup">
                    <Image
                        className="ipm-brand-dxc"
                        src="/landing-files/DXC-Logo-2025.png"
                        alt="DXC"
                        width={92}
                        height={32}
                    />
                    <span className="ipm-brand-divider" aria-hidden="true" />
                    <strong>IPM Flow™</strong>
                </div>
                <div className="ipm-top-header-theme">
                    <ThemeToggle />
                </div>
            </header>

            <main className="ipm-sourcing-page">
                <section className="ipm-flow-intro">
                    <h1>
                        <span>INNOVATION PROCESS MODEL FLOW</span>
                    </h1>
                    <FlowStatusLine currentState={workflowState} />
                </section>

                <SourcingWorkflowProgress currentState={workflowState} onStepClick={onStepClick} />

                <div className="glow-divider ipm-sourcing-divider" aria-hidden="true" />

                {children}
            </main>
        </div>
    );
}

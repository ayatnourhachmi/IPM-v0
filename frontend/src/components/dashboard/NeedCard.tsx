"use client";

import { useRouter } from "next/navigation";
import type { BusinessNeed, Status } from "@/lib/types";
import { HORIZON_LABELS, STATUS_LABELS } from "@/lib/types";

type DashboardPhase = "sourcing" | "qualification" | "delivery";
type PhaseState = "completed" | "active" | "future" | "abandoned";

const PHASES: Array<{ id: DashboardPhase; label: string }> = [
    { id: "sourcing", label: "Sourcing" },
    { id: "qualification", label: "Qualification" },
    { id: "delivery", label: "Delivery" },
];

function routeForStatus(status: Status) {
    if (status === "submitted" || status === "solutions_reviewed") return "/evaluation";
    if (status === "in_qualification") return "/selection";
    if (status === "selected" || status === "delivery") return "/recos";
    return "/sourcing";
}

function phaseState(phase: DashboardPhase, status: Status): PhaseState {
    if (status === "abandoned") return "abandoned";
    if (status === "delivery") return "completed";

    const activePhase: DashboardPhase =
        status === "selected"
            ? "delivery"
            : status === "in_qualification" || status === "solutions_reviewed"
              ? "qualification"
              : "sourcing";

    const order = PHASES.findIndex((item) => item.id === phase);
    const activeOrder = PHASES.findIndex((item) => item.id === activePhase);

    if (order < activeOrder) return "completed";
    if (order === activeOrder) return "active";
    return "future";
}

function terminalLabel(status: Status) {
    if (status === "delivery") return "Completed";
    if (status === "abandoned") return "Abandoned";
    return STATUS_LABELS[status];
}

interface NeedCardProps {
    need: BusinessNeed;
}

export function NeedCard({ need }: NeedCardProps) {
    const router = useRouter();
    const isTerminal = need.status === "delivery" || need.status === "abandoned";
    const actionLabel = isTerminal ? "View" : "Continue";

    const openNeed = () => {
        router.push(`${routeForStatus(need.status)}?id=${need.id}`);
    };

    return (
        <article className={`need-card status-${need.status}`}>
            <div className="need-header">
                <span className="bn-id">{need.id}</span>
                <span className={`dashboard-status-pill status-${need.status}`}>
                    {terminalLabel(need.status)}
                </span>
            </div>

            <p className="need-pitch">{need.pitch}</p>

            <div className="need-phase-strip" aria-label={`${need.id} phase status`}>
                {PHASES.map((phase) => {
                    const state = phaseState(phase.id, need.status);
                    return (
                        <span key={phase.id} className={`need-phase-dot ${state}`}>
                            <i aria-hidden="true" />
                            {phase.label}
                        </span>
                    );
                })}
            </div>

            <div className="need-meta">
                <span className="tag-chip amber">{HORIZON_LABELS[need.horizon].label}</span>
                {need.tags.domain.slice(0, 3).map((domain) => (
                    <span key={domain.value} className="tag-chip blue">{domain.value}</span>
                ))}
            </div>

            {need.rework_note && (
                <div className="need-rework-note">
                    <div className="need-rework-note-label">Rework note</div>
                    {need.rework_note}
                </div>
            )}

            <button type="button" className="dashboard-card-action" onClick={openNeed}>
                {actionLabel}
            </button>
        </article>
    );
}

/**
 * Selection page (QUALIFICATION PHASE - after VC-3 GO).
 * Reads the auto-evaluated ranking and lets the user choose the final solution(s)
 * to carry into the Delivery phase / Recos.
 */

"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createFlowStepClickHandler, IpmFlowShell } from "@/components/sourcing/IpmFlowShell";
import { SelectionStep, type SelectionSolution } from "@/components/qualification/SelectionStep";
import { Sg3ValidationPanel } from "@/components/sourcing/Sg3ValidationPanel";
import { PhaseLoading } from "@/components/sourcing/PhaseLoading";
import { getNeed, updateNeedStatus } from "@/lib/api";
import type { Status } from "@/lib/types";

type GapAnalysisSnapshot = {
    features_matching: string[];
    features_missing: string[];
    resources_needed: string[];
    fit_score: number;
    evaluation_scores?: {
        fit: number;
        feasibility: number;
        cost: number;
        innovation: number;
    };
    solution_name: string;
};

type EvaluationRow = {
    id: string;
    name: string;
    relevance: number;
    overall: number;
    description?: string;
    scores: {
        fit: number;
        feasibility: number;
        cost: number;
        innovation: number;
    };
    score_source?: string;
    gap_analysis?: GapAnalysisSnapshot | null;
};

type EvaluationState = {
    activeId?: string | null;
    rows: EvaluationRow[];
    updated_at?: string;
};

type DeliverySelection = {
    id: string;
    name: string;
    relevance: number;
    overall: number;
};

function normalizeEvaluationState(value: unknown): EvaluationState {
    if (!value || typeof value !== "object") return { rows: [] };
    const candidate = value as Partial<EvaluationState>;
    const parseEvaluationRow = (row: unknown): EvaluationRow | null => {
        if (!row || typeof row !== "object") return null;
        const item = row as Partial<EvaluationRow>;
        if (typeof item.id !== "string" || typeof item.name !== "string") return null;
        const scores = item.scores;
        if (!scores) return null;

        return {
            id: item.id,
            name: item.name,
            relevance: typeof item.relevance === "number" ? item.relevance : 0,
            overall: typeof item.overall === "number" ? item.overall : 0,
            description: typeof item.description === "string" ? item.description : undefined,
            score_source: typeof item.score_source === "string" ? item.score_source : undefined,
            gap_analysis: item.gap_analysis || null,
            scores: {
                fit: Number(scores.fit) || 1,
                feasibility: Number(scores.feasibility) || 1,
                cost: Number(scores.cost) || 1,
                innovation: Number(scores.innovation) || 1,
            },
        };
    };
    const rows = Array.isArray(candidate.rows)
        ? candidate.rows
            .map(parseEvaluationRow)
            .filter((row): row is EvaluationRow => row !== null)
        : [];

    return {
        activeId: typeof candidate.activeId === "string" ? candidate.activeId : null,
        rows,
        updated_at: typeof candidate.updated_at === "string" ? candidate.updated_at : undefined,
    };
}

function strengthFor(row: EvaluationRow, rank: number) {
    if (rank === 0) return "Highest IVI score with the best overall balance across qualification criteria.";
    if (row.scores.fit >= 4) return "Strong business impact and a clear connection to the original need.";
    return "Viable option with useful Discovery evidence for targeted validation.";
}

function riskFor(row: EvaluationRow) {
    if (row.scores.cost <= 2) return "Duration or delivery complexity may need close planning.";
    if (row.scores.feasibility <= 2) return "Maturity should be validated before delivery commitment.";
    return "Keep assumptions visible during Delivery preparation.";
}

function fitLabelFor(row: EvaluationRow) {
    const fitScore = row.gap_analysis?.fit_score;
    if (typeof fitScore === "number" && Number.isFinite(fitScore)) {
        return `${Math.max(0, Math.min(10, fitScore))}/10`;
    }

    return `${Math.max(0, Math.min(100, Math.round(row.relevance)))}%`;
}

function toSelectionSolutions(rows: EvaluationRow[]): SelectionSolution[] {
    return rows.map((row, index) => ({
        id: row.id,
        name: row.name,
        relevance: row.relevance,
        overall: row.overall,
        scores: row.scores,
        description: row.description,
        status: index === 0 ? "Recommended" : index === 1 ? "Alternative" : "Reserve option",
        scoreSource: row.score_source,
        fitScore: fitLabelFor(row),
        strength: strengthFor(row, index),
        risk: riskFor(row),
        whySelected: index === 0
            ? "Recommended by the IVI ranking for the third validation checkpoint."
            : "Available as a qualified alternative from Evaluation.",
    }));
}

function SelectionPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const ipmId = searchParams.get("id") || undefined;
    const [evaluationState, setEvaluationState] = useState<EvaluationState>({ rows: [] });
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showGate, setShowGate] = useState(false);
    const [transitionError, setTransitionError] = useState<string | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem("ipm_evaluation_state");
        if (saved) {
            try {
                const parsed = normalizeEvaluationState(JSON.parse(saved));
                setEvaluationState(parsed);
                const preselected = parsed.rows.length > 0 ? [parsed.rows[0].id] : [];
                setSelectedIds(new Set(preselected));
            } catch {
                setEvaluationState({ rows: [] });
                setSelectedIds(new Set());
            }
        }
    }, []);

    const rankedRows = useMemo(() => {
        return [...evaluationState.rows].sort((a, b) => b.overall - a.overall);
    }, [evaluationState.rows]);

    const selectedRows = useMemo(() => {
        return rankedRows.filter((row) => selectedIds.has(row.id));
    }, [rankedRows, selectedIds]);

    const selectionSolutions = useMemo(() => toSelectionSolutions(rankedRows), [rankedRows]);
    const toggleSolution = (solutionId: string) => {
        setSelectedIds((current) => {
            const next = new Set(current);
            if (next.has(solutionId)) next.delete(solutionId);
            else next.add(solutionId);
            return next;
        });
    };

    const proceedToRecos = () => {
        if (!ipmId || selectedRows.length === 0) return;
        setTransitionError(null);
        setShowGate(true);
    };

    const advanceNeedToSelected = async (needId: string) => {
        const need = await getNeed(needId);
        let currentStatus = need.status as Status;

        const nextByStatus: Partial<Record<Status, Status>> = {
            draft: "submitted",
            submitted: "in_qualification",
            solutions_reviewed: "in_qualification",
            in_qualification: "selected",
            rework: "submitted",
        };

        let guard = 0;
        while (currentStatus !== "selected" && currentStatus !== "delivery") {
            const next = nextByStatus[currentStatus];
            if (!next) {
                throw new Error(`Cannot continue from status '${currentStatus}'.`);
            }
            const updated = await updateNeedStatus(needId, { status: next });
            currentStatus = updated.status as Status;
            guard += 1;
            if (guard > 6) {
                throw new Error("Too many status transitions while validating VC-3.");
            }
        }
    };

    const handleStepClick = createFlowStepClickHandler(router, ipmId);

    return (
        <IpmFlowShell workflowState="selection" onStepClick={handleStepClick}>
            <SelectionStep
                solutions={selectionSolutions}
                selectedIds={selectedIds}
                onToggle={toggleSolution}
                onBack={() => router.push(ipmId ? `/evaluation?id=${ipmId}` : "/evaluation")}
                onValidate={proceedToRecos}
                canValidate={Boolean(ipmId) && selectedRows.length > 0}
                hasInitiative={Boolean(ipmId)}
                transitionError={transitionError}
            />

            {showGate && (
                <Sg3ValidationPanel
                    open={showGate}
                    selectedSolutions={selectedRows}
                    onGo={async () => {
                        if (!ipmId || selectedRows.length === 0) return;

                        const payload: DeliverySelection[] = selectedRows.map((row) => ({
                            id: row.id,
                            name: row.name,
                            relevance: row.relevance,
                            overall: row.overall,
                        }));

                        localStorage.setItem("ipm_delivery_solutions", JSON.stringify(payload));
                        try {
                            await advanceNeedToSelected(ipmId);
                            setShowGate(false);
                            router.push(`/recos?id=${ipmId}`);
                        } catch (error) {
                            setShowGate(false);
                            setTransitionError(error instanceof Error ? error.message : "Unable to validate VC-3.");
                        }
                    }}
                    onRework={() => setShowGate(false)}
                    onAbandon={() => router.push("/dashboard")}
                    onClose={() => setShowGate(false)}
                />
            )}
        </IpmFlowShell>
    );
}

export default function SelectionPage() {
    return (
        <Suspense fallback={<PhaseLoading phase="qualification" variant="page" label="Loading selection..." />}>
            <SelectionPageContent />
        </Suspense>
    );
}

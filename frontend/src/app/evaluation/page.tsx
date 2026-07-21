/**
 * Evaluation / Comparaison page.
 * First qualification step after VC-2 GO.
 * Reads the solutions selected in Discovery and lets the user score them.
 */

"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createFlowStepClickHandler, IpmFlowShell } from "@/components/sourcing/IpmFlowShell";
import { EvaluationStep, type EvaluationSolution, type EvaluationScoreJustifications, type JustificationSource, type ScoreJustification } from "@/components/qualification/EvaluationStep";
import { PhaseLoading } from "@/components/sourcing/PhaseLoading";

type SelectedSolution = {
    id: string;
    name: string;
    relevance: number;
    description: string | undefined;
    source: string | undefined;
    gap_analysis: GapAnalysisSnapshot | null;
};

type GapAnalysisSnapshot = {
    features_matching: string[];
    features_missing: string[];
    resources_needed: string[];
    fit_score: number;
    fit_justification?: string;
    evaluation_scores?: {
        maturity: number;
        maturity_justification: string;
        expertise: number;
        expertise_justification: string;
        duration: number;
        duration_justification: string;
        impact: number;
        impact_justification: string;
        risk?: number;
        risk_justification?: string;
    };
    solution_name: string;
};

type EvaluationScores = {
    fit: number;
    feasibility: number;
    cost: number;
    innovation: number;
    risk: number;
};

type Sg2State = {
    cardStates: Record<string, string>;
    totalSelected: number;
};

function round(value: number) {
    return Math.round(value * 100) / 100;
}

function clampScore(value: number) {
    return Math.min(5, Math.max(1, Math.round(value)));
}

function justification(text: string, source: JustificationSource): ScoreJustification {
    return { text, source };
}

function aiJustification(text: string | undefined): ScoreJustification | null {
    const trimmed = text?.trim();
    return trimmed ? justification(trimmed, "ai") : null;
}

function buildJustificationsFromGap(solution: SelectedSolution): EvaluationScoreJustifications {
    const es = solution.gap_analysis?.evaluation_scores;
    const gap = solution.gap_analysis;

    const derivedFromGap = (): EvaluationScoreJustifications => {
        if (!gap) {
            return {
                fit: justification("Preliminary impact estimate from Discovery relevance.", "estimate"),
                feasibility: justification("Preliminary maturity estimate from Discovery relevance.", "estimate"),
                innovation: justification("Preliminary expertise estimate from Discovery relevance.", "estimate"),
                cost: justification("Preliminary duration estimate from Discovery relevance.", "estimate"),
                risk: justification("Preliminary risk estimate from Discovery relevance.", "estimate"),
            };
        }

        const matching = gap.features_matching.slice(0, 2).join(", ");
        const missing = gap.features_missing.slice(0, 2).join(", ");
        const resources = gap.resources_needed.slice(0, 2).join(", ");

        return {
            fit: gap.fit_justification?.trim()
                ? justification(gap.fit_justification.trim(), "ai")
                : matching
                  ? justification(`Impact reflects alignment on ${matching}.`, "derived")
                  : justification("Impact inferred from overall fit against the business need.", "derived"),
            feasibility: missing
                ? justification(`Maturity weighed against missing capabilities: ${missing}.`, "derived")
                : justification("Maturity inferred from feature coverage in gap analysis.", "derived"),
            innovation: resources
                ? justification(`Expertise driven by required resources: ${resources}.`, "derived")
                : justification("Expertise inferred from skills and enablers identified in gap analysis.", "derived"),
            cost: missing || resources
                ? justification(
                    `Duration estimated from implementation gaps${missing ? ` (${missing})` : ""}${resources ? ` and resource load (${resources})` : ""}.`,
                    "derived",
                )
                : justification("Duration estimated from gap-analysis implementation complexity.", "derived"),
            risk: justification("Risk posture estimated from gap-analysis implementation complexity and missing features.", "derived"),
        };
    };

    if (!es) {
        return derivedFromGap();
    }

    const fromAi: EvaluationScoreJustifications = {
        fit: aiJustification(es.impact_justification) ?? undefined,
        feasibility: aiJustification(es.maturity_justification) ?? undefined,
        innovation: aiJustification(es.expertise_justification) ?? undefined,
        cost: aiJustification(es.duration_justification) ?? undefined,
        risk: aiJustification(es.risk_justification) ?? undefined,
    };

    const fallback = derivedFromGap();
    return {
        fit: fromAi.fit ?? fallback.fit!,
        feasibility: fromAi.feasibility ?? fallback.feasibility!,
        innovation: fromAi.innovation ?? fallback.innovation!,
        cost: fromAi.cost ?? fallback.cost!,
        risk: fromAi.risk ?? fallback.risk!,
    };
}

function buildScoresFromGap(solution: SelectedSolution): { scores: EvaluationScores; source: "gap-analysis" } | null {
    const gap = solution.gap_analysis;
    if (!gap) {
        return null;
    }

    const es = gap.evaluation_scores;
    if (
        es &&
        typeof es.impact === "number" &&
        typeof es.maturity === "number" &&
        typeof es.duration === "number" &&
        typeof es.expertise === "number"
    ) {
        // Risk: use backend-computed score when available, else derive from missing/resources
        const riskFromBackend = typeof es.risk === "number" ? clampScore(es.risk) : null;
        const riskDerived = clampScore(5 - (gap.features_missing.length * 0.4) - (gap.resources_needed.length * 0.3));
        return {
            scores: {
                fit: clampScore(es.impact),
                feasibility: clampScore(es.maturity),
                cost: clampScore(es.duration),
                innovation: clampScore(es.expertise),
                risk: riskFromBackend ?? riskDerived,
            },
            source: "gap-analysis",
        };
    }

    const matching = gap.features_matching.length;
    const missing = gap.features_missing.length;
    const resources = gap.resources_needed.length;

    const fit = clampScore(gap.fit_score / 2);
    const feasibility = clampScore(5 - (missing * 0.45) - (resources * 0.35) + (matching * 0.1));
    const cost = clampScore(5 - (resources * 0.4) - (missing * 0.2) + (matching * 0.05));
    const innovation = clampScore((gap.fit_score / 2.5) + Math.min(1, missing * 0.2) + Math.min(0.6, matching * 0.1));
    const risk = clampScore(5 - (missing * 0.4) - (resources * 0.3));

    return {
        scores: { fit, feasibility, cost, innovation, risk },
        source: "gap-analysis",
    };
}

function calculateIviScore(scores: EvaluationScores) {
    return round((
        scores.fit * 0.35 +
        scores.feasibility * 0.20 +
        scores.innovation * 0.20 +
        scores.cost * 0.10 +
        scores.risk * 0.15
    ) * 20);
}

function normalizeSolutions(value: unknown): SelectedSolution[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const candidate = item as Partial<SelectedSolution>;
        if (typeof candidate.id !== "string" || typeof candidate.name !== "string") return [];
        return [{
            id: candidate.id,
            name: candidate.name,
            relevance: typeof candidate.relevance === "number" ? candidate.relevance : 0,
            description: candidate.description,
            source: candidate.source,
            gap_analysis: candidate.gap_analysis || null,
        } satisfies SelectedSolution];
    });
}

function formatTimestamp(value: string | null) {
    if (!value) return "Not saved yet";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function sourceLabel(source: "gap-analysis") {
    return "AI gap-analysis";
}

function EvaluationPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const ipmId = searchParams.get("id") || undefined;
    const [solutions, setSolutions] = useState<SelectedSolution[]>([]);
    const [sg2State, setSg2State] = useState<Sg2State>({ cardStates: {}, totalSelected: 0 });
    const [activeId, setActiveId] = useState<string | null>(null);
    const [evaluationUpdatedAt, setEvaluationUpdatedAt] = useState<string | null>(null);

    useEffect(() => {
        let parsedSolutions: SelectedSolution[] = [];
        const savedSolutions = localStorage.getItem("ipm_selected_solutions");
        if (savedSolutions) {
            try {
                parsedSolutions = normalizeSolutions(JSON.parse(savedSolutions));
            } catch {
                parsedSolutions = [];
            }
        }

        const savedSg2State = localStorage.getItem("ipm_sg2_state");
        if (savedSg2State) {
            try {
                setSg2State(JSON.parse(savedSg2State) as Sg2State);
            } catch {
                setSg2State({ cardStates: {}, totalSelected: parsedSolutions.length });
            }
        } else {
            setSg2State({ cardStates: {}, totalSelected: parsedSolutions.length });
        }

        setSolutions(parsedSolutions);
        setActiveId(parsedSolutions[0]?.id || null);

        const savedEvaluation = localStorage.getItem("ipm_evaluation_state");
        if (savedEvaluation) {
            try {
                const parsed = JSON.parse(savedEvaluation) as { updated_at?: string };
                setEvaluationUpdatedAt(parsed.updated_at || null);
            } catch {
                setEvaluationUpdatedAt(null);
            }
        }
    }, []);

    const rows = useMemo(() => {
        return solutions
            .map((solution) => {
                const auto = buildScoresFromGap(solution);
                if (!auto) return null;
                return {
                    solution,
                    scores: auto.scores,
                    scoreJustifications: buildJustificationsFromGap(solution),
                    overall: calculateIviScore(auto.scores),
                    score_source: auto.source,
                };
            })
            .filter((row): row is NonNullable<typeof row> => row !== null)
            .sort((a, b) => b.overall - a.overall);
    }, [solutions]);

    useEffect(() => {
        if (!rows.length) return;
        setActiveId((current) => current && rows.some((row) => row.solution.id === current) ? current : rows[0].solution.id);
    }, [rows]);

    useEffect(() => {
        if (!rows.length) return;
        const updatedAt = new Date().toISOString();
        localStorage.setItem(
            "ipm_evaluation_state",
            JSON.stringify({
                activeId: activeId || rows[0].solution.id,
                rows: rows.map((row) => ({
                    id: row.solution.id,
                    name: row.solution.name,
                    relevance: row.solution.relevance,
                    overall: row.overall,
                    scores: row.scores,
                    scoreJustifications: row.scoreJustifications,
                    score_source: row.score_source,
                    description: row.solution.description,
                })),
                updated_at: updatedAt,
            }),
        );
        setEvaluationUpdatedAt(updatedAt);
    }, [activeId, rows]);

    const evaluationSolutions: EvaluationSolution[] = rows.map((row, index) => ({
        id: row.solution.id,
        name: row.solution.name,
        relevance: row.solution.relevance,
        overall: row.overall,
        scores: row.scores,
        scoreJustifications: row.scoreJustifications,
        description: row.solution.description,
        status: index === 0 ? "Best candidate" : index === 1 ? "Qualified option" : "Needs validation",
        scoreSource: sourceLabel(row.score_source),
    }));
    const selectedCount = rows.length || sg2State.totalSelected;
    const readyForSelection = Boolean(ipmId) && rows.length > 0;

    const proceedToSelection = () => {
        if (!ipmId || selectedCount === 0) return;
        router.push(`/selection?id=${ipmId}`);
    };

    const handleStepClick = createFlowStepClickHandler(router, ipmId);

    const isLoadingScores = solutions.length > 0 && rows.length === 0;

    return (
        <IpmFlowShell workflowState="evaluation" onStepClick={handleStepClick}>
            {isLoadingScores ? (
                <PhaseLoading
                    phase="qualification"
                    variant="stack"
                    cardCount={solutions.length}
                    label="Loading IVI scores from gap analysis..."
                />
            ) : (
            <EvaluationStep
                solutions={evaluationSolutions}
                activeId={activeId}
                onActiveChange={setActiveId}
                onBack={() => router.push(ipmId ? `/discovery?id=${ipmId}` : "/discovery")}
                onContinue={proceedToSelection}
                canContinue={readyForSelection}
                hasInitiative={Boolean(ipmId)}
            />
            )}
        </IpmFlowShell>
    );
}

export default function EvaluationPage() {
    return (
        <Suspense fallback={<PhaseLoading phase="qualification" variant="page" label="Loading evaluation..." />}>
            <EvaluationPageContent />
        </Suspense>
    );
}

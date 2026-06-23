"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAnalyze } from "@/hooks/useAnalyze";
import { createNeed, getBackendHealth, getGapAnalysis, getNeed, searchCatalog, updateNeedStatus } from "@/lib/api";
import { BusinessNeedStep } from "@/components/sourcing/BusinessNeedStep";
import {
    DiscoveryStep,
    type DiscoverySolution,
    type SolutionAlignment,
} from "@/components/sourcing/DiscoveryStep";
import { DuplicateBanner } from "@/components/sourcing/DuplicateBanner";
import { StageGateValidation } from "@/components/sourcing/StageGateValidation";
import { SummaryPanel } from "@/components/sourcing/SummaryPanel";
import {
    type SourcingFlowState,
    type SourcingWorkflowStepId,
} from "@/components/sourcing/SourcingWorkflowProgress";
import { IpmFlowShell } from "@/components/sourcing/IpmFlowShell";
import type { BusinessNeed, CatalogProduct, DuplicateMatch, GapAnalysisResponse, Horizon, Objective, Origin, Status } from "@/lib/types";
import { formatImpactLabel, HORIZON_LABELS, OBJECTIVE_LABELS, ORIGIN_LABELS } from "@/lib/types";

const GENERIC_ALIGNMENT: SolutionAlignment = {
    covered: [
        "Surfaces relevant catalog capabilities",
        "Supports solution comparison",
        "Connects need to reusable assets",
    ],
    missing: [
        { label: "Requires deeper fit assessment", effort: "Medium Effort" },
        { label: "Implementation detail must be confirmed", effort: "Medium Effort" },
    ],
    enablers: [
        { label: "Business context", icon: "people" },
        { label: "Data availability", icon: "data" },
        { label: "Technical owner validation", icon: "ai" },
    ],
};

function formatDomainLabel(value: string) {
    return value.trim().toUpperCase() === "AI" ? "AI" : value.trim();
}

function reverseLookup<T extends string>(labels: Record<T, string>, label: string) {
    const normalized = label.trim().toLowerCase();
    const match = (Object.entries(labels) as Array<[T, string]>)
        .find(([, value]) => value.trim().toLowerCase() === normalized);
    return match?.[0] ?? null;
}

function splitSummaryValues(value: string) {
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function titleCase(value: string) {
    return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function mapCatalogProducts(products: CatalogProduct[]): DiscoverySolution[] {
    return products.slice(0, 3).map((product, index) => {
        const rawScore = Number(product.relevance_score ?? 50);
        const score = rawScore <= 1 ? rawScore * 100 : rawScore;

        return {
            id: product.id || `catalog-${index + 1}`,
            title: product.name || `Catalog Solution ${index + 1}`,
            description: product.description || "Catalog solution aligned to the submitted business need ...",
            score: Math.max(0, Math.min(100, Math.round(score))),
            badge: index === 0 ? "Most relevant" : undefined,
            tags: [
                product.ai_type,
                product.maturity_level || product.maturity,
                product.domain,
            ].filter(Boolean).slice(0, 3) as string[],
            alignment: GENERIC_ALIGNMENT,
            catalogProduct: product,
            isBackendResult: true,
        };
    });
}

function effortForMissing(index: number): "Low Effort" | "Medium Effort" | "High Effort" {
    if (index === 0) return "Medium Effort";
    if (index === 1) return "High Effort";
    return "Low Effort";
}

function iconForEnabler(value: string): SolutionAlignment["enablers"][number]["icon"] {
    const normalized = value.toLowerCase();
    if (normalized.includes("data") || normalized.includes("db") || normalized.includes("lake")) return "data";
    if (normalized.includes("ai") || normalized.includes("model") || normalized.includes("openai")) return "ai";
    if (normalized.includes("kpi") || normalized.includes("metric") || normalized.includes("process")) return "kpi";
    return "people";
}

function alignmentFromGap(gap: GapAnalysisResponse): SolutionAlignment {
    return {
        covered: gap.features_matching.length > 0
            ? gap.features_matching.slice(0, 4)
            : ["Catalog capabilities align with the submitted business need"],
        missing: gap.features_missing.slice(0, 4).map((label, index) => ({
            label,
            effort: effortForMissing(index),
        })),
        enablers: gap.resources_needed.slice(0, 4).map((label) => ({
            label,
            icon: iconForEnabler(label),
        })),
        risks: gap.risks,
        fitScore: gap.fit_score,
        fitJustification: gap.fit_justification,
        evaluationScores: gap.evaluation_scores,
    };
}

function gapPayloadFromSolution(solution: DiscoverySolution) {
    const alignment = solution.alignment;

    return {
        features_matching: alignment.covered,
        features_missing: alignment.missing.map((item) => item.label),
        resources_needed: alignment.enablers.map((item) => item.label),
        risks: alignment.risks ?? [],
        fit_score: alignment.fitScore ?? Math.max(1, Math.min(10, Math.round(solution.score / 10))),
        fit_justification: alignment.fitJustification ?? "Selected from Discovery alignment.",
        evaluation_scores: alignment.evaluationScores,
    };
}

function selectedSolutionPayload(solution: DiscoverySolution) {
    return {
        id: solution.id,
        name: solution.title,
        description: solution.description,
        relevance: solution.score,
        source: solution.isBackendResult ? "DXC Internal Catalog" : "Catalog",
        gap_analysis: gapPayloadFromSolution(solution),
    };
}

function workflowStateFromNeedStatus(status: Status | undefined, fallback: SourcingFlowState): SourcingFlowState {
    if (VALIDATION_FLOW_STATES.includes(fallback)) {
        return fallback;
    }

    if (!status || status === "draft" || status === "rework" || status === "abandoned") return fallback;
    if (status === "submitted") return "discovery";
    if (status === "solutions_reviewed") return "evaluation";
    if (status === "in_qualification") return "selection";
    if (status === "selected" || status === "delivery") return "recommendations";
    return fallback;
}

const VALIDATION_FLOW_STATES: SourcingFlowState[] = [
    "sg1_validation",
    "sg2_validation",
    "sg3_validation",
    "sg4_validation",
];

function sourcingStateFromNeedStatus(
    status: Status | undefined,
    currentState: SourcingFlowState
): SourcingFlowState | null {
    if (VALIDATION_FLOW_STATES.includes(currentState)) {
        return null;
    }

    if (!status || status === "draft" || status === "rework") return "business_need";
    if (status === "submitted") return "discovery";
    if (status === "solutions_reviewed" || status === "in_qualification") return "evaluation";
    if (status === "selected" || status === "delivery") return "recommendations";
    return null;
}

function isPastDiscoveryStatus(status: Status | undefined) {
    return status === "solutions_reviewed"
        || status === "in_qualification"
        || status === "selected"
        || status === "delivery";
}

function applyNeedSummary(
    need: BusinessNeed,
    setSummaryObjective: (value: string) => void,
    setSummaryDomains: (value: string) => void,
    setSummaryImpact: (value: string) => void,
    setSummaryOrigin: (value: string) => void
) {
    setSummaryObjective(need.tags?.objective?.value ? OBJECTIVE_LABELS[need.tags.objective.value] : "");
    setSummaryDomains(
        need.tags?.domain && need.tags.domain.length > 0
            ? need.tags.domain.map((domain) => formatDomainLabel(domain.value)).join(", ")
            : ""
    );
    setSummaryImpact(
        need.tags?.impact && need.tags.impact.length > 0
            ? need.tags.impact.map((impact) => formatImpactLabel(impact.value)).join(", ")
            : ""
    );
    setSummaryOrigin(need.tags?.origin?.value ? ORIGIN_LABELS[need.tags.origin.value] : "");
}

export function SourcingShell({
    initialNeedId,
    initialState = "business_need",
}: {
    initialNeedId?: string;
    initialState?: SourcingFlowState;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const createNeedPromiseRef = useRef<Promise<BusinessNeed | null> | null>(null);
    const [pitch, setPitch] = useState("");
    const [horizon, setHorizon] = useState<Horizon | null>(null);
    const [currentSourcingState, setCurrentSourcingState] = useState<SourcingFlowState>(initialState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
    const [showDuplicates, setShowDuplicates] = useState(false);

    const [summaryObjective, setSummaryObjective] = useState("");
    const [summaryDomains, setSummaryDomains] = useState("");
    const [summaryImpact, setSummaryImpact] = useState("");
    const [summaryOrigin, setSummaryOrigin] = useState("");

    const [currentNeed, setCurrentNeed] = useState<BusinessNeed | null>(null);
    const [discoveryLaunched, setDiscoveryLaunched] = useState(false);
    const [isLaunchingDiscovery, setIsLaunchingDiscovery] = useState(false);
    const [discoverySolutions, setDiscoverySolutions] = useState<DiscoverySolution[]>([]);
    const [selectedSolutionIds, setSelectedSolutionIds] = useState<Set<string>>(new Set());
    const [focusedSolutionId, setFocusedSolutionId] = useState<string | null>(null);
    const [discoveryLoadError, setDiscoveryLoadError] = useState<string | null>(null);
    const [isAnalyzingAlignment, setIsAnalyzingAlignment] = useState(false);
    const [isTakingSolution, setIsTakingSolution] = useState(false);

    const focusedSolution = focusedSolutionId
        ? discoverySolutions.find((solution) => solution.id === focusedSolutionId) ?? null
        : null;
    const selectedSolutions = discoverySolutions.filter((solution) => selectedSolutionIds.has(solution.id));

    const {
        tags,
        suggestions,
        isTagging,
        isSuggesting,
        error: analyzeError,
        requestImmediateAnalysis,
    } = useAnalyze(pitch, horizon);

    useEffect(() => {
        if (!initialNeedId) return;

        let isCurrent = true;
        void getNeed(initialNeedId)
            .then((need) => {
                if (!isCurrent) return;

                setCurrentNeed(need);
                setPitch(need.pitch ?? "");
                setHorizon(need.horizon ?? null);
                applyNeedSummary(need, setSummaryObjective, setSummaryDomains, setSummaryImpact, setSummaryOrigin);

                setCurrentSourcingState((prev) => {
                    const restoredSourcingState = sourcingStateFromNeedStatus(need.status, prev);
                    return restoredSourcingState ?? prev;
                });
            })
            .catch(() => {
                // Keep local-first sourcing usable if the backend record cannot be loaded.
            });

        return () => {
            isCurrent = false;
        };
    }, [initialNeedId]);

    useEffect(() => {
        if (!currentNeed || pathname !== "/discovery") return;
        if (!isPastDiscoveryStatus(currentNeed.status)) return;

        router.replace(currentNeed ? `/evaluation?id=${currentNeed.id}` : "/evaluation");
    }, [currentNeed, pathname, router]);

    useEffect(() => {
        if (!tags) {
            setSummaryObjective("");
            setSummaryDomains("");
            setSummaryImpact("");
            setSummaryOrigin("");
            return;
        }

        if (tags.objective?.value) {
            setSummaryObjective(OBJECTIVE_LABELS[tags.objective.value]);
        }
        if (tags.domain && tags.domain.length > 0) {
            setSummaryDomains(tags.domain.map((domain) => formatDomainLabel(domain.value)).join(", "));
        }
        if (tags.impact && tags.impact.length > 0) {
            setSummaryImpact(tags.impact.map((impact) => formatImpactLabel(impact.value)).join(", "));
        }
        if (tags.origin?.value) {
            setSummaryOrigin(ORIGIN_LABELS[tags.origin.value]);
        }
    }, [tags]);

    const workflowProgressState = workflowStateFromNeedStatus(currentNeed?.status, currentSourcingState);
    const canContinue = pitch.trim().length >= 20 && horizon !== null && !isSubmitting;

    const createNeedIfPossible = async () => {
        if (!horizon || currentNeed) return currentNeed;
        if (createNeedPromiseRef.current) return createNeedPromiseRef.current;

        createNeedPromiseRef.current = (async () => {
            const domainValues = splitSummaryValues(summaryDomains);
            const impactValues = splitSummaryValues(summaryImpact);
            const objectiveValue = reverseLookup<Objective>(OBJECTIVE_LABELS, summaryObjective);
            const originValue = reverseLookup<Origin>(ORIGIN_LABELS, summaryOrigin);
            const confidenceByDomain = new Map(
                tags?.domain.map((domain) => [formatDomainLabel(domain.value).trim().toLowerCase(), domain.confidence])
            );
            const confidenceByImpact = new Map(
                tags?.impact.flatMap((impact) => [
                    [impact.value.trim().toLowerCase(), impact.confidence] as const,
                    [formatImpactLabel(impact.value).trim().toLowerCase(), impact.confidence] as const,
                ])
            );
            const precomputedTags = !isTagging && !analyzeError && tags
                ? {
                    ...tags,
                    objective: objectiveValue
                        ? {
                            value: objectiveValue,
                            confidence: summaryObjective === (tags.objective?.value ? OBJECTIVE_LABELS[tags.objective.value] : "") ? tags.objective.confidence : "low",
                        }
                        : tags.objective,
                    domain: domainValues.length > 0
                        ? domainValues.map((domain) => ({
                            value: domain,
                            confidence: confidenceByDomain.get(domain.toLowerCase()) ?? "low",
                        }))
                        : tags.domain,
                    impact: impactValues.length > 0
                        ? impactValues.map((impact) => ({
                            value: impact,
                            confidence: confidenceByImpact.get(impact.toLowerCase()) ?? "low",
                        }))
                        : tags.impact,
                    origin: originValue
                        ? {
                            value: originValue,
                            confidence: summaryOrigin === (tags.origin?.value ? ORIGIN_LABELS[tags.origin.value] : "") ? tags.origin.confidence : "low",
                        }
                        : tags.origin,
                }
                : undefined;

            const need = await createNeed({ pitch: pitch.trim(), horizon, tags: precomputedTags });
            setCurrentNeed(need);

            if (need.duplicate_matches && need.duplicate_matches.length > 0) {
                setDuplicates(need.duplicate_matches);
                setShowDuplicates(true);
            }

            return need;
        })();

        try {
            return await createNeedPromiseRef.current;
        } finally {
            createNeedPromiseRef.current = null;
        }
    };

    const handleContinueToSg1 = () => {
        if (!canContinue) return;

        setCurrentSourcingState("sg1_validation");
        void createNeedIfPossible().catch(() => {
            // Keep the UI moving with local state if the backend is temporarily unavailable.
        });
    };

    const handleValidateStageGate = () => {
        setShowDuplicates(false);
        setCurrentSourcingState("discovery");
        setDiscoveryLaunched(false);
        setSelectedSolutionIds(new Set());
        setFocusedSolutionId(null);

        void (async () => {
            try {
                const need = currentNeed ?? await createNeedIfPossible();
                if (need) {
                    const updated = await updateNeedStatus(need.id, { status: "submitted" });
                    setCurrentNeed(updated);
                }
            } catch {
                // Discovery can still launch if the status transition is temporarily unavailable.
            }
        })();
    };

    const handleAnalyzedStatusClick = () => {
        setCurrentSourcingState("business_need");
        setTimeout(() => {
            const el = document.getElementById("pitch-input") as HTMLTextAreaElement | null;
            el?.focus();
        }, 0);
    };

    const handleDuplicateStatusClick = () => {
        if (duplicates.length > 0) {
            setShowDuplicates(true);
        }
    };

    const handleLaunchDiscovery = async () => {
        setIsLaunchingDiscovery(true);
        setDiscoveryLoadError(null);
        setDiscoveryLaunched(true);
        setSelectedSolutionIds(new Set());
        setFocusedSolutionId(null);
        setDiscoverySolutions([]);

        try {
            await getBackendHealth();
            const need = currentNeed ?? await createNeedIfPossible();
            if (!need) {
                setDiscoveryLoadError("Unable to load catalog results. Save the business need and try again.");
                return;
            }

            const response = await searchCatalog(need.id);
            const mappedSolutions = mapCatalogProducts(response.results);
            if (mappedSolutions.length === 0) {
                setDiscoveryLoadError("No catalog solutions matched this business need.");
                return;
            }

            setDiscoverySolutions(mappedSolutions);
        } catch {
            setDiscoveryLoadError("Unable to reach the catalog service. Please try again.");
        } finally {
            setIsLaunchingDiscovery(false);
        }
    };

    const handleToggleSolution = async (solution: DiscoverySolution) => {
        const wasSelected = selectedSolutionIds.has(solution.id);

        setSelectedSolutionIds((prev) => {
            const next = new Set(prev);
            if (wasSelected) next.delete(solution.id);
            else next.add(solution.id);
            return next;
        });

        if (wasSelected) {
            const remaining = Array.from(selectedSolutionIds).filter((id) => id !== solution.id);
            setFocusedSolutionId((current) => {
                if (current !== solution.id) return current;
                return remaining.length > 0 ? remaining[remaining.length - 1] : null;
            });
            return;
        }

        setFocusedSolutionId(solution.id);

        if (!currentNeed || !solution.catalogProduct) return;

        setIsAnalyzingAlignment(true);
        try {
            const gap = await getGapAnalysis(currentNeed.id, solution.catalogProduct);
            const enrichedSolution: DiscoverySolution = {
                ...solution,
                alignment: alignmentFromGap(gap),
                title: gap.solution_name || solution.title,
            };
            setFocusedSolutionId(enrichedSolution.id);
            setDiscoverySolutions((items) =>
                items.map((item) => item.id === solution.id ? enrichedSolution : item)
            );
        } catch {
            setDiscoveryLoadError("Unable to analyze alignment for this solution. Please try again.");
        } finally {
            setIsAnalyzingAlignment(false);
        }
    };

    const handleTakeSolution = async () => {
        if (selectedSolutions.length === 0) return;

        setIsTakingSolution(true);
        try {
            const need = currentNeed ?? await createNeedIfPossible().catch(() => null);
            const payload = selectedSolutions.map(selectedSolutionPayload);

            window.localStorage.setItem("ipm_selected_solutions", JSON.stringify(payload));
            window.localStorage.setItem(
                "ipm_sg2_state",
                JSON.stringify({
                    cardStates: Object.fromEntries(selectedSolutions.map((solution) => [solution.id, "go"])),
                    totalSelected: selectedSolutions.length,
                })
            );

            if (need) {
                try {
                    const updated = await updateNeedStatus(need.id, { status: "solutions_reviewed" });
                    setCurrentNeed(updated);
                } catch {
                    // Keep navigation working even if the status transition is temporarily unavailable.
                }
            }

            setCurrentSourcingState("sg2_validation");
        } finally {
            setIsTakingSolution(false);
        }
    };

    const handleValidateSg2 = () => {
        setCurrentSourcingState("evaluation");
        void (async () => {
            if (currentNeed) {
                try {
                    const updated = await updateNeedStatus(currentNeed.id, { status: "in_qualification" });
                    setCurrentNeed(updated);
                } catch {
                    // Navigation can still proceed if the status transition is temporarily unavailable.
                }
            }
            router.push(pathWithNeed("/evaluation"));
        })();
    };

    const pathWithNeed = (path: string) => currentNeed ? `${path}?id=${currentNeed.id}` : path;

    const handleWorkflowStepClick = (stepId: SourcingWorkflowStepId) => {
        if (stepId === "business_need") {
            setCurrentSourcingState("business_need");
            return;
        }

        if (stepId === "discovery") {
            if (currentSourcingState !== "discovery") {
                setCurrentSourcingState(horizon ? "discovery" : "business_need");
            }
            return;
        }

        if (stepId === "evaluation") {
            if (selectedSolutions.length > 0) {
                void handleTakeSolution();
                return;
            }
            router.push(pathWithNeed("/evaluation"));
            return;
        }

        if (stepId === "selection") {
            router.push(pathWithNeed("/selection"));
            return;
        }

        router.push(pathWithNeed("/recos"));
    };

    const renderMainState = () => {
        if (currentSourcingState === "sg1_validation") {
            return (
                <StageGateValidation
                    gateId="SG-1"
                    phase="sourcing"
                    title="Validation of Business Need"
                    subtitle="Review and confirm the business need before proceeding to discovery"
                    summaryItems={[
                        { label: "OBJECTIVE", value: summaryObjective || "Pending" },
                        { label: "DOMAINS", value: summaryDomains || "Pending" },
                        { label: "IMPACT", value: summaryImpact || "Pending" },
                        { label: "ORIGIN", value: summaryOrigin || "Pending" },
                        { label: "TIME HORIZON", value: horizon ? titleCase(HORIZON_LABELS[horizon].label) : "Not selected" },
                    ]}
                    checklistItems={[
                        {
                            label: "Business need fully analyzed",
                            completed: horizon !== null && pitch.trim().length > 20 && summaryObjective.trim() !== "" && summaryDomains.trim() !== "" && summaryImpact.trim() !== "" && summaryOrigin.trim() !== "",
                            onClick: handleAnalyzedStatusClick,
                        },
                        {
                            label: duplicates.length > 0 ? "Potential duplicate detected" : "No duplicate detected",
                            completed: duplicates.length === 0,
                            onClick: handleDuplicateStatusClick,
                        },
                    ]}
                    isProcessing={isSubmitting}
                    onBack={() => setCurrentSourcingState("business_need")}
                    onValidate={handleValidateStageGate}
                    disabledReason={duplicates.length > 0 ? "Resolve duplicate matches before validating SG-1." : "Complete all checklist items before validating SG-1."}
                />
            );
        }

        if (currentSourcingState === "sg2_validation") {
            const primary = focusedSolution ?? selectedSolutions[0] ?? null;
            const selectedNames = selectedSolutions.map((solution) => solution.title).join(", ");
            return (
                <StageGateValidation
                    gateId="SG-2"
                    phase="qualification"
                    title="Validation of Discovery"
                    subtitle="Review discovered solutions and alignment before moving to evaluation"
                    summaryItems={[
                        { label: "SELECTED SOLUTIONS", value: selectedNames || "None selected" },
                        { label: "COUNT", value: selectedSolutions.length > 0 ? String(selectedSolutions.length) : "Pending" },
                        { label: "FIT SCORE", value: primary?.alignment.fitScore !== undefined ? `${primary.alignment.fitScore}/10` : primary ? `${primary.score}%` : "Pending" },
                        { label: "COVERED CAPABILITIES", value: primary?.alignment.covered.length ?? "Pending" },
                        { label: "MISSING CAPABILITIES", value: primary?.alignment.missing.length ?? "Pending" },
                    ]}
                    checklistItems={[
                        { label: "Discovery completed", completed: true },
                        { label: "At least one solution shortlisted", completed: selectedSolutions.length > 0 },
                        { label: "Business need alignment reviewed", completed: selectedSolutions.length > 0 },
                    ]}
                    onBack={() => setCurrentSourcingState("discovery")}
                    onValidate={handleValidateSg2}
                    isValidateDisabled={selectedSolutions.length === 0}
                    disabledReason={selectedSolutions.length === 0 ? "Select at least one solution before validating SG-2." : undefined}
                />
            );
        }

        if (currentSourcingState === "discovery") {
            return (
                <DiscoveryStep
                    discoveryLaunched={discoveryLaunched}
                    isLaunching={isLaunchingDiscovery}
                    solutions={discoverySolutions}
                    selectedSolutionIds={selectedSolutionIds}
                    focusedSolution={focusedSolution}
                    loadError={discoveryLoadError}
                    isAligning={isAnalyzingAlignment}
                    isTaking={isTakingSolution}
                    onLaunch={handleLaunchDiscovery}
                    onCloseResults={() => {
                        setDiscoveryLaunched(false);
                        setSelectedSolutionIds(new Set());
                        setFocusedSolutionId(null);
                    }}
                    onToggleSolution={handleToggleSolution}
                    onTakeSolution={handleTakeSolution}
                />
            );
        }

        return (
            <section className="ipm-sourcing-workspace">
                <div className="ipm-step-column">
                    <h2 className="ipm-step-title">
                        STEP 1 - <span>BUSINESS NEED</span>
                    </h2>

                    <BusinessNeedStep
                        horizon={horizon}
                        pitch={pitch}
                        suggestions={suggestions}
                        isAnalyzing={isTagging || isSuggesting}
                        error={analyzeError}
                        canContinue={canContinue}
                        isSubmitting={isSubmitting}
                        onHorizonChange={(value) => {
                            setHorizon(value);
                            requestImmediateAnalysis();
                        }}
                        onPitchChange={setPitch}
                        onPitchApply={requestImmediateAnalysis}
                        onNext={handleContinueToSg1}
                    />
                </div>

                <SummaryPanel
                    tags={tags}
                    isLoading={isTagging || isSuggesting}
                    objectiveLabel={summaryObjective}
                    domainsLabel={summaryDomains}
                    impactLabel={summaryImpact}
                    originLabel={summaryOrigin}
                    onObjectiveChange={setSummaryObjective}
                    onDomainsChange={setSummaryDomains}
                    onImpactChange={setSummaryImpact}
                    onOriginChange={setSummaryOrigin}
                />
            </section>
        );
    };

    return (
        <IpmFlowShell workflowState={workflowProgressState} onStepClick={handleWorkflowStepClick}>
            {showDuplicates && duplicates.length > 0 && (
                <DuplicateBanner
                    matches={duplicates}
                    onDismiss={() => setShowDuplicates(false)}
                    onViewDuplicate={(id) => {
                        setShowDuplicates(false);
                        void getNeed(id)
                            .then((need) => {
                                if (isPastDiscoveryStatus(need.status)) {
                                    router.push(`/evaluation?id=${id}`);
                                    return;
                                }
                                router.push(`/discovery?id=${id}&sg1=completed`);
                            })
                            .catch(() => {
                                router.push(`/discovery?id=${id}&sg1=completed`);
                            });
                    }}
                />
            )}

            {renderMainState()}
        </IpmFlowShell>
    );
}

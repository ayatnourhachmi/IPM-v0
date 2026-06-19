"use client";

import { BusinessNeedAlignment } from "@/components/sourcing/BusinessNeedAlignment";
import { PhaseLoading } from "@/components/sourcing/PhaseLoading";
import { SolutionCard } from "@/components/sourcing/SolutionCard";
import type { CatalogProduct, EvaluationScores, RiskItem } from "@/lib/types";

export interface SolutionAlignment {
    covered: string[];
    missing: Array<{ label: string; effort?: "Low Effort" | "Medium Effort" | "High Effort" }>;
    enablers: Array<{ label: string; icon: "people" | "data" | "ai" | "kpi" }>;
    risks?: RiskItem[];
    fitScore?: number;
    fitJustification?: string;
    evaluationScores?: EvaluationScores;
}

export interface DiscoverySolution {
    id: string;
    title: string;
    description: string;
    score: number;
    badge?: string;
    tags?: string[];
    alignment: SolutionAlignment;
    catalogProduct?: CatalogProduct;
    isBackendResult?: boolean;
}

interface DiscoveryStepProps {
    discoveryLaunched: boolean;
    isLaunching: boolean;
    solutions: DiscoverySolution[];
    selectedSolutionIds: Set<string>;
    focusedSolution: DiscoverySolution | null;
    loadError: string | null;
    isAligning?: boolean;
    isTaking?: boolean;
    onLaunch: () => void;
    onCloseResults: () => void;
    onToggleSolution: (solution: DiscoverySolution) => void;
    onTakeSolution: () => void;
}

export function DiscoveryStep({
    discoveryLaunched,
    isLaunching,
    solutions,
    selectedSolutionIds,
    focusedSolution,
    loadError,
    isAligning = false,
    isTaking = false,
    onLaunch,
    onCloseResults,
    onToggleSolution,
    onTakeSolution,
}: DiscoveryStepProps) {
    const selectedCount = selectedSolutionIds.size;
    const subtitle = discoveryLaunched
        ? "Select one or more solutions to see how well they align with your business needs"
        : "Launch tools to surface relevant solutions, and opportunities";
    const isLoadingResults = discoveryLaunched && isLaunching && solutions.length === 0;

    return (
        <section className="ipm-discovery-workspace">
            <div className="ipm-discovery-tools">
                <h2 className="ipm-step-title">
                    STEP 2 - <span>DISCOVERY</span>
                </h2>
                <p className="ipm-step-subtitle">{subtitle}</p>

                {!discoveryLaunched ? (
                    <>
                        <div className="ipm-discovery-launch-card">
                            <div>
                                <h3>DXC Internal Catalog</h3>
                                <p>Search DXC&apos;s internal AI product catalog for existing solutions</p>
                            </div>
                            <button type="button" className="ipm-primary-action" disabled={isLaunching} onClick={onLaunch}>
                                {isLaunching ? "LOADING..." : "LAUNCH TOOL"}
                            </button>
                        </div>
                        {isLaunching && (
                            <PhaseLoading phase="sourcing" label="Searching the DXC catalog..." />
                        )}

                        <div className="ipm-external-tools">
                            <p>For more exploration, you can check these external tools</p>
                            <button type="button" className="ipm-external-tool">
                                Open StartupConnect AI <span aria-hidden="true">&#8599;</span>
                            </button>
                            <button type="button" className="ipm-external-tool">
                                Open AI Watch <span aria-hidden="true">&#8599;</span>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="ipm-results-panel">
                        <button type="button" className="ipm-results-close" aria-label="Close results" onClick={onCloseResults}>
                            x
                        </button>
                        {loadError && (
                            <div className="ipm-analyze-error" role="alert">
                                {loadError}
                            </div>
                        )}
                        {isLoadingResults ? (
                            <PhaseLoading
                                phase="sourcing"
                                variant="stack"
                                cardCount={3}
                                label="Searching the DXC catalog..."
                            />
                        ) : (
                            <div className="ipm-results-stack">
                                {solutions.map((solution) => (
                                    <SolutionCard
                                        key={solution.id}
                                        solution={solution}
                                        selected={selectedSolutionIds.has(solution.id)}
                                        onSelect={onToggleSolution}
                                    />
                                ))}
                            </div>
                        )}
                        {selectedCount > 0 && (
                            <button
                                type="button"
                                className="ipm-take-solution"
                                disabled={isTaking}
                                onClick={onTakeSolution}
                            >
                                {isTaking
                                    ? "OPENING..."
                                    : selectedCount === 1
                                        ? "TAKE IT"
                                        : `TAKE SELECTED (${selectedCount})`}
                            </button>
                        )}
                    </div>
                )}
            </div>

            <BusinessNeedAlignment selectedSolution={focusedSolution} isLoading={isAligning} />
        </section>
    );
}

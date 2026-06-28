"use client";

import { useEffect, useState } from "react";
import { AlignmentCard } from "@/components/sourcing/AlignmentCard";
import type { DiscoverySolution } from "@/components/sourcing/DiscoveryStep";
import { PhaseLoading } from "@/components/sourcing/PhaseLoading";

interface BusinessNeedAlignmentProps {
    selectedSolution: DiscoverySolution | null;
    isLoading?: boolean;
}

export function BusinessNeedAlignment({ selectedSolution, isLoading = false }: BusinessNeedAlignmentProps) {
    const alignment = selectedSolution?.alignment;
    const showAlignment = Boolean(selectedSolution) && !isLoading;
    const [showSecondaryCards, setShowSecondaryCards] = useState(false);

    const hasEnablers = (alignment?.enablers?.length ?? 0) > 0;
    const hasRisks = (alignment?.risks?.length ?? 0) > 0;
    const hasSecondaryCards = hasEnablers || hasRisks;

    useEffect(() => {
        setShowSecondaryCards(false);
    }, [selectedSolution?.id]);

    return (
        <aside className="ipm-discovery-alignment">
            <h2>BUSINESS NEED ALIGNMENT</h2>
            <p>Select one or more solutions to see how well they align with your business needs</p>
            {isLoading && (
                <PhaseLoading phase="sourcing" variant="skeleton" label="Analyzing solution alignment..." />
            )}
            {showAlignment && (
                <div className="ipm-alignment-stack-shell">
                    <div className="ipm-alignment-stack-viewport" aria-live="polite">
                        <div className="ipm-alignment-stack">
                            {!showSecondaryCards ? (
                                <>
                                    <AlignmentCard
                                        title="COVERED CAPABILITIES"
                                        variant="covered"
                                        covered={alignment?.covered ?? []}
                                        fitScore={alignment?.fitScore}
                                    />
                                    <AlignmentCard
                                        title="MISSING CAPABILITIES"
                                        variant="missing"
                                        missing={alignment?.missing ?? []}
                                    />
                                </>
                            ) : (
                                <>
                                    {hasEnablers && (
                                        <AlignmentCard
                                            title="REQUIRED ENABLERS"
                                            variant="enablers"
                                            enablers={alignment?.enablers ?? []}
                                        />
                                    )}
                                    {hasRisks && (
                                        <AlignmentCard
                                            title="RISKS"
                                            variant="risks"
                                            risks={alignment?.risks ?? []}
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                    {hasSecondaryCards && (
                        <button
                            type="button"
                            className="ipm-alignment-stack-nav"
                            onClick={() => setShowSecondaryCards((current) => !current)}
                            aria-label={
                                showSecondaryCards
                                    ? "Show covered and missing capabilities"
                                    : "Show required enablers and risks"
                            }
                        >
                            <svg
                                viewBox="0 0 20 20"
                                width="18"
                                height="18"
                                aria-hidden="true"
                                className={showSecondaryCards ? "is-flipped" : undefined}
                            >
                                <path
                                    d="M5 7.5L10 12.5L15 7.5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.75"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </button>
                    )}
                </div>
            )}
        </aside>
    );
}

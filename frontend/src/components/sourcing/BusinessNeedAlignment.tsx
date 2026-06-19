"use client";

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

    return (
        <aside className="ipm-discovery-alignment">
            <h2>BUSINESS NEED ALIGNMENT</h2>
            <p>Select one or more solutions to see how well they align with your business needs</p>
            {isLoading && (
                <PhaseLoading phase="sourcing" variant="skeleton" label="Analyzing solution alignment..." />
            )}
            {showAlignment && (
                <div className="ipm-alignment-stack">
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
                    <AlignmentCard
                        title="REQUIRED ENABLERS"
                        variant="enablers"
                        enablers={alignment?.enablers ?? []}
                    />
                    {alignment?.risks && alignment.risks.length > 0 && (
                        <AlignmentCard
                            title="RISKS"
                            variant="risks"
                            risks={alignment.risks}
                        />
                    )}
                </div>
            )}
        </aside>
    );
}

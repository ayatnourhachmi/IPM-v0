"use client";

import { useEffect, useState } from "react";
import type { SolutionRecommendations } from "@/lib/types";
import { RecommendationBundleCard } from "@/components/delivery/RecommendationBundleCard";
import { PhaseLoading } from "@/components/sourcing/PhaseLoading";

export type DeliverySolution = {
    id: string;
    name: string;
    relevance: number;
    overall: number;
};

export function DeliveryStep({
    deliverySolutions,
    recommendations,
    isGenerating,
    generationError,
    gateCleared,
    onValidateSg4,
    onContinueToExport,
}: {
    deliverySolutions: DeliverySolution[];
    recommendations: SolutionRecommendations[];
    isGenerating: boolean;
    generationError: string | null;
    gateCleared: boolean;
    onValidateSg4: () => void;
    onContinueToExport: () => void;
}) {
    const [activeIndex, setActiveIndex] = useState(0);
    const activeRecommendation = recommendations[activeIndex];
    const canGoPrev = activeIndex > 0;
    const canGoNext = activeIndex < recommendations.length - 1;

    useEffect(() => {
        setActiveIndex((current) => Math.min(current, Math.max(0, recommendations.length - 1)));
    }, [recommendations.length]);

    return (
        <section className="ipm-sourcing-workspace ipm-delivery-workspace">
            <aside className="ipm-summary-panel ipm-delivery-actions">
                <div className="qualification-card delivery-summary-card">
                    <div className="qualification-section-heading">Delivery board</div>
                    <p className="delivery-summary-copy">
                        {gateCleared
                            ? "Recommendation bundles are approved. Continue to PoC preparation to export or share."
                            : "Validate the recommendation bundles before moving to PoC preparation."}
                    </p>
                    <div className="decision-stats">
                        <span>
                            <strong>{deliverySolutions.length}</strong>
                            Solutions
                        </span>
                        <span>
                            <strong>{recommendations.length}</strong>
                            Bundles
                        </span>
                    </div>

                    <div className="qualification-actions delivery-board-actions">
                        {!gateCleared ? (
                            <button type="button" className="ipm-primary-action" onClick={onValidateSg4}>
                                Validate
                            </button>
                        ) : (
                            <button type="button" className="ipm-primary-action" onClick={onContinueToExport}>
                                Continue to PoC preparation
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            <div className="ipm-step-column">
                <h2 className="ipm-step-title">
                    STEP 5 - <span>RECOMMENDATIONS</span>
                </h2>
                <p className="ipm-step-subtitle">
                    Review AI-generated technical, organizational, and KPI recommendations for each solution moving to Delivery.
                </p>

                <div className="delivery-main">
                    {isGenerating && (
                        <PhaseLoading
                            phase="delivery"
                            variant="stack"
                            cardCount={Math.max(deliverySolutions.length, 2)}
                            label="Generating technical, organizational, and KPI recommendations..."
                        />
                    )}
                    {generationError && <div className="qualification-alert danger">{generationError}</div>}

                    {!isGenerating && activeRecommendation && (
                        <div className="delivery-rec-carousel">
                            {canGoPrev ? (
                                <button
                                    type="button"
                                    className="solution-nav-arrow solution-nav-arrow-prev"
                                    onClick={() => setActiveIndex((current) => Math.max(0, current - 1))}
                                    aria-label="Show previous recommendation bundle"
                                >
                                    &lt;
                                </button>
                            ) : (
                                <span className="solution-nav-spacer" aria-hidden="true" />
                            )}

                            <RecommendationBundleCard
                                key={activeRecommendation.solution_id}
                                rec={activeRecommendation}
                                solutionMeta={deliverySolutions.find((solution) => solution.id === activeRecommendation.solution_id)}
                            />

                            {canGoNext ? (
                                <button
                                    type="button"
                                    className="solution-nav-arrow solution-nav-arrow-next"
                                    onClick={() => setActiveIndex((current) => Math.min(recommendations.length - 1, current + 1))}
                                    aria-label="Show next recommendation bundle"
                                >
                                    &gt;
                                </button>
                            ) : (
                                <span className="solution-nav-spacer" aria-hidden="true" />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

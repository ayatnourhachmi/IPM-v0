"use client";

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
                </div>

                <div className="qualification-actions">
                    {!gateCleared ? (
                        <button type="button" className="ipm-primary-action" onClick={onValidateSg4}>
                            Validate SG-4
                        </button>
                    ) : (
                        <button type="button" className="ipm-primary-action" onClick={onContinueToExport}>
                            Continue to PoC preparation
                        </button>
                    )}
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

                    {!isGenerating && recommendations.map((rec) => (
                        <RecommendationBundleCard
                            key={rec.solution_id}
                            rec={rec}
                            solutionMeta={deliverySolutions.find((solution) => solution.id === rec.solution_id)}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}

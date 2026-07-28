"use client";

import type { DxcBuildability, ExternalSolutionResponse, GapAnalysisResponse } from "@/lib/types";

interface ExternalSolutionCardProps {
    solution: ExternalSolutionResponse;
    isRunningGapAnalysis: boolean;
    gapResult: GapAnalysisResponse | null;
    onRunGapAnalysis: () => void;
}

function BuildabilityBanner({ buildability }: { buildability: DxcBuildability }) {
    return (
        <div className={`ipm-buildability-banner${buildability.buildable ? " ipm-buildability-banner--positive" : " ipm-buildability-banner--cautious"}`}>
            <span className="ipm-buildability-badge">
                {buildability.buildable ? "DXC can build this" : "DXC capability gap"}
            </span>
            <p className="ipm-buildability-rationale">{buildability.rationale}</p>
            {buildability.closest_internal_reference && (
                <p className="ipm-buildability-ref">
                    Closest internal reference: <strong>{buildability.closest_internal_reference}</strong>
                </p>
            )}
        </div>
    );
}

export function ExternalSolutionCard({
    solution,
    isRunningGapAnalysis,
    gapResult,
    onRunGapAnalysis,
}: ExternalSolutionCardProps) {
    const hasGap = gapResult !== null;

    return (
        <div className="ipm-external-solution-card">
            <div className="ipm-external-solution-header">
                <span className="ipm-external-concept-badge">External / Concept</span>
                {solution.low_confidence && (
                    <span className="ipm-low-confidence-badge" title="Fewer than 2 reliable search results were available">
                        Low confidence
                    </span>
                )}
            </div>

            <h3 className="ipm-external-solution-name">{solution.solution_name}</h3>
            <p className="ipm-external-solution-description">{solution.solution_description}</p>

            {solution.solution_features.length > 0 && (
                <ul className="ipm-external-solution-features">
                    {solution.solution_features.map((feature) => (
                        <li key={feature}>{feature}</li>
                    ))}
                </ul>
            )}

            {solution.inspired_by.length > 0 && (
                <div className="ipm-external-inspired-by">
                    <span className="ipm-external-inspired-label">Inspired by:</span>
                    <div className="ipm-external-inspired-sources">
                        {solution.inspired_by.map((src) =>
                            src.url ? (
                                <a
                                    key={src.url}
                                    href={src.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ipm-external-source-link"
                                >
                                    {src.name} &#8599;
                                </a>
                            ) : (
                                <span key={src.name} className="ipm-external-source-name">
                                    {src.name}
                                </span>
                            )
                        )}
                    </div>
                </div>
            )}

            {hasGap ? (
                <div className="ipm-external-gap-results">
                    <div className="ipm-external-gap-score">
                        <span className="ipm-external-gap-score-label">Fit score</span>
                        <strong className="ipm-external-gap-score-value">{gapResult.fit_score}/10</strong>
                    </div>
                    {gapResult.fit_justification && (
                        <p className="ipm-external-gap-justification">{gapResult.fit_justification}</p>
                    )}
                    {gapResult.features_matching.length > 0 && (
                        <div className="ipm-external-gap-section">
                            <span className="ipm-external-gap-section-label">Matching capabilities</span>
                            <ul>
                                {gapResult.features_matching.map((f) => (
                                    <li key={f}>{f}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {gapResult.features_missing.length > 0 && (
                        <div className="ipm-external-gap-section">
                            <span className="ipm-external-gap-section-label">Gaps to address</span>
                            <ul>
                                {gapResult.features_missing.map((f) => (
                                    <li key={f}>{f}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {gapResult.dxc_buildability && (
                        <BuildabilityBanner buildability={gapResult.dxc_buildability} />
                    )}
                </div>
            ) : (
                <button
                    type="button"
                    className="ipm-external-gap-cta"
                    disabled={isRunningGapAnalysis}
                    onClick={onRunGapAnalysis}
                >
                    {isRunningGapAnalysis ? "ANALYZING..." : "RUN GAP ANALYSIS"}
                </button>
            )}
        </div>
    );
}

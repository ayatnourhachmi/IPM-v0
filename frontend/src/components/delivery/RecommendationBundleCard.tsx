"use client";

import { useState } from "react";
import type { SolutionRecommendations } from "@/lib/types";

type BundleTab = "technical" | "organizational" | "kpis";

export function RecommendationBundleCard({
    rec,
    solutionMeta,
}: {
    rec: SolutionRecommendations;
    solutionMeta?: {
        relevance: number;
        overall: number;
    };
}) {
    const [tab, setTab] = useState<BundleTab>("technical");
    const relevanceScore = solutionMeta ? Math.max(0, Math.min(100, Math.round(solutionMeta.relevance))) : 0;

    const tabs: Array<{ id: BundleTab; label: string; count: number }> = [
        { id: "technical", label: "Technical", count: rec.technical_recommendations.length },
        { id: "organizational", label: "Organizational", count: rec.organizational_recommendations.length },
        { id: "kpis", label: "KPIs", count: rec.kpis.length },
    ];

    return (
        <article className="qualification-card delivery-rec-card">
            <div className="delivery-rec-head">
                <div className="delivery-rec-title-block">
                    <span className="delivery-rec-kicker">Solution recommendation bundle</span>
                    <h3>{rec.solution_name}</h3>
                </div>
                {solutionMeta && (
                    <div className="delivery-rec-metrics" aria-label="Solution scores">
                        <div className="delivery-rec-metric">
                            <span
                                className="delivery-rec-score-ring delivery-rec-score-ring--relevance"
                                style={{
                                    background: `conic-gradient(var(--ipm-delivery-blue) ${relevanceScore}%, #e4e8f2 0)`,
                                }}
                            >
                                <span className="delivery-rec-score-inner">{relevanceScore}%</span>
                            </span>
                            <span className="delivery-rec-metric-label">Relevance</span>
                        </div>
                        <div className="delivery-rec-metric-divider" aria-hidden="true" />
                        <div className="delivery-rec-metric">
                            <span
                                className="delivery-rec-score-ring delivery-rec-score-ring--ivi"
                                style={{
                                    background: `conic-gradient(var(--ipm-delivery-blue-end) ${Math.round(solutionMeta.overall)}%, #e4e8f2 0)`,
                                }}
                            >
                                <span className="delivery-rec-score-inner">{solutionMeta.overall.toFixed(1)}</span>
                            </span>
                            <span className="delivery-rec-metric-label">IVI</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="delivery-rec-tabs" role="tablist" aria-label={`${rec.solution_name} recommendation sections`}>
                {tabs.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={tab === item.id}
                        className={`delivery-rec-tab${tab === item.id ? " is-active" : ""}`}
                        onClick={() => setTab(item.id)}
                    >
                        {item.label}
                        <span className="delivery-rec-tab-count">{item.count}</span>
                    </button>
                ))}
            </div>

            <div className="delivery-rec-panel" role="tabpanel">
                {tab === "technical" && (
                    <ol className="delivery-rec-list">
                        {rec.technical_recommendations.map((item, index) => (
                            <li key={`${rec.solution_id}-tech-${index}`}>
                                <span className="delivery-rec-index">{index + 1}</span>
                                <p>{item}</p>
                            </li>
                        ))}
                    </ol>
                )}

                {tab === "organizational" && (
                    <ol className="delivery-rec-list delivery-rec-list-org">
                        {rec.organizational_recommendations.map((item, index) => (
                            <li key={`${rec.solution_id}-org-${index}`}>
                                <span className="delivery-rec-index">{index + 1}</span>
                                <div className="delivery-rec-org-copy">
                                    <span className="delivery-role-chip">{item.role}</span>
                                    <p>{item.action}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                )}

                {tab === "kpis" && (
                    <div className="delivery-kpi-grid">
                        {rec.kpis.map((kpi, index) => (
                            <div key={`${rec.solution_id}-kpi-${index}`} className="delivery-kpi-item">
                                <strong>{kpi.name}</strong>
                                <span className="delivery-kpi-target">Target: {kpi.target}</span>
                                <span className="delivery-kpi-measure">Measure: {kpi.measurement_criteria}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </article>
    );
}

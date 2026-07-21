"use client";

import { useEffect, useState } from "react";
import { formatIviPercent } from "@/lib/scores";
import type { EvaluationSolution } from "./EvaluationStep";

export type SelectionSolution = EvaluationSolution & {
    fitScore: string;
    strength: string;
    risk: string;
    whySelected: string;
};

const SCORE_LABELS: Array<{ key: keyof EvaluationSolution["scores"]; label: string }> = [
    { key: "fit", label: "Impact" },
    { key: "feasibility", label: "Maturity" },
    { key: "innovation", label: "Expertise" },
    { key: "cost", label: "Duration" },
    { key: "risk", label: "Risk" },
];

const RADAR_CENTER = 70;
const RADAR_RADIUS = 42;
// Pentagon: 5 axes at -90°, -18°, 54°, 126°, 198° (clockwise from top)
const _deg = (d: number) => (d * Math.PI) / 180;
const RADAR_AXIS_POINTS = [
    { x: RADAR_CENTER + RADAR_RADIUS * Math.cos(_deg(-90)),  y: RADAR_CENTER + RADAR_RADIUS * Math.sin(_deg(-90))  }, // top – Impact
    { x: RADAR_CENTER + RADAR_RADIUS * Math.cos(_deg(-18)),  y: RADAR_CENTER + RADAR_RADIUS * Math.sin(_deg(-18))  }, // upper-right – Maturity
    { x: RADAR_CENTER + RADAR_RADIUS * Math.cos(_deg(54)),   y: RADAR_CENTER + RADAR_RADIUS * Math.sin(_deg(54))   }, // lower-right – Expertise
    { x: RADAR_CENTER + RADAR_RADIUS * Math.cos(_deg(126)),  y: RADAR_CENTER + RADAR_RADIUS * Math.sin(_deg(126))  }, // lower-left – Duration
    { x: RADAR_CENTER + RADAR_RADIUS * Math.cos(_deg(198)),  y: RADAR_CENTER + RADAR_RADIUS * Math.sin(_deg(198))  }, // upper-left – Risk
] as const;

function radarPoint(index: number, value: number) {
    const clamped = Math.min(5, Math.max(0, value));
    const scale = clamped / 5;
    const axis = RADAR_AXIS_POINTS[index];

    return {
        x: RADAR_CENTER + (axis.x - RADAR_CENTER) * scale,
        y: RADAR_CENTER + (axis.y - RADAR_CENTER) * scale,
    };
}

function pointsToString(points: Array<{ x: number; y: number }>) {
    return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
}

function SelectionRadarChart({ solution }: { solution: SelectionSolution }) {
    const scorePoints = SCORE_LABELS.map((score, index) => radarPoint(index, solution.scores[score.key]));
    const gridLevels = [1, 2, 3, 4, 5].map((level) => (
        <polygon
            key={level}
            className="selection-radar-grid-line"
            points={pointsToString(RADAR_AXIS_POINTS.map((_, index) => radarPoint(index, level)))}
        />
    ));

    return (
        <div className="selection-radar-wrap" aria-label="Dimension score radar chart">
            <svg className="selection-radar-chart" viewBox="0 0 140 140" role="img" aria-labelledby={`radar-title-${solution.id}`}>
                <title id={`radar-title-${solution.id}`}>
                    Impact {solution.scores.fit} of 5, Maturity {solution.scores.feasibility} of 5, Expertise {solution.scores.innovation} of 5, Duration {solution.scores.cost} of 5, Risk {solution.scores.risk ?? 3} of 5
                </title>
                {gridLevels}
                {RADAR_AXIS_POINTS.map((point, index) => (
                    <line
                        key={SCORE_LABELS[index].key}
                        className="selection-radar-axis"
                        x1={RADAR_CENTER}
                        y1={RADAR_CENTER}
                        x2={point.x}
                        y2={point.y}
                    />
                ))}
                <polygon className="selection-radar-area" points={pointsToString(scorePoints)} />
                <polyline className="selection-radar-line" points={`${pointsToString(scorePoints)} ${scorePoints[0].x.toFixed(1)},${scorePoints[0].y.toFixed(1)}`} />
                {scorePoints.map((point, index) => (
                    <circle
                        key={SCORE_LABELS[index].key}
                        className="selection-radar-dot"
                        cx={point.x}
                        cy={point.y}
                        r="3.2"
                    />
                ))}
            </svg>

            <div className="selection-radar-label selection-radar-label-top">
                <span>Impact</span>
                <strong>{solution.scores.fit}/5</strong>
            </div>
            <div className="selection-radar-label selection-radar-label-upper-right">
                <span>Maturity</span>
                <strong>{solution.scores.feasibility}/5</strong>
            </div>
            <div className="selection-radar-label selection-radar-label-lower-right">
                <span>Expertise</span>
                <strong>{solution.scores.innovation}/5</strong>
            </div>
            <div className="selection-radar-label selection-radar-label-lower-left">
                <span>Duration</span>
                <strong>{solution.scores.cost}/5</strong>
            </div>
            <div className="selection-radar-label selection-radar-label-upper-left">
                <span>Risk</span>
                <strong>{(solution.scores.risk ?? 3)}/5</strong>
            </div>
        </div>
    );
}

export function SelectableSolutionCard({
    solution,
    rank,
    selected,
    onSelect,
}: {
    solution: SelectionSolution;
    rank: number;
    selected: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            className={`qualification-card selectable-solution-card${selected ? " is-selected" : ""}`}
            onClick={onSelect}
        >
            <span className="solution-rank">#{rank}</span>
            <div className="selection-card-top">
                <div>
                    <div className="selection-title-row">
                        <h3>{solution.name}</h3>
                        <div className="selection-score-chips" aria-label={`${solution.name} scores`}>
                            <span>
                                <strong>{formatIviPercent(solution.overall)}</strong>
                                IVI
                            </span>
                            <span>
                                <strong>{solution.fitScore}</strong>
                                Fit
                            </span>
                        </div>
                    </div>
                    <p>{solution.whySelected}</p>
                </div>
                <span className={`selection-checkbox${selected ? " is-checked" : ""}`} aria-hidden="true" />
            </div>

            <SelectionRadarChart solution={solution} />
        </button>
    );
}

export function SelectedSolutionPanel({
    solutions,
    onBack,
    onValidate,
    canValidate,
    hasInitiative,
    transitionError,
}: {
    solutions: SelectionSolution[];
    onBack: () => void;
    onValidate: () => void;
    canValidate: boolean;
    hasInitiative: boolean;
    transitionError?: string | null;
}) {
    return (
        <aside className="ipm-summary-panel selected-solution-panel">
            <div className="qualification-card selected-panel-card">
                <div className="selected-panel-head">
                    <span className="qualification-section-heading">Selected solution{solutions.length === 1 ? "" : "s"}</span>
                    {solutions.length > 0 && <span className="selection-count-badge">{solutions.length}</span>}
                </div>
                {solutions.length > 0 ? (
                    <ul className="selected-solution-list">
                        {solutions.map((solution) => (
                            <li key={solution.id} className="selected-solution-item">
                                <h2>{solution.name}</h2>
                                <span className="selected-solution-ivi">
                                    <strong>{formatIviPercent(solution.overall)}</strong>
                                    IVI
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>Choose one or more candidates from the shortlist to prepare VC-3 validation.</p>
                )}
            </div>

            {!hasInitiative && (
                <div className="qualification-alert danger">Open a saved initiative before choosing delivery solutions.</div>
            )}

            {transitionError && (
                <div className="qualification-alert danger">{transitionError}</div>
            )}

            <button type="button" className="ipm-outline-action" onClick={onBack} disabled={!hasInitiative}>
                Back to Evaluation
            </button>
            <button type="button" className="ipm-primary-action" onClick={onValidate} disabled={!canValidate}>
                Validate
            </button>
        </aside>
    );
}

export function SelectionStep({
    solutions,
    selectedIds,
    onToggle,
    onBack,
    onValidate,
    canValidate,
    hasInitiative,
    transitionError,
}: {
    solutions: SelectionSolution[];
    selectedIds: Set<string>;
    onToggle: (id: string) => void;
    onBack: () => void;
    onValidate: () => void;
    canValidate: boolean;
    hasInitiative: boolean;
    transitionError?: string | null;
}) {
    const selectedSolutions = solutions.filter((solution) => selectedIds.has(solution.id));
    const [activeIndex, setActiveIndex] = useState(0);
    const activeSolution = solutions[activeIndex];
    const canGoPrev = activeIndex > 0;
    const canGoNext = activeIndex < solutions.length - 1;

    useEffect(() => {
        setActiveIndex((current) => Math.min(current, Math.max(0, solutions.length - 1)));
    }, [solutions.length]);

    return (
        <section className="ipm-sourcing-workspace ipm-qualification-workspace ipm-selection-workspace">
            <div className="ipm-step-column">
                <h2 className="ipm-step-title">
                    STEP 4 - <span>SELECTION</span>
                </h2>
                <p className="ipm-step-subtitle">
                    Use the IVI ranking to select one or more solutions that will move into Delivery recommendations.
                </p>

                <div className="qualification-main">
                    {solutions.length === 0 && (
                        <div className="qualification-alert warning">No auto-evaluated ranking found yet. Go back to Evaluation to generate the ranked result.</div>
                    )}

                    {activeSolution && (
                        <div className="selectable-list selection-solution-carousel">
                            {canGoPrev ? (
                                <button
                                    type="button"
                                    className="solution-nav-arrow solution-nav-arrow-prev"
                                    onClick={() => setActiveIndex((current) => Math.max(0, current - 1))}
                                    aria-label="Show previous solution"
                                >
                                    &lt;
                                </button>
                            ) : (
                                <span className="solution-nav-spacer" aria-hidden="true" />
                            )}

                            <SelectableSolutionCard
                                key={activeSolution.id}
                                solution={activeSolution}
                                rank={activeIndex + 1}
                                selected={selectedIds.has(activeSolution.id)}
                                onSelect={() => onToggle(activeSolution.id)}
                            />

                            {canGoNext ? (
                                <button
                                    type="button"
                                    className="solution-nav-arrow solution-nav-arrow-next"
                                    onClick={() => setActiveIndex((current) => Math.min(solutions.length - 1, current + 1))}
                                    aria-label="Show next solution"
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

            <SelectedSolutionPanel
                solutions={selectedSolutions}
                onBack={onBack}
                onValidate={onValidate}
                canValidate={canValidate}
                hasInitiative={hasInitiative}
                transitionError={transitionError}
            />
        </section>
    );
}

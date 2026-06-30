"use client";

import { useState } from "react";
import { formatIviPercent } from "@/lib/scores";

export type EvaluationScoreKey = "fit" | "feasibility" | "cost" | "innovation";

export type EvaluationScoreSet = Record<EvaluationScoreKey, number>;

export type JustificationSource = "ai" | "derived" | "estimate";

export type ScoreJustification = {
    text: string;
    source: JustificationSource;
};

export type EvaluationScoreJustifications = Partial<Record<EvaluationScoreKey, ScoreJustification>>;

export type EvaluationSolution = {
    id: string;
    name: string;
    status: string;
    relevance: number;
    overall: number;
    scores: EvaluationScoreSet;
    scoreJustifications?: EvaluationScoreJustifications;
    description?: string;
    scoreSource?: string;
};

const SCORE_LABELS: Array<{ key: EvaluationScoreKey; label: string; weight: string }> = [
    { key: "fit", label: "Impact", weight: "35%" },
    { key: "feasibility", label: "Maturity", weight: "25%" },
    { key: "innovation", label: "Expertise", weight: "25%" },
    { key: "cost", label: "Duration", weight: "15%" },
];

const IVI_DIMENSIONS = [
    { percent: "35%", label: "Impact", description: "Expected business value, strategic relevance, and measurable outcome potential." },
    { percent: "25%", label: "Maturity", description: "Readiness of the solution, evidence, implementation clarity, and delivery confidence." },
    { percent: "25%", label: "Expertise", description: "Availability of DXC capability, domain knowledge, and skills required to execute." },
    { percent: "15%", label: "Duration", description: "Estimated speed to prepare and execute the PoC; shorter timelines score higher." },
] as const;

function scorePercent(value: number) {
    return `${Math.min(100, Math.max(0, (value / 5) * 100))}%`;
}

function scoreTone(score: number) {
    if (score >= 82) return "High confidence";
    if (score >= 70) return "Strong option";
    return "Needs validation";
}

export function IVIFormulaCard() {
    return (
        <section className="qualification-card qualification-formula-card" aria-label="Innovation Value Index formula">
            <header className="ivi-formula-head">
                <div className="ivi-formula-title-row">
                    <h3 className="ivi-formula-title">Innovation Value Index</h3>
                </div>
                <p className="ivi-formula-intro">
                    Four 1-5 ratings are weighted and converted into an Innovation Value Index percentage.
                </p>
            </header>

            <div className="ivi-formula-equation" aria-label="IVI weighted score equation">
                {IVI_DIMENSIONS.map((dimension, index) => (
                    <span className="ivi-formula-term-group" key={dimension.label}>
                        {index > 0 && <span className="ivi-formula-operator" aria-hidden="true">+</span>}
                        <span
                            className="ivi-formula-term"
                            tabIndex={0}
                            data-tooltip={dimension.description}
                            aria-label={`${dimension.label}: ${dimension.description}`}
                        >
                            <span className="ivi-formula-weight">{dimension.percent}</span>
                            <strong className="ivi-formula-label">{dimension.label}</strong>
                        </span>
                    </span>
                ))}
                <span className="ivi-formula-operator ivi-formula-operator-equals" aria-hidden="true">=</span>
                <span className="ivi-formula-result">
                    <span className="ivi-formula-result-badge">IVI%</span>
                </span>
            </div>
        </section>
    );
}

export function SolutionScoreCard({
    solution,
    rank,
    active,
    onSelect,
}: {
    solution: EvaluationSolution;
    rank: number;
    active: boolean;
    onSelect: () => void;
}) {
    const [showAllExplanations, setShowAllExplanations] = useState(false);

    return (
        <article
            className={`qualification-card solution-score-card${active ? " is-active" : ""}`}
            onClick={onSelect}
        >
            <span className="solution-rank">#{rank}</span>
            <div className="solution-score-head">
                <div>
                    <h3>{solution.name}</h3>
                    <p>{solution.description || "Candidate selected from Discovery and scored by the qualification model."}</p>
                </div>
                <div className="solution-ivi">
                    <strong>{formatIviPercent(solution.overall)}</strong>
                    <span>IVI</span>
                </div>
            </div>
            <div className="solution-meta-row">
                <span>{solution.status}</span>
                <span>Relevance {solution.relevance}%</span>
                <span>{solution.scoreSource || "AI scored"}</span>
            </div>
            <div className="score-grid">
                {SCORE_LABELS.map((score) => {
                    const isExpanded = showAllExplanations;

                    return (
                    <div key={score.key} className={`mini-score mini-score-collapsible${isExpanded ? " is-expanded" : ""}`}>
                        <div className="mini-score-top">
                            <span>{score.label}</span>
                            <div className="mini-score-top-actions">
                                <strong>{solution.scores[score.key]}/5</strong>
                                <button
                                    type="button"
                                    className="mini-score-toggle"
                                    aria-expanded={isExpanded}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setShowAllExplanations((current) => !current);
                                    }}
                                >
                                    {isExpanded ? "Hide" : "Explain"}
                                </button>
                            </div>
                        </div>
                        <i aria-hidden="true">
                            <em style={{ width: scorePercent(solution.scores[score.key]) }} />
                        </i>
                        {isExpanded && (
                            <p className="mini-score-rationale">
                                {solution.scoreJustifications?.[score.key] ? (
                                    <>
                                        <span className={`mini-score-source mini-score-source-${solution.scoreJustifications[score.key]!.source}`}>
                                            {solution.scoreJustifications[score.key]!.source === "ai"
                                                ? "AI"
                                                : solution.scoreJustifications[score.key]!.source === "derived"
                                                  ? "Derived"
                                                  : "Estimate"}
                                        </span>
                                        {solution.scoreJustifications[score.key]!.text}
                                    </>
                                ) : (
                                    "Gap-analysis rationale will appear here once IVI scores are generated."
                                )}
                            </p>
                        )}
                    </div>
                    );
                })}
            </div>
        </article>
    );
}

export function DecisionSummaryPanel({
    solutions,
    activeSolution,
}: {
    solutions: EvaluationSolution[];
    activeSolution?: EvaluationSolution;
}) {
    const average = solutions.length
        ? solutions.reduce((sum, solution) => sum + solution.overall, 0) / solutions.length
        : 0;
    const best = solutions[0]?.overall || 0;
    const tone = activeSolution ? scoreTone(activeSolution.overall) : null;

    return (
        <div className="qualification-card decision-summary">
            <div className="decision-summary-head">
                <span className="qualification-section-heading">Decision board</span>
                {tone && <span className="decision-tone-badge">{tone}</span>}
            </div>

            <div className="decision-summary-hero">
                <h2>{activeSolution ? activeSolution.name : "No candidate yet"}</h2>
                {activeSolution && (
                    <span className="decision-ivi-pill">
                        <strong>{formatIviPercent(activeSolution.overall)}</strong>
                        IVI
                    </span>
                )}
            </div>

            <p className="decision-summary-copy">
                {activeSolution
                    ? "IVI evidence and Discovery relevance for the active candidate."
                    : "Select solutions in Discovery, then return here to compare IVI scores."}
            </p>

            <div className="decision-stats">
                <span>
                    <strong>{solutions.length}</strong>
                    Candidates
                </span>
                <span>
                    <strong>{formatIviPercent(average)}</strong>
                    Avg IVI
                </span>
                <span>
                    <strong>{formatIviPercent(best)}</strong>
                    Best IVI
                </span>
            </div>
        </div>
    );
}

export function EvaluationActionsPanel({
    solutions,
    activeSolution,
    onBack,
    onContinue,
    canContinue,
    hasInitiative,
}: {
    solutions: EvaluationSolution[];
    activeSolution?: EvaluationSolution;
    onBack: () => void;
    onContinue: () => void;
    canContinue: boolean;
    hasInitiative: boolean;
}) {
    return (
        <aside className="ipm-summary-panel ipm-evaluation-actions">
            <DecisionSummaryPanel solutions={solutions} activeSolution={activeSolution} />

            {!hasInitiative && (
                <div className="qualification-alert danger">Open a saved initiative before starting evaluation.</div>
            )}

            {hasInitiative && solutions.length === 0 && (
                <div className="qualification-alert warning">Go back to Discovery and choose at least one solution.</div>
            )}

            <div className="qualification-actions">
                <button type="button" className="ipm-outline-action" onClick={onBack} disabled={!hasInitiative}>
                    Back to Discovery
                </button>
                <button type="button" className="ipm-primary-action" onClick={onContinue} disabled={!canContinue}>
                    Continue to Selection
                </button>
            </div>
        </aside>
    );
}

export function EvaluationStep({
    solutions,
    activeId,
    onActiveChange,
    onBack,
    onContinue,
    canContinue,
    hasInitiative,
}: {
    solutions: EvaluationSolution[];
    activeId?: string | null;
    onActiveChange: (id: string) => void;
    onBack: () => void;
    onContinue: () => void;
    canContinue: boolean;
    hasInitiative: boolean;
}) {
    const activeSolution = solutions.find((solution) => solution.id === activeId) || solutions[0];
    const activeIndex = solutions.findIndex((solution) => solution.id === activeSolution?.id);
    const currentIndex = activeIndex >= 0 ? activeIndex : 0;
    const canGoPrev = currentIndex > 0;
    const canGoNext = currentIndex < solutions.length - 1;

    const goPrev = () => {
        if (!canGoPrev) return;
        onActiveChange(solutions[currentIndex - 1].id);
    };

    const goNext = () => {
        if (!canGoNext) return;
        onActiveChange(solutions[currentIndex + 1].id);
    };

    return (
        <section className="ipm-sourcing-workspace ipm-qualification-workspace ipm-evaluation-workspace">
            <EvaluationActionsPanel
                solutions={solutions}
                activeSolution={activeSolution}
                onBack={onBack}
                onContinue={onContinue}
                canContinue={canContinue}
                hasInitiative={hasInitiative}
            />

            <div className="ipm-step-column">
                <h2 className="ipm-step-title">
                    STEP 3 - <span>EVALUATION</span>
                </h2>
                <p className="ipm-step-subtitle">
                    Backend gap-analysis scores are translated into the IVI model for Impact, Maturity, Expertise, and Duration.
                </p>

                <div className="qualification-main">
                    <IVIFormulaCard />
                    <div className="solution-score-list solution-score-carousel">
                        {canGoPrev ? (
                            <button
                                type="button"
                                className="solution-nav-arrow solution-nav-arrow-prev"
                                onClick={goPrev}
                                aria-label="Show previous solution"
                            >
                                &lt;
                            </button>
                        ) : (
                            <span className="solution-nav-spacer" aria-hidden="true" />
                        )}

                        {activeSolution && (
                            <SolutionScoreCard
                                key={activeSolution.id}
                                solution={activeSolution}
                                rank={currentIndex + 1}
                                active
                                onSelect={() => onActiveChange(activeSolution.id)}
                            />
                        )}

                        {canGoNext ? (
                            <button
                                type="button"
                                className="solution-nav-arrow solution-nav-arrow-next"
                                onClick={goNext}
                                aria-label="Show next solution"
                            >
                                &gt;
                            </button>
                        ) : (
                            <span className="solution-nav-spacer" aria-hidden="true" />
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

"use client";

import type { EvaluationSolution } from "./EvaluationStep";

export type SelectionSolution = EvaluationSolution & {
    fitScore: number;
    strength: string;
    risk: string;
    whySelected: string;
};

const SCORE_LABELS: Array<{ key: keyof EvaluationSolution["scores"]; label: string }> = [
    { key: "fit", label: "Impact" },
    { key: "feasibility", label: "Maturity" },
    { key: "innovation", label: "Expertise" },
    { key: "cost", label: "Duration" },
];

function scorePercent(value: number) {
    return `${Math.min(100, Math.max(0, (value / 5) * 100))}%`;
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
                    <h3>{solution.name}</h3>
                    <p>{solution.whySelected}</p>
                </div>
                <span className={`selection-checkbox${selected ? " is-checked" : ""}`} aria-hidden="true" />
            </div>

            <div className="selection-score-row">
                <span>
                    <strong>{solution.overall.toFixed(1)}</strong>
                    IVI
                </span>
                <span>
                    <strong>{solution.fitScore}%</strong>
                    Fit
                </span>
            </div>

            <div className="score-grid compact">
                {SCORE_LABELS.map((score) => (
                    <div key={score.key} className="mini-score">
                        <div>
                            <span>{score.label}</span>
                            <strong>{solution.scores[score.key]}/5</strong>
                        </div>
                        <i>
                            <em style={{ width: scorePercent(solution.scores[score.key]) }} />
                        </i>
                    </div>
                ))}
            </div>
        </button>
    );
}

export function SelectedSolutionPanel({
    solutions,
    onValidate,
    canValidate,
    hasInitiative,
    savedAt,
    transitionError,
}: {
    solutions: SelectionSolution[];
    onValidate: () => void;
    canValidate: boolean;
    hasInitiative: boolean;
    savedAt?: string;
    transitionError?: string | null;
}) {
    return (
        <aside className="ipm-summary-panel selected-solution-panel">
            <div className="qualification-card selected-panel-card">
                <div className="qualification-section-heading">
                    Selected solution{solutions.length === 1 ? "" : "s"}
                    {solutions.length > 0 && <span className="selection-count-badge">{solutions.length}</span>}
                </div>
                {solutions.length > 0 ? (
                    <ul className="selected-solution-list">
                        {solutions.map((solution) => (
                            <li key={solution.id} className="selected-solution-item">
                                <h2>{solution.name}</h2>
                                <p>{solution.description || "Selected from the IVI-ranked shortlist for Delivery preparation."}</p>
                                <div className="decision-stats">
                                    <span>
                                        <strong>{solution.overall.toFixed(1)}</strong>
                                        IVI
                                    </span>
                                    <span>
                                        <strong>{solution.relevance}%</strong>
                                        Relevance
                                    </span>
                                </div>
                                <div className="selection-notes">
                                    <div>
                                        <span>Strength</span>
                                        <p>{solution.strength}</p>
                                    </div>
                                    <div>
                                        <span>Watchout</span>
                                        <p>{solution.risk}</p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>Choose one or more candidates from the shortlist to prepare SG-3 validation.</p>
                )}
                <div className="saved-line">Evaluation saved: {savedAt || "Not saved yet"}</div>
            </div>

            {!hasInitiative && (
                <div className="qualification-alert danger">Open a saved initiative before choosing delivery solutions.</div>
            )}

            {transitionError && (
                <div className="qualification-alert danger">{transitionError}</div>
            )}

            <button type="button" className="ipm-primary-action" onClick={onValidate} disabled={!canValidate}>
                Validate SG-3
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
    savedAt,
    transitionError,
}: {
    solutions: SelectionSolution[];
    selectedIds: Set<string>;
    onToggle: (id: string) => void;
    onBack: () => void;
    onValidate: () => void;
    canValidate: boolean;
    hasInitiative: boolean;
    savedAt?: string;
    transitionError?: string | null;
}) {
    const selectedSolutions = solutions.filter((solution) => selectedIds.has(solution.id));

    return (
        <section className="ipm-sourcing-workspace ipm-qualification-workspace">
            <div className="ipm-step-column">
                <h2 className="ipm-step-title">
                    STEP 4 - <span>SELECTION</span>
                </h2>
                <p className="ipm-step-subtitle">
                    Use the IVI ranking to select one or more solutions that will move into Delivery recommendations.
                </p>

                <div className="qualification-main">
                    <div className="qualification-card selection-toolbar">
                        <div>
                            <div className="qualification-section-heading">Decision shortlist</div>
                            <p>{solutions.length} ranked candidates from Evaluation</p>
                        </div>
                        <button type="button" className="ipm-outline-action" onClick={onBack} disabled={!hasInitiative}>
                            Back to Evaluation
                        </button>
                    </div>

                    {solutions.length === 0 && (
                        <div className="qualification-alert warning">No auto-evaluated ranking found yet. Go back to Evaluation to generate the ranked result.</div>
                    )}

                    <div className="selectable-list">
                        {solutions.map((solution, index) => (
                            <SelectableSolutionCard
                                key={solution.id}
                                solution={solution}
                                rank={index + 1}
                                selected={selectedIds.has(solution.id)}
                                onSelect={() => onToggle(solution.id)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <SelectedSolutionPanel
                solutions={selectedSolutions}
                onValidate={onValidate}
                canValidate={canValidate}
                hasInitiative={hasInitiative}
                savedAt={savedAt}
                transitionError={transitionError}
            />
        </section>
    );
}

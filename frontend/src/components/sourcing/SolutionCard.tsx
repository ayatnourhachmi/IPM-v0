"use client";

import { CircularScore } from "@/components/sourcing/CircularScore";
import type { DiscoverySolution } from "@/components/sourcing/DiscoveryStep";

interface SolutionCardProps {
    solution: DiscoverySolution;
    selected: boolean;
    onSelect: (solution: DiscoverySolution) => void;
}

export function SolutionCard({ solution, selected, onSelect }: SolutionCardProps) {
    return (
        <button
            type="button"
            className={`ipm-solution-card${selected ? " selected" : ""}`}
            onClick={() => onSelect(solution)}
        >
            <div className="ipm-solution-copy">
                {solution.badge && <span className="ipm-solution-badge">{solution.badge}</span>}
                <h3>{solution.title}</h3>
                {solution.description && (
                    <p
                        className={`ipm-solution-description${selected ? "" : " ipm-solution-description--preview"}`}
                    >
                        {solution.description}
                    </p>
                )}
                {selected && solution.tags && solution.tags.length > 0 && (
                    <div className="ipm-solution-tags">
                        {solution.tags.map((tag) => (
                            <span key={tag}>{tag}</span>
                        ))}
                    </div>
                )}
            </div>
            {selected ? (
                <CircularScore score={solution.score} />
            ) : (
                <span className="ipm-solution-score-text">{Math.round(solution.score)}%</span>
            )}
        </button>
    );
}

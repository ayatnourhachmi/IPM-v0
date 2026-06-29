/**
 * DuplicateBanner — Warning bar showing potential duplicates after submission.
 */

"use client";

import type { DuplicateMatch } from "@/lib/types";

interface DuplicateBannerProps {
    matches: DuplicateMatch[];
    onContinueAnyway: () => void;
    onViewDuplicate: (id: string) => void;
}

function duplicateStepLabel(status: DuplicateMatch["status"]) {
    if (status === "draft" || status === "rework" || status === "abandoned") return "Step 1 - Business Need";
    if (status === "submitted") return "Step 2 - Discovery";
    if (status === "solutions_reviewed") return "Step 3 - Evaluation";
    if (status === "in_qualification") return "Step 4 - Selection";
    if (status === "selected") return "Step 5 - Recommendations";
    if (status === "delivery") return "Step 6 - PoC Preparation";
    return "Step 1 - Business Need";
}

function duplicateStatusLabel(status: DuplicateMatch["status"]) {
    if (status === "abandoned") return "Abandoned";
    if (status === "delivery") return "Completed";
    return "Not completed";
}

export function DuplicateBanner({ matches, onContinueAnyway, onViewDuplicate }: DuplicateBannerProps) {
    if (matches.length === 0) return null;

    return (
        <section className="ipm-dup-banner" role="alert" aria-live="polite">
            <div className="ipm-dup-banner-head">
                <span className="ipm-dup-banner-icon" aria-hidden="true" />
                <h3 className="ipm-dup-banner-title">
                    {matches.length} potential duplicate{matches.length > 1 ? "s" : ""} detected
                </h3>
            </div>

            <div className="ipm-dup-banner-body">
                {matches.map((match) => (
                    <div key={match.id} className="ipm-dup-match">
                        <div className="ipm-dup-main">
                            <div className="ipm-dup-meta-row">
                                <span className="ipm-dup-id">{match.id}</span>
                                <span className="ipm-dup-score">{Math.round(match.similarity_score * 100)}% similarity</span>
                                <span className="ipm-dup-step">{duplicateStepLabel(match.status)}</span>
                                <span className={`ipm-dup-state status-${match.status}`}>
                                    {duplicateStatusLabel(match.status)}
                                </span>
                            </div>
                            <p className="ipm-dup-text">{match.pitch}</p>
                        </div>
                        <button
                            type="button"
                            className="ipm-outline-action ipm-dup-view"
                            onClick={() => onViewDuplicate(match.id)}
                        >
                            Show
                        </button>
                    </div>
                ))}
            </div>

            <div className="ipm-dup-banner-actions">
                <button type="button" className="ipm-outline-action ipm-dup-continue" onClick={onContinueAnyway}>
                    Continue Anyway
                </button>
            </div>
        </section>
    );
}

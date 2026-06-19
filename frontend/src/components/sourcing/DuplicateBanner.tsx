/**
 * DuplicateBanner — Warning bar showing potential duplicates after submission.
 */

"use client";

import type { DuplicateMatch } from "@/lib/types";

interface DuplicateBannerProps {
    matches: DuplicateMatch[];
    onDismiss: () => void;
    onViewDuplicate: (id: string) => void;
}

export function DuplicateBanner({ matches, onDismiss, onViewDuplicate }: DuplicateBannerProps) {
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
                        <span className="ipm-dup-id">{match.id}</span>
                        <p className="ipm-dup-text">
                            {match.pitch.length > 80 ? `${match.pitch.slice(0, 80)}…` : match.pitch}
                        </p>
                        <span className="ipm-dup-score">{Math.round(match.similarity_score * 100)}%</span>
                        <button
                            type="button"
                            className="ipm-outline-action ipm-dup-view"
                            onClick={() => onViewDuplicate(match.id)}
                        >
                            View →
                        </button>
                    </div>
                ))}
            </div>

            <div className="ipm-dup-banner-actions">
                <button type="button" className="ipm-outline-action ipm-dup-continue" onClick={onDismiss}>
                    Continue anyway
                </button>
            </div>
        </section>
    );
}

/**
 * SuggestionsPanel — Right panel: real-time AI pitch reformulations.
 */

"use client";

import type { Suggestion } from "@/lib/types";

interface SuggestionsPanelProps {
    suggestions: Suggestion[];
    isAnalyzing: boolean;
    hasPitch: boolean;
    onApply: (text: string) => void;
    error?: string | null;
}

export function SuggestionsPanel({ suggestions, isAnalyzing, hasPitch, onApply, error }: SuggestionsPanelProps) {
    const focusedSuggestions = suggestions.filter((sug) =>
        ["Business Precision", "Value Angle"].includes(sug.label)
    );

    return (
        <div className="panel panel-scroll">
            <div className="panel-title">AI SUGGESTIONS</div>

            {/* Empty state — no pitch yet */}
            {!hasPitch && !isAnalyzing && focusedSuggestions.length === 0 && (
                <div className="sug-empty">
                    <div className="sug-diamond">◆</div>
                    <p>Start writing your pitch — suggestions will appear in real time</p>
                </div>
            )}

            {/* Loading state */}
            {isAnalyzing && (
                <div className="sug-skeleton-list">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="sug-card sug-card-skeleton">
                            <div className="sug-label" />
                            <div className="sug-text" />
                    </div>
                ))}
                </div>
            )}

            {/* Error state */}
            {error && !isAnalyzing && (
                <div className="sug-empty">
                    <div className="sug-diamond" style={{ opacity: 0.4, color: "#f87171" }}>◆</div>
                    <p style={{ color: "#f87171", fontSize: 12 }}>Backend unreachable</p>
                    <p className="sug-sub">Make sure the API is running on port 8000</p>
                </div>
            )}

            {/* Waiting state — pitch exists, not analyzing, but no suggestions yet */}
            {hasPitch && !isAnalyzing && !error && focusedSuggestions.length === 0 && (
                <div className="sug-empty">
                    <div className="sug-diamond" style={{ opacity: 0.4 }}>◆</div>
                    <p>No suggestions yet</p>
                    <p className="sug-sub">Keep typing — suggestions appear after analysis completes</p>
                </div>
            )}

            {/* Suggestion cards */}
            {focusedSuggestions.map((sug, i) => (
                <button
                    key={`${sug.label}-${i}`}
                    className="sug-card"
                    style={{ animationDelay: `${i * 65}ms` }}
                    type="button"
                    onClick={() => onApply(sug.text)}
                >
                    <div className="sug-label">{sug.label}</div>
                    <div className="sug-text">{sug.text}</div>
                </button>
            ))}
        </div>
    );
}

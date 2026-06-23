"use client";

import type { Horizon, Suggestion } from "@/lib/types";
import { HORIZON_LABELS } from "@/lib/types";
import { PhaseLoading } from "@/components/sourcing/PhaseLoading";

const HORIZONS: Horizon[] = ["short_term", "mid_term", "long_term"];

interface BusinessNeedStepProps {
    horizon: Horizon | null;
    pitch: string;
    suggestions: Suggestion[];
    isAnalyzing: boolean;
    error?: string | null;
    canContinue: boolean;
    isSubmitting?: boolean;
    onHorizonChange: (horizon: Horizon) => void;
    onPitchChange: (value: string) => void;
    onPitchApply?: () => void;
    onNext: () => void;
}

function getFocusedSuggestions(suggestions: Suggestion[]) {
    return suggestions.filter((suggestion) =>
        ["Business Precision", "Value Angle"].includes(suggestion.label)
    );
}

export function BusinessNeedStep({
    horizon,
    pitch,
    suggestions,
    isAnalyzing,
    error,
    canContinue,
    isSubmitting = false,
    onHorizonChange,
    onPitchChange,
    onPitchApply,
    onNext,
}: BusinessNeedStepProps) {
    const hasPitch = pitch.trim().length >= 20;
    const canAnalyze = horizon !== null && pitch.trim().length >= 30;
    const focusedSuggestions = !isAnalyzing ? getFocusedSuggestions(suggestions) : [];
    const showHorizonHint = !horizon && pitch.trim().length >= 30;

    const applyReformulation = (text: string) => {
        onPitchChange(text);
        onPitchApply?.();
        requestAnimationFrame(() => {
            const textarea = document.getElementById("pitch-input") as HTMLTextAreaElement | null;
            if (!textarea) return;
            textarea.focus();
            textarea.setSelectionRange(text.length, text.length);
        });
    };

    return (
        <div className="ipm-step-card ipm-business-need-card">
            <div className="ipm-horizon-inline">
                <span className="ipm-field-label" id="horizon-label">
                    Time horizon
                </span>
                <div
                    className="ipm-horizon-options ipm-horizon-options--compact"
                    role="group"
                    aria-labelledby="horizon-label"
                >
                    {HORIZONS.map((option) => (
                        <button
                            key={option}
                            type="button"
                            className={`ipm-horizon-option ipm-horizon-option--compact${horizon === option ? " selected" : ""}`}
                            onClick={() => onHorizonChange(option)}
                            aria-pressed={horizon === option}
                        >
                            <span>{HORIZON_LABELS[option].label}</span>
                            <small>{HORIZON_LABELS[option].detail}</small>
                        </button>
                    ))}
                </div>
            </div>

            <label htmlFor="pitch-input" className="ipm-field-label">
                Your business need
            </label>
            <textarea
                id="pitch-input"
                value={pitch}
                onChange={(event) => onPitchChange(event.target.value)}
                placeholder="Describe your business problem, context, and expected impact"
                rows={3}
            />

            {showHorizonHint && (
                <div className="ipm-analyzing-note ipm-horizon-hint">
                    Select a time horizon to enable AI analysis.
                </div>
            )}

            {error && (
                <div className="ipm-analyzing-note ipm-analyze-error" role="alert">
                    {error}
                </div>
            )}

            {canAnalyze && isAnalyzing && (
                <PhaseLoading phase="sourcing" label="Analyzing business need..." />
            )}

            {canAnalyze && !isAnalyzing && focusedSuggestions.length > 0 && (
                <div className="ipm-reformulations">
                    <h3>AI reformulations</h3>
                    {focusedSuggestions.map((suggestion) => (
                        <button
                            type="button"
                            className="ipm-reformulation-pill"
                            key={suggestion.label}
                            onClick={() => applyReformulation(suggestion.text)}
                            aria-label={`Use ${suggestion.label} reformulation`}
                        >
                            <span>
                                <h4>{suggestion.label.toUpperCase()}</h4>
                                <p>{suggestion.text}</p>
                            </span>
                            <strong aria-hidden="true">Use</strong>
                        </button>
                    ))}
                </div>
            )}

            <button
                type="button"
                id="submit-need"
                className="ipm-primary-action"
                disabled={!canContinue || isSubmitting}
                onClick={onNext}
            >
                {isSubmitting ? "CONFIRMING..." : "NEXT"}
            </button>
        </div>
    );
}

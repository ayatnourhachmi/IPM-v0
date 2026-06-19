/**
 * PitchPanel — Sourcing step panel: pitch first, horizon selection second.
 */

"use client";

import React from "react";
import { HorizonSelector } from "@/components/sourcing/HorizonSelector";
import type { Horizon } from "@/lib/types";

interface PitchPanelProps {
    pitch: string;
    onPitchChange: (v: string) => void;
    horizon: Horizon | null;
    onHorizonChange: (h: Horizon) => void;
    step: "describe" | "horizon";
    canContinue: boolean;
    canSubmit: boolean;
    isSubmitting: boolean;
    onNext: () => void;
    onBack: () => void;
    onSubmit: () => void;
}

export function PitchPanel({
    pitch,
    onPitchChange,
    horizon,
    onHorizonChange,
    step,
    canContinue,
    canSubmit,
    isSubmitting,
    onNext,
    onBack,
    onSubmit,
}: PitchPanelProps) {
    const isDescribeStep = step === "describe";

    return (
        <div className="sourcing-card">
            {/* Step pill */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="step-pill">
                    <span style={{ fontSize: 10 }}>●</span>
                    {isDescribeStep ? "Step 1" : "Step 2"}
                </span>
                <span className="step-subtitle">
                    {isDescribeStep ? "Describe your need" : "Select the time horizon"}
                </span>
            </div>

            {isDescribeStep ? (
                <>
                    {/* Pitch textarea */}
                    <div className="pitch-area">
                        <textarea
                            id="pitch-input"
                            value={pitch}
                            onChange={(e) => onPitchChange(e.target.value)}
                            placeholder="Describe your business problem, context, and expected impact..."
                            rows={4}
                        />
                    </div>

                    {/* Character count */}
                    {pitch.length > 0 && pitch.length < 20 && (
                        <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
                            {20 - pitch.length} more character{20 - pitch.length > 1 ? "s" : ""} required
                        </div>
                    )}

                    <button
                        type="button"
                        className={`submit-btn${canContinue ? " ready" : ""}`}
                        disabled={!canContinue}
                        onClick={onNext}
                    >
                        Next: Time Horizon
                    </button>
                </>
            ) : (
                <>
                    <HorizonSelector value={horizon} onChange={onHorizonChange} />

                    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10 }}>
                        <button
                            type="button"
                            className="submit-btn secondary"
                            onClick={onBack}
                        >
                            Back
                        </button>
                        <button
                            id="submit-need"
                            type="button"
                            className={`submit-btn${canSubmit ? " ready" : ""}`}
                            disabled={!canSubmit}
                            onClick={onSubmit}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="submit-spinner" />
                                    Submitting...
                                </>
                            ) : (
                                <>Submit Business Need</>
                            )}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

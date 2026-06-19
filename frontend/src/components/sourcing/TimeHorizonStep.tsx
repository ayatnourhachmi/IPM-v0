"use client";

import type { Horizon } from "@/lib/types";
import { HORIZON_LABELS } from "@/lib/types";

interface TimeHorizonStepProps {
    value: Horizon | null;
    canSubmit: boolean;
    isSubmitting: boolean;
    onChange: (horizon: Horizon) => void;
    onSubmit: () => void;
}

const HORIZONS: Horizon[] = ["court_terme", "moyen_terme", "long_terme"];

export function TimeHorizonStep({
    value,
    canSubmit,
    isSubmitting,
    onChange,
    onSubmit,
}: TimeHorizonStepProps) {
    return (
        <div className="ipm-step-card ipm-horizon-card">
            <h3 className="ipm-horizon-title">Time Horizon</h3>
            <div className="ipm-horizon-options">
                {HORIZONS.map((horizon) => (
                    <button
                        key={horizon}
                        type="button"
                        className={`ipm-horizon-option${value === horizon ? " selected" : ""}`}
                        onClick={() => onChange(horizon)}
                    >
                        <span>{HORIZON_LABELS[horizon].label}</span>
                        <small>{HORIZON_LABELS[horizon].detail}</small>
                    </button>
                ))}
            </div>
            <button
                type="button"
                id="submit-need"
                className="ipm-primary-action"
                disabled={!canSubmit}
                onClick={onSubmit}
            >
                {isSubmitting ? "CONFIRMING..." : "CONFIRM"}
            </button>
        </div>
    );
}

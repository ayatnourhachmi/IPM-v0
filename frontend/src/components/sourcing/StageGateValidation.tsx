"use client";

import type { CSSProperties } from "react";

export type StageGateId = "SG-1" | "SG-2" | "SG-3" | "SG-4";
export type StageGatePhase = "sourcing" | "qualification" | "delivery";

export type StageGateSummaryItem = {
    label: string;
    value: string | number;
};

export type StageGateChecklistItem = {
    label: string;
    completed: boolean;
    onClick?: () => void;
};

type StageGateValidationProps = {
    gateId: StageGateId;
    phase: StageGatePhase;
    title: string;
    subtitle: string;
    summaryItems: StageGateSummaryItem[];
    checklistItems: StageGateChecklistItem[];
    onBack: () => void;
    onValidate: () => void;
    validateLabel?: string;
    isValidateDisabled?: boolean;
    disabledReason?: string;
    isProcessing?: boolean;
    backLabel?: string;
    accentColor?: string;
};

function SummaryColumn({ label, value }: StageGateSummaryItem) {
    return (
        <div className="ipm-sg-summary-col">
            <h3>{label}</h3>
            <p>{value || "Pending"}</p>
        </div>
    );
}

function CheckItem({ label, completed, onClick }: StageGateChecklistItem) {
    const className = `ipm-sg-check ${completed ? "is-complete" : "is-pending"}${onClick ? " has-action" : ""}`;
    const content = (
        <>
            <span className="ipm-check-mark" aria-hidden="true" />
            <span>{label}</span>
        </>
    );

    if (onClick) {
        return (
            <button type="button" className={className} onClick={onClick}>
                {content}
            </button>
        );
    }

    return (
        <div className={className}>
            {content}
        </div>
    );
}

export function StageGateValidation({
    gateId,
    phase,
    title,
    subtitle,
    summaryItems,
    checklistItems,
    onBack,
    onValidate,
    validateLabel = "VALIDATE",
    isValidateDisabled = false,
    disabledReason,
    isProcessing = false,
    backLabel = "Back",
    accentColor,
}: StageGateValidationProps) {
    const hasIncompleteChecks = checklistItems.some((item) => !item.completed);
    const validateDisabled = isProcessing || isValidateDisabled || hasIncompleteChecks;
    const cssVars = accentColor ? ({ "--ipm-sg-accent": accentColor } as CSSProperties) : undefined;

    return (
        <section className={`ipm-stagegate-area ipm-stagegate-${phase}`} style={cssVars}>
            <div className="ipm-stagegate-card">
                <div className="ipm-stagegate-heading">
                    <h2>{title}</h2>
                    <p>{subtitle}</p>
                </div>

                <div className="ipm-sg-summary-box">
                    {summaryItems.map((item) => (
                        <SummaryColumn key={item.label} {...item} />
                    ))}
                </div>

                <div className={`ipm-sg-checks ${checklistItems.length > 2 ? "is-list" : ""}`}>
                    {checklistItems.map((item) => (
                        <CheckItem key={item.label} {...item} />
                    ))}
                </div>

                {validateDisabled && disabledReason && (
                    <div className="ipm-sg-disabled-reason" role="status">
                        {disabledReason}
                    </div>
                )}

                <div className="ipm-stagegate-actions">
                    <button type="button" className="ipm-outline-action" onClick={onBack} disabled={isProcessing}>
                        {backLabel}
                    </button>

                    <div className="ipm-stagegate-right-actions">
                        <button type="button" className="ipm-primary-action" disabled={validateDisabled} onClick={onValidate}>
                            {isProcessing ? "VALIDATING..." : validateLabel}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

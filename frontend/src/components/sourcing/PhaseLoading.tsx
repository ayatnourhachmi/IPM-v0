"use client";

export type IpmPhaseId = "sourcing" | "qualification" | "delivery";

interface PhaseLoadingProps {
    phase: IpmPhaseId;
    variant?: "inline" | "skeleton" | "stack" | "page";
    label?: string;
    cardCount?: number;
    className?: string;
}

export function PhaseLoading({
    phase,
    variant = "inline",
    label,
    cardCount = 3,
    className = "",
}: PhaseLoadingProps) {
    const rootClass = `ipm-phase-loading ipm-phase-loading--${phase} ipm-phase-loading--${variant}${className ? ` ${className}` : ""}`;

    if (variant === "page") {
        return (
            <div className={`ipm-sourcing-redesign ipm-phase-loading-page ${rootClass}`} role="status" aria-live="polite">
                <div className="ipm-phase-loading-page-inner">
                    <div className="ipm-phase-loading-pulse" aria-hidden="true" />
                    {label ? <p>{label}</p> : null}
                </div>
            </div>
        );
    }

    if (variant === "skeleton") {
        return (
            <div className={rootClass} role="status" aria-live="polite" aria-label={label || "Loading"}>
                {label ? <p className="ipm-phase-loading-label">{label}</p> : null}
                <div className="ipm-phase-loading-skeleton-grid">
                    {Array.from({ length: 4 }, (_, index) => (
                        <div className="ipm-phase-loading-skeleton-card" key={index} aria-hidden="true">
                            <span className="ipm-phase-loading-skeleton-line ipm-phase-loading-skeleton-line--title" />
                            <span className="ipm-phase-loading-skeleton-line" />
                            <span className="ipm-phase-loading-skeleton-line ipm-phase-loading-skeleton-line--short" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (variant === "stack") {
        return (
            <div className={rootClass} role="status" aria-live="polite" aria-label={label || "Loading"}>
                {label ? <p className="ipm-phase-loading-label">{label}</p> : null}
                <div className="ipm-phase-loading-stack">
                    {Array.from({ length: cardCount }, (_, index) => (
                        <div className="ipm-phase-loading-stack-card" key={index} aria-hidden="true">
                            <span className="ipm-phase-loading-skeleton-line ipm-phase-loading-skeleton-line--title" />
                            <span className="ipm-phase-loading-skeleton-line" />
                            <span className="ipm-phase-loading-skeleton-line" />
                            <span className="ipm-phase-loading-skeleton-line ipm-phase-loading-skeleton-line--short" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={rootClass} role="status" aria-live="polite">
            {label ? <p className="ipm-phase-loading-label">{label}</p> : null}
            <div className="ipm-phase-loading-bar" aria-hidden="true">
                <span />
            </div>
        </div>
    );
}

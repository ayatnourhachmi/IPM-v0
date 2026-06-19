"use client";

import type { RiskItem } from "@/lib/types";
import type { SolutionAlignment } from "@/components/sourcing/DiscoveryStep";

type AlignmentVariant = "covered" | "missing" | "enablers" | "risks";

interface AlignmentCardProps {
    title: string;
    variant: AlignmentVariant;
    covered?: string[];
    missing?: SolutionAlignment["missing"];
    enablers?: SolutionAlignment["enablers"];
    risks?: RiskItem[];
    fitScore?: number;
}

function EnablerIcon({ icon }: { icon: SolutionAlignment["enablers"][number]["icon"] }) {
    return <span className={`ipm-enabler-icon ${icon}`} aria-hidden="true" />;
}

export function AlignmentCard({
    title,
    variant,
    covered = [],
    missing = [],
    enablers = [],
    risks = [],
    fitScore,
}: AlignmentCardProps) {
    return (
        <section className={`ipm-alignment-card ${variant}`}>
            <div className="ipm-alignment-card-head">
                <h3>{title}</h3>
                {typeof fitScore === "number" && (
                    <span className="ipm-fit-score">Fit {fitScore}/10</span>
                )}
            </div>

            {variant === "covered" && covered.length > 0 && (
                <ul className="ipm-alignment-check-list">
                    {covered.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            )}

            {variant === "missing" && missing.length > 0 && (
                <ul className="ipm-alignment-missing-list">
                    {missing.map((item) => (
                        <li key={item.label}>
                            <span>{item.label}</span>
                            {item.effort && <strong>{item.effort}</strong>}
                        </li>
                    ))}
                </ul>
            )}

            {variant === "enablers" && enablers.length > 0 && (
                <div className="ipm-enabler-grid">
                    {enablers.map((item) => (
                        <div className="ipm-enabler-item" key={item.label}>
                            <EnablerIcon icon={item.icon} />
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>
            )}

            {variant === "risks" && risks.length > 0 && (
                <ul className="ipm-risk-list">
                    {risks.map((risk) => (
                        <li key={`${risk.risk}-${risk.severity}`}>
                            <span>{risk.risk}</span>
                            <strong>{risk.severity}</strong>
                        </li>
                    ))}
                </ul>
            )}

        </section>
    );
}

"use client";

import type { CSSProperties } from "react";

export function CircularScore({ score }: { score: number }) {
    const boundedScore = Math.max(0, Math.min(100, Math.round(score)));

    return (
        <div className="ipm-circular-score" style={{ "--score": `${boundedScore}%` } as CSSProperties}>
            <span>{boundedScore}%</span>
        </div>
    );
}

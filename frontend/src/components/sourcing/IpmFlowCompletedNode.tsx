"use client";

import { useId } from "react";

interface IpmFlowCompletedNodeProps {
    size?: number;
    variant?: "sourcing" | "qualification" | "delivery";
}

const COMPLETED_GRADIENTS = {
    sourcing: { start: "#F85", end: "#FF4F42" },
    qualification: { start: "#BA8A96", end: "#757597" },
    delivery: { start: "#9291BF", end: "#487FF5" },
} as const;

export function IpmFlowCompletedNode({ size = 34, variant = "sourcing" }: IpmFlowCompletedNodeProps) {
    const gradientId = useId().replace(/:/g, "");
    const colors = COMPLETED_GRADIENTS[variant];

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 34 34"
            fill="none"
            aria-hidden="true"
        >
            <circle cx="16.7214" cy="16.7214" r="16.7214" fill={`url(#completed0_${gradientId})`} />
            <path
                d="M11.2 17.1L15.1 21L22.3 13.8"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <defs>
                <linearGradient
                    id={`completed0_${gradientId}`}
                    x1="0"
                    y1="16.7214"
                    x2="33.4428"
                    y2="16.7214"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor={colors.start} />
                    <stop offset="1" stopColor={colors.end} />
                </linearGradient>
            </defs>
        </svg>
    );
}

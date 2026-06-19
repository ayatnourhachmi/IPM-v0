"use client";

import { useId } from "react";

interface IpmFlowActiveNodeProps {
    size?: number;
}

export function IpmFlowActiveNode({ size = 34 }: IpmFlowActiveNodeProps) {
    const gradientId = useId().replace(/:/g, "");

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 34 34"
            fill="none"
            aria-hidden="true"
        >
            <circle cx="16.7214" cy="16.7214" r="16.7214" fill={`url(#paint0_${gradientId})`} />
            <circle
                cx="16.7066"
                cy="16.7067"
                r="13.9648"
                fill={`url(#paint1_${gradientId})`}
                stroke="white"
                strokeWidth="1.82796"
            />
            <circle cx="16.505" cy="16.5051" r="3.70938" fill="white" />
            <defs>
                <linearGradient
                    id={`paint0_${gradientId}`}
                    x1="0"
                    y1="16.7214"
                    x2="33.4428"
                    y2="16.7214"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#F85" />
                    <stop offset="1" stopColor="#FF4F42" />
                </linearGradient>
                <linearGradient
                    id={`paint1_${gradientId}`}
                    x1="1.82788"
                    y1="16.7067"
                    x2="31.5854"
                    y2="16.7067"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#F85" />
                    <stop offset="1" stopColor="#FF4F42" />
                </linearGradient>
            </defs>
        </svg>
    );
}

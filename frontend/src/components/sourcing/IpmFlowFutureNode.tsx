"use client";

interface IpmFlowFutureNodeProps {
    size?: number;
}

export function IpmFlowFutureNode({ size = 34 }: IpmFlowFutureNodeProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 34 34"
            fill="none"
            aria-hidden="true"
        >
            <circle cx="16.7214" cy="16.7214" r="16.7214" fill="#B8B8B8" />
            <circle
                cx="16.7069"
                cy="16.7067"
                r="13.9648"
                fill="#B8B8B8"
                stroke="white"
                strokeWidth="1.82796"
            />
            <circle cx="16.5053" cy="16.5051" r="3.70938" fill="white" />
        </svg>
    );
}

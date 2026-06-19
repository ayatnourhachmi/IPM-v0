"use client";

interface IpmFlowLockedPhaseNodeProps {
    size?: number;
}

export function IpmFlowLockedPhaseNode({ size = 28 }: IpmFlowLockedPhaseNodeProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 28 28"
            fill="none"
            aria-hidden="true"
        >
            <circle cx="13.642" cy="13.642" r="12.9924" fill="white" stroke="#989393" strokeWidth="1.29924" />
            <circle cx="13.6419" cy="13.6422" r="3.89772" fill="#DBDBDB" />
        </svg>
    );
}

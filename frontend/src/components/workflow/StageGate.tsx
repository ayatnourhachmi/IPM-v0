/**
 * StageGate — Diamond gate node with dashed lines, ◆/✓, pulse-ring when active.
 * Uses framer-motion spring animation. Clickable.
 * Adapted from stageflow-compass reference.
 */

"use client";

import { motion } from "framer-motion";

interface StageGateProps {
    label: string;
    isActive?: boolean;
    isCompleted?: boolean;
    color: "blue" | "emerald" | "orange";
    delay?: number;
    onClick?: () => void;
}

const colorClasses = {
    blue: {
        border: "var(--wf-sourcing)",
        ring: "hsla(217, 91%, 60%, 0.2)",
        text: "var(--wf-sourcing)",
    },
    emerald: {
        border: "var(--wf-qualification)",
        ring: "hsla(142, 71%, 45%, 0.2)",
        text: "var(--wf-qualification)",
    },
    orange: {
        border: "var(--wf-delivery)",
        ring: "hsla(24, 94%, 50%, 0.2)",
        text: "var(--wf-delivery)",
    },
};

export default function StageGate({ label, isActive, isCompleted, color, delay = 0, onClick }: StageGateProps) {
    const c = colorClasses[color];

    return (
        <motion.div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                cursor: isActive ? "pointer" : "default",
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, delay }}
            onClick={isActive ? onClick : undefined}
        >
            {/* Dashed line top */}
            <div style={{
                width: 1,
                height: 16,
                borderLeft: "1px dashed var(--wf-border)",
            }} />

            {/* Diamond */}
            <div style={{
                position: "relative",
                ...(isActive ? {
                    boxShadow: `0 0 0 4px ${c.ring}`,
                    borderRadius: 2,
                    animation: "pulseRing 2s ease-in-out infinite",
                } : {}),
            }}>
                <div style={{
                    width: 32,
                    height: 32,
                    transform: "rotate(45deg)",
                    border: `1px solid ${c.border}`,
                    background: "var(--wf-bg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}>
                    <span style={{
                        transform: "rotate(-45deg)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 9,
                        fontWeight: 500,
                        color: isCompleted ? c.text : "var(--wf-muted-fg)",
                    }}>
                        {isCompleted ? "✓" : "◆"}
                    </span>
                </div>
            </div>

            {/* Dashed line bottom */}
            <div style={{
                width: 1,
                height: 16,
                borderLeft: "1px dashed var(--wf-border)",
            }} />

            {/* Label */}
            <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 500,
                color: isActive ? c.text : "var(--wf-muted-fg)",
            }}>
                {label}
            </span>
        </motion.div>
    );
}

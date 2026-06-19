/**
 * WorkflowNode — Circular step node with phase-colored border.
 * Shows ✓ when complete, pulsing dot when active, grey dot when locked.
 * Uses framer-motion spring scale-in animation.
 * Adapted from stageflow-compass reference.
 */

"use client";

import { motion } from "framer-motion";

interface WorkflowNodeProps {
    label: string;
    index: string;
    color: "blue" | "emerald" | "orange";
    isActive?: boolean;
    isCompleted?: boolean;
    subtitle?: string;
    delay?: number;
    isMuted?: boolean;
}

const colorMap = {
    blue: {
        border: "var(--wf-sourcing)",
        glow: "0 0 15px var(--wf-sourcing-glow)",
        text: "var(--wf-sourcing)",
        bg: "var(--wf-sourcing)",
        subtitleBg: "var(--wf-sourcing-bg-active)",
    },
    emerald: {
        border: "var(--wf-qualification)",
        glow: "0 0 15px var(--wf-qualification-glow)",
        text: "var(--wf-qualification)",
        bg: "var(--wf-qualification)",
        subtitleBg: "var(--wf-qualification-bg-chip)",
    },
    orange: {
        border: "var(--wf-delivery)",
        glow: "0 0 15px var(--wf-delivery-glow)",
        text: "var(--wf-delivery)",
        bg: "var(--wf-delivery)",
        subtitleBg: "var(--wf-delivery-bg-chip)",
    },
};

const mutedColor = {
    border: "var(--wf-border)",
    glow: "none",
    text: "var(--wf-muted-fg)",
    bg: "var(--wf-muted-fg)",
    subtitleBg: "var(--wf-muted)",
};

export default function WorkflowNode({ label, index, color, isActive, isCompleted, subtitle, delay = 0, isMuted = false }: WorkflowNodeProps) {
    const c = isMuted && !isActive && !isCompleted ? mutedColor : colorMap[color];

    return (
        <motion.div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                flexShrink: 0,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, delay }}
        >
            <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontWeight: 500,
                color: c.text,
                opacity: 0.6,
                lineHeight: 1,
                textAlign: "center",
            }}>
                {index}
            </span>

            <div style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                border: `2px solid ${c.border}`,
                background: "var(--wf-bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                boxShadow: isActive ? c.glow : "none",
                flexShrink: 0,
            }}>
                {isCompleted && (
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7L6 10L11 4" stroke={c.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
                {isActive && (
                    <div style={{
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: c.bg,
                        animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                    }} />
                )}
                {!isCompleted && !isActive && (
                    <div style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--wf-muted-fg)",
                        opacity: 0.3,
                    }} />
                )}
            </div>

            <span style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: isMuted && !isActive && !isCompleted ? "var(--wf-muted-fg)" : "var(--wf-fg)",
                opacity: isMuted && !isActive && !isCompleted ? 0.7 : 1,
                textAlign: "center",
                maxWidth: 110,
                lineHeight: 1.2,
            }}>
                {label}
            </span>

            {/* Subtitle chip */}
            {subtitle && (
                <span style={{
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    color: c.text,
                    background: c.subtitleBg,
                    padding: "2px 8px",
                    borderRadius: 4,
                }}>
                    {subtitle}
                </span>
            )}
        </motion.div>
    );
}

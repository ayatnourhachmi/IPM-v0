/**
 * PhaseContainer — Colored border-left container grouping steps by phase.
 * Collapses with AnimatePresence when phase is done and later phase is active.
 * Shows "✓ N/M" chip when collapsed.
 * Adapted from stageflow-compass reference.
 */

"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PhaseContainerProps {
    title: string;
    color: "blue" | "emerald" | "orange";
    children: React.ReactNode;
    isCollapsed?: boolean;
    completedCount?: number;
    totalCount?: number;
    isMuted?: boolean;
}

const phaseColors = {
    blue: {
        border: "var(--wf-sourcing)",
        bg: "var(--wf-sourcing-bg-panel)",
        bgCollapsed: "var(--wf-sourcing-bg-collapsed)",
        text: "var(--wf-sourcing)",
    },
    emerald: {
        border: "var(--wf-qualification)",
        bg: "var(--wf-qualification-bg-panel)",
        bgCollapsed: "var(--wf-qualification-bg-collapsed)",
        text: "var(--wf-qualification)",
    },
    orange: {
        border: "var(--wf-delivery)",
        bg: "var(--wf-delivery-bg-panel)",
        bgCollapsed: "var(--wf-delivery-bg-collapsed)",
        text: "var(--wf-delivery)",
    },
};

const mutedPhase = {
    border: "var(--wf-border)",
    bg: "rgba(127, 127, 127, 0.04)",
    bgCollapsed: "rgba(127, 127, 127, 0.025)",
    text: "var(--wf-muted-fg)",
};

export default function PhaseContainer({
    title,
    color,
    children,
    isCollapsed = false,
    completedCount,
    totalCount,
    isMuted = false,
}: PhaseContainerProps) {
    const c = isMuted ? mutedPhase : phaseColors[color];

    return (
        <motion.div
            className="phase-panel"
            style={{
                borderLeft: `2px solid ${c.border}`,
                background: isCollapsed ? c.bgCollapsed : c.bg,
                borderRadius: "0 12px 12px 0",
                position: "relative",
                overflow: "hidden",
            }}
            layout
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
            {/* Title row */}
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: isCollapsed ? "6px 14px" : "4px 18px 0",
            }}>
                <span style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontWeight: 500,
                    color: c.text,
                    opacity: isCollapsed ? 0.5 : 1,
                }}>
                    {title}
                </span>
                {isCollapsed && completedCount !== undefined && (
                    <motion.span
                        style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: c.text,
                            opacity: 0.6,
                        }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 0.6, scale: 1 }}
                    >
                        ✓ {completedCount}/{totalCount}
                    </motion.span>
                )}
            </div>

            {/* Expandable content */}
            <AnimatePresence initial={false}>
                {!isCollapsed && (
                    <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        style={{ overflow: "hidden" }}
                    >
                        <div style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 4,
                            padding: "4px 6px 6px",
                        }}
                            className="phase-content-desktop"
                        >
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

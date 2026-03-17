"use client";

/**
 * Sg1ValidationPanel — Right-side slide panel for SG-1 gate decision.
 * Matches GateModal design: card-style checklist, filled summary, note textarea.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Sg1ValidationPanelProps {
    open: boolean;
    isProcessing: boolean;
    pitch: string;
    horizonLabel: string;
    objectif: string;
    domains: string;
    impact: string;
    hasDuplicates?: boolean;
    onGo: () => void;
    onRework: (note?: string) => void;
    onAbandon: () => void;
}

const CheckIcon = ({ met }: { met: boolean }) => (
    <div style={{
        width: 18,
        height: 18,
        borderRadius: 4,
        border: met ? "none" : "1px solid var(--wf-muted-fg)",
        background: met ? "#22c55e" : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginTop: 1,
        opacity: met ? 1 : 0.35,
        transition: "all 0.2s",
    }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5L4 7L8 3" stroke={met ? "#fff" : "var(--wf-qualification)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    </div>
);

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "var(--wf-muted-fg)",
        }}>
            {label}
        </span>
        <span style={{ fontSize: 13, color: "var(--wf-fg)", lineHeight: 1.5 }}>
            {value || <span style={{ opacity: 0.4, fontStyle: "italic" }}>Not specified</span>}
        </span>
    </div>
);

export function Sg1ValidationPanel({
    open,
    isProcessing,
    pitch,
    horizonLabel,
    objectif,
    domains,
    impact,
    hasDuplicates = false,
    onGo,
    onRework,
    onAbandon,
}: Sg1ValidationPanelProps) {
    const [mode, setMode] = useState<"idle" | "rework" | "stop">("idle");
    const [noteText, setNoteText] = useState("");

    const handleConfirm = () => {
        if (!noteText.trim()) return;
        if (mode === "rework") onRework(noteText.trim());
        if (mode === "stop") onAbandon();
        setMode("idle");
        setNoteText("");
    };

    const handleCancel = () => {
        setMode("idle");
        setNoteText("");
    };

    const checklist: { label: string; met: boolean }[] = [
        { label: "Business need sufficiently formalized", met: pitch.trim().length > 20 },
        { label: "No confirmed duplicate detected", met: !hasDuplicates },
        { label: "Discovery sources reviewed", met: true },
    ];

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        style={{
                            position: "fixed",
                            inset: 0,
                            background: "rgba(10, 11, 16, 0.6)",
                            backdropFilter: "blur(4px)",
                            zIndex: 40,
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => !isProcessing && onRework()}
                    />

                    {/* Panel */}
                    <motion.div
                        style={{
                            position: "fixed",
                            right: 0,
                            top: 0,
                            height: "100%",
                            width: "100%",
                            maxWidth: 480,
                            background: "var(--wf-card)",
                            borderLeft: "1px solid var(--wf-border)",
                            zIndex: 50,
                            display: "flex",
                            flexDirection: "column",
                        }}
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
                    >
                        {/* Header */}
                        <div style={{ padding: 24, borderBottom: "1px solid var(--wf-border)" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                <span style={{
                                    fontFamily: "var(--font-mono)",
                                    fontSize: 10,
                                    color: "var(--wf-muted-fg)",
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase",
                                }}>
                                    SG-1
                                </span>
                                <button
                                    onClick={() => !isProcessing && onRework()}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        color: "var(--wf-muted-fg)",
                                        cursor: "pointer",
                                        fontSize: 14,
                                        padding: 4,
                                        lineHeight: 1,
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                            <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--wf-fg)", margin: 0 }}>
                                Validation of Business Need
                            </h2>
                            <p style={{ fontSize: 13, color: "var(--wf-muted-fg)", marginTop: 4, marginBottom: 0, lineHeight: 1.5 }}>
                                Review and confirm the business need before proceeding to discovery.
                            </p>
                        </div>

                        {/* Scrollable body */}
                        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>

                            {/* SUMMARY */}
                            <div>
                                <span style={{
                                    fontFamily: "var(--font-mono)",
                                    fontSize: 10,
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase",
                                    fontWeight: 500,
                                    color: "var(--wf-muted-fg)",
                                    display: "block",
                                    marginBottom: 14,
                                }}>
                                    Summary
                                </span>
                                <div style={{
                                    background: "var(--wf-muted)",
                                    border: "1px solid var(--wf-border)",
                                    borderRadius: 8,
                                    padding: 16,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 14,
                                }}>
                                    <SummaryRow label="Pitch" value={pitch} />
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                                        <SummaryRow label="Time Horizon" value={horizonLabel} />
                                        <SummaryRow label="Objective" value={objectif} />
                                    </div>
                                    <SummaryRow label="Domains" value={domains} />
                                    <SummaryRow label="Impact" value={impact} />
                                </div>
                            </div>

                            {/* CHECKLIST */}
                            <div>
                                <span style={{
                                    fontFamily: "var(--font-mono)",
                                    fontSize: 10,
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase",
                                    fontWeight: 500,
                                    color: "var(--wf-muted-fg)",
                                    display: "block",
                                    marginBottom: 14,
                                }}>
                                    Checklist
                                </span>
                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                    {checklist.map((item, i) => (
                                        <motion.div
                                            key={i}
                                            style={{
                                                display: "flex",
                                                alignItems: "flex-start",
                                                gap: 12,
                                                padding: 12,
                                                borderRadius: 6,
                                                background: "var(--wf-muted)",
                                                border: `1px solid ${item.met ? "rgba(34,197,94,0.2)" : "var(--wf-border)"}`,
                                            }}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.3 + i * 0.08 }}
                                        >
                                            <CheckIcon met={item.met} />
                                            <span style={{ fontSize: 13, color: "var(--wf-fg)", lineHeight: 1.5, opacity: item.met ? 1 : 0.6 }}>
                                                {item.label}
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            {/* Note textarea — REWORK or STOP mode */}
                            {mode !== "idle" && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                >
                                    <span style={{
                                        fontFamily: "var(--font-mono)",
                                        fontSize: 10,
                                        letterSpacing: "0.08em",
                                        textTransform: "uppercase",
                                        fontWeight: 500,
                                        color: "var(--wf-muted-fg)",
                                        display: "block",
                                        marginBottom: 8,
                                    }}>
                                        {mode === "rework" ? "Rework Note (required)" : "Reason for Abandon (required)"}
                                    </span>
                                    <textarea
                                        value={noteText}
                                        onChange={(e) => setNoteText(e.target.value)}
                                        placeholder={mode === "rework"
                                            ? "Explain what needs to be reworked…"
                                            : "Explain why this business need is being abandoned…"
                                        }
                                        autoFocus
                                        style={{
                                            width: "100%",
                                            minHeight: 80,
                                            padding: 12,
                                            borderRadius: 6,
                                            border: "1px solid var(--wf-border)",
                                            background: "var(--wf-bg)",
                                            color: "var(--wf-fg)",
                                            fontFamily: "var(--font-sans)",
                                            fontSize: 13,
                                            outline: "none",
                                            resize: "vertical",
                                            boxSizing: "border-box",
                                        }}
                                    />
                                </motion.div>
                            )}
                        </div>

                        {/* Actions */}
                        <div style={{
                            padding: 24,
                            borderTop: "1px solid var(--wf-border)",
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                        }}>
                            {mode === "idle" ? (
                                <>
                                    <button
                                        onClick={onGo}
                                        disabled={isProcessing}
                                        style={{
                                            width: "100%",
                                            padding: "11px 16px",
                                            borderRadius: 6,
                                            background: isProcessing ? "rgba(34,197,94,0.4)" : "#22c55e",
                                            color: "#000",
                                            fontWeight: 700,
                                            fontSize: 14,
                                            border: "none",
                                            cursor: isProcessing ? "not-allowed" : "pointer",
                                            fontFamily: "var(--font-mono)",
                                            letterSpacing: "0.06em",
                                            transition: "filter 0.15s",
                                        }}
                                        onMouseOver={(e) => { if (!isProcessing) e.currentTarget.style.filter = "brightness(1.1)"; }}
                                        onMouseOut={(e) => (e.currentTarget.style.filter = "")}
                                    >
                                        {isProcessing ? "Processing…" : "GO"}
                                    </button>
                                    <button
                                        onClick={() => setMode("rework")}
                                        disabled={isProcessing}
                                        style={{
                                            width: "100%",
                                            padding: "11px 16px",
                                            borderRadius: 6,
                                            background: "transparent",
                                            color: "var(--wf-muted-fg)",
                                            fontSize: 14,
                                            border: "1px solid var(--wf-border)",
                                            cursor: isProcessing ? "not-allowed" : "pointer",
                                            fontFamily: "var(--font-mono)",
                                            letterSpacing: "0.06em",
                                            transition: "all 0.15s",
                                        }}
                                        onMouseOver={(e) => { if (!isProcessing) { e.currentTarget.style.color = "var(--wf-fg)"; e.currentTarget.style.borderColor = "var(--wf-muted-fg)"; } }}
                                        onMouseOut={(e) => { e.currentTarget.style.color = "var(--wf-muted-fg)"; e.currentTarget.style.borderColor = "var(--wf-border)"; }}
                                    >
                                        REWORK
                                    </button>
                                    <button
                                        onClick={() => setMode("stop")}
                                        disabled={isProcessing}
                                        style={{
                                            width: "100%",
                                            padding: "11px 16px",
                                            borderRadius: 6,
                                            background: "transparent",
                                            color: "var(--wf-destructive)",
                                            fontSize: 14,
                                            border: "none",
                                            cursor: isProcessing ? "not-allowed" : "pointer",
                                            fontFamily: "var(--font-mono)",
                                            letterSpacing: "0.06em",
                                            transition: "background 0.15s",
                                        }}
                                        onMouseOver={(e) => { if (!isProcessing) e.currentTarget.style.background = "hsla(0,72%,51%,0.1)"; }}
                                        onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                                    >
                                        STOP / ABANDON
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={handleConfirm}
                                        disabled={!noteText.trim()}
                                        style={{
                                            width: "100%",
                                            padding: "11px 16px",
                                            borderRadius: 6,
                                            background: mode === "rework" ? "var(--wf-sourcing)" : "var(--wf-destructive)",
                                            color: "#fff",
                                            fontWeight: 600,
                                            fontSize: 14,
                                            border: "none",
                                            cursor: noteText.trim() ? "pointer" : "not-allowed",
                                            fontFamily: "var(--font-mono)",
                                            letterSpacing: "0.06em",
                                            opacity: noteText.trim() ? 1 : 0.4,
                                            transition: "opacity 0.15s",
                                        }}
                                    >
                                        Confirm {mode === "rework" ? "Rework" : "Abandon"}
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        style={{
                                            width: "100%",
                                            padding: "11px 16px",
                                            borderRadius: 6,
                                            background: "transparent",
                                            color: "var(--wf-muted-fg)",
                                            fontSize: 14,
                                            border: "1px solid var(--wf-border)",
                                            cursor: "pointer",
                                            fontFamily: "var(--font-mono)",
                                            letterSpacing: "0.06em",
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

/**
 * Evaluation / Comparaison page (QUALIFICATION PHASE — after SG-1 GO).
 */

"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { WorkflowBar } from "@/components/layout/WorkflowBar";
import { StageGate } from "@/components/gates/StageGate";

const STUB_SELECTED = [
    { name: "DXC SmartAssist AI", fit: 3, feasibility: 4, cost: 2, innovation: 5 },
    { name: "Mistral AI", fit: 5, feasibility: 5, cost: 4, innovation: 5 },
    { name: "LLM-Powered Document Extraction", fit: 4, feasibility: 3, cost: 3, innovation: 4 },
];

const CRITERIA = ["fit", "feasibility", "cost", "innovation"] as const;

function EvaluationPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const ipmId = searchParams.get("id") || undefined;
    const [scores, setScores] = useState(STUB_SELECTED.map(s => ({ ...s })));
    const [showGate, setShowGate] = useState(false);
    const [sg2State, setSg2State] = useState<{ cardStates: Record<string, string>; totalSelected: number }>({
        cardStates: {},
        totalSelected: 0,
    });

    useEffect(() => {
        const saved = localStorage.getItem("ipm_sg2_state");
        if (saved) {
            try { setSg2State(JSON.parse(saved)); } catch { /* malformed — ignore */ }
        }
    }, []);

    useEffect(() => {
        const canvas = document.getElementById("bg-canvas") as HTMLCanvasElement | null;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        ctx.fillStyle = "rgba(180, 120, 60, 0.045)";
        ctx.font = "11px DM Mono, monospace";
        const chars = "0123456789ABCDEF";
        for (let x = 0; x < canvas.width; x += 28) {
            for (let y = 0; y < canvas.height; y += 20) {
                ctx.fillText(chars[Math.floor(Math.random() * chars.length)], x + Math.random() * 8, y + Math.random() * 6);
            }
        }
    }, []);

    const updateScore = (itemIdx: number, criterion: string, value: number) => {
        setScores((prev) => prev.map((s, i) => i === itemIdx ? { ...s, [criterion]: value } : s));
    };

    return (
        <div className="app-shell">
            <canvas id="bg-canvas" style={{ position: "fixed", top: 0, left: 0, zIndex: -1 }} />
            <WorkflowBar currentStep="evaluation" status="solutions_reviewed" ipmId={ipmId} />

            <div className="app-content">
                <div className="glow-divider" />
                <div className="stub-page">
                    <div className="stub-page-header">
                        <h1 className="stub-page-title">Evaluation / Comparaison</h1>
                        <button className="action-btn primary" onClick={() => setShowGate(true)}>
                            Proceed to SG-3 →
                        </button>
                    </div>

                    <div className="stub-banner">
                        <span className="stub-banner-icon">📊</span>
                        Score each solution on 4 criteria (1-5). AI ranking will be available in Phase 2.
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: `200px repeat(${CRITERIA.length}, 1fr)`, gap: 1, background: "var(--border-default)", borderRadius: 12, overflow: "hidden" }}>
                        <div style={{ padding: "10px 14px", background: "var(--bg-inner)", fontWeight: 500, fontSize: 12 }}>Solution</div>
                        {CRITERIA.map((c) => (
                            <div key={c} style={{ padding: "10px 14px", background: "var(--bg-inner)", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", textAlign: "center" }}>{c}</div>
                        ))}

                        {scores.map((item, i) => (
                            <React.Fragment key={i}>
                                <div style={{ padding: "10px 14px", background: "var(--bg-card)", fontSize: 12, color: "var(--text-primary)" }}>{item.name}</div>
                                {CRITERIA.map((c) => (
                                    <div key={`${i}-${c}`} style={{ padding: "8px", background: "var(--bg-card)", display: "flex", justifyContent: "center" }}>
                                        <select
                                            value={scores[i][c as keyof typeof scores[0]] as number}
                                            onChange={(e) => updateScore(i, c, Number(e.target.value))}
                                            style={{ background: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border-input)", borderRadius: 6, padding: "4px 8px", fontSize: 12, fontFamily: "var(--font-mono)" }}
                                        >
                                            {[1, 2, 3, 4, 5].map((v) => (
                                                <option key={v} value={v}>{v}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>

            {showGate && (
                <StageGate
                    gateId="SG-3"
                    title="Passage en Qualification"
                    checklist={[
                        { label: "DXC Internal Catalog reviewed", met: sg2State.cardStates["dxc_catalog"] === "done" },
                        { label: "Tech Signals reviewed", met: sg2State.cardStates["tech_signals"] === "done" },
                        { label: "At least one solution selected", met: sg2State.totalSelected >= 1 },
                    ]}
                    onGo={() => {
                        router.push(`/selection?id=${ipmId}`);
                    }}
                    onRework={(note) => {
                        router.push(`/evaluation?id=${ipmId}`);
                    }}
                    onStop={(reason) => {
                        window.location.href = "/dashboard";
                    }}
                    onClose={() => setShowGate(false)}
                />
            )}
        </div>
    );
}

export default function EvaluationPage() {
    return (
        <Suspense fallback={<div className="app-shell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading...</div>}>
            <EvaluationPageContent />
        </Suspense>
    );
}

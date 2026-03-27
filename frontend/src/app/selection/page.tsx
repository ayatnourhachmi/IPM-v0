/**
 * Selection page (QUALIFICATION PHASE — after SG-3 GO).
 * No gate on this page — user proceeds directly to Recos.
 */

"use client";

import React, { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { WorkflowBar } from "@/components/layout/WorkflowBar";

function SelectionPageContent() {
    const searchParams = useSearchParams();
    const ipmId = searchParams.get("id") || undefined;

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

    return (
        <div className="app-shell">
            <canvas id="bg-canvas" style={{ position: "fixed", top: 0, left: 0, zIndex: -1 }} />
            <WorkflowBar currentStep="selection" status="in_qualification" ipmId={ipmId} />

            <div className="app-content">
                <div className="glow-divider" />
                <div className="stub-page">
                    <div className="stub-page-header">
                        <h1 className="stub-page-title">Selection</h1>
                        <button className="action-btn primary" onClick={() => window.location.href = `/recos?id=${ipmId}`}>
                            Proceed to Recos →
                        </button>
                    </div>

                    <div className="stub-banner">
                        <span className="stub-banner-icon">🎯</span>
                        Final choice: select one solution to implement. Scoring and ROI analysis are complete.
                    </div>

                    <div style={{ display: "grid", gap: 12 }}>
                        {[
                            { name: "Mistral AI (Recommended)", desc: "Best performance and fit for DXC infrastructure.", score: "4.8/5" },
                            { name: "DXC SmartAssist AI", desc: "Internal solution with existing support.", score: "4.2/5" }
                        ].map((choice, i) => (
                            <div key={i} style={{ padding: "16px", background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 500 }}>{choice.name}</div>
                                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{choice.desc}</div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <div style={{ fontSize: 16, fontWeight: 600, color: "var(--accent)" }}>{choice.score}</div>
                                    <button style={{ marginTop: 8, padding: "4px 12px", borderRadius: 6, border: "1px solid var(--accent)", background: "transparent", color: "var(--accent)", fontSize: 11, cursor: "pointer" }}>Select</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SelectionPage() {
    return (
        <Suspense fallback={<div className="app-shell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading...</div>}>
            <SelectionPageContent />
        </Suspense>
    );
}

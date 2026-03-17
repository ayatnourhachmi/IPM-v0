/**
 * Recommendations and Output page (DELIVERY PHASE — after SG-3 GO).
 */

"use client";

import React, { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { WorkflowBar } from "@/components/layout/WorkflowBar";

function RecosPageContent() {
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
            <WorkflowBar currentStep="recos" status="delivery" ipmId={ipmId} />

            <div className="app-content">
                <div className="glow-divider" />
                <div className="stub-page">
                    <div className="stub-page-header">
                        <h1 className="stub-page-title">Recommendations & Export</h1>
                        <button className="action-btn primary" onClick={() => window.location.href = "/dashboard"}>
                            Final Archive →
                        </button>
                    </div>

                    <div className="stub-banner">
                        <span className="stub-banner-icon">📄</span>
                        Qualification complete. Generate your final delivery documents here.
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                        <div style={{ padding: "24px", background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 12, textAlign: "center" }}>
                            <div style={{ fontSize: 40, marginBottom: 16 }}>📄</div>
                            <div style={{ fontWeight: 600, fontSize: 16 }}>PDF Report</div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>Comprehensive recommendation with solution details and ROI.</div>
                            <button className="action-btn" style={{ marginTop: 20, width: "100%" }}>Download PDF</button>
                        </div>
                        <div style={{ padding: "24px", background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 12, textAlign: "center" }}>
                            <div style={{ fontSize: 40, marginBottom: 16 }}>📝</div>
                            <div style={{ fontWeight: 600, fontSize: 16 }}>DOCX Proposal</div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>Editable Word document for project launch and formalization.</div>
                            <button className="action-btn" style={{ marginTop: 20, width: "100%" }}>Download DOCX</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function RecosPage() {
    return (
        <Suspense fallback={<div className="app-shell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading...</div>}>
            <RecosPageContent />
        </Suspense>
    );
}

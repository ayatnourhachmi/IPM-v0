/**
 * Discovery page — 4 tool cards, selection recap, proceed to qualification.
 */

"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { WorkflowBar } from "@/components/layout/WorkflowBar";
import { DiscoveryPanel } from "@/components/discovery/DiscoveryPanel";
import type { DiscoveryItem } from "@/lib/discoveryStubs";

function DiscoveryPageContent() {
    const searchParams = useSearchParams();
    const ipmId = searchParams.get("id") || undefined;
    const [selectedItems, setSelectedItems] = useState<DiscoveryItem[]>([]);

    useEffect(() => {
        const canvas = document.getElementById("bg-canvas") as HTMLCanvasElement | null;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const chars = "0123456789ABCDEF";
        ctx.fillStyle = "rgba(99, 91, 255, 0.03)";
        ctx.font = "11px DM Mono, monospace";
        for (let x = 0; x < canvas.width; x += 28) {
            for (let y = 0; y < canvas.height; y += 20) {
                ctx.fillText(chars[Math.floor(Math.random() * chars.length)], x + Math.random() * 8, y + Math.random() * 6);
            }
        }
    }, []);

    return (
        <div className="app-shell">
            <canvas id="bg-canvas" style={{ position: "fixed", top: 0, left: 0, zIndex: -1 }} />
            <WorkflowBar currentStep="discovery" status="draft" ipmId={ipmId} />

            <div className="app-content" style={{ overflowY: "auto" }}>
                <div className="glow-divider" />

                <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 300 }}>Discovery</h1>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                            Launch tools to surface relevant solutions, signals, and opportunities
                        </div>
                    </div>
                    <button
                        className={`disc-proceed-btn${selectedItems.length > 0 ? " ready" : ""}`}
                        disabled={selectedItems.length === 0}
                        onClick={() => {
                            window.location.href = `/evaluation?id=${ipmId}`;
                        }}
                    >
                        Proceed to Qualification →
                    </button>
                </div>

                <DiscoveryPanel onSelectionChange={setSelectedItems} />
            </div>
        </div>
    );
}

export default function DiscoveryPage() {
    return (
        <Suspense fallback={<div className="app-shell" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>Loading...</div>}>
            <DiscoveryPageContent />
        </Suspense>
    );
}

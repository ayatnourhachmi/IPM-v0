"use client";

import React from "react";
import { IpmFlowShell } from "@/components/sourcing/IpmFlowShell";
import { NeedCard } from "@/components/dashboard/NeedCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useNeeds } from "@/hooks/useNeeds";

export default function DashboardPage() {
    const { needs, isLoading, error, refresh } = useNeeds();

    return (
        <IpmFlowShell workflowState="business_need">
            <section className="ipm-dashboard-workspace">
                <div className="dashboard-panel">
                    <div className="dash-header">
                        <div className="dash-title-block">
                            <h2 className="dash-headline">My initiatives</h2>
                            {!isLoading && (
                                <p className="dash-count">
                                    {needs.length} initiative{needs.length !== 1 ? "s" : ""} in your pipeline
                                </p>
                            )}
                        </div>
                        <a href="/sourcing" className="dash-new-btn">New Need</a>
                    </div>

                    {isLoading && (
                        <div className="page-loader">
                            <span className="page-spinner" />
                            Loading initiatives…
                        </div>
                    )}

                    {error && (
                        <div className="dashboard-error">
                            <p>{error}</p>
                            <button type="button" onClick={refresh}>Retry</button>
                        </div>
                    )}

                    {!isLoading && !error && needs.length === 0 && <EmptyState />}

                    {!isLoading && !error && needs.length > 0 && (
                        <div className="dash-grid">
                            {needs.map((need) => (
                                <NeedCard key={need.id} need={need} />
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </IpmFlowShell>
    );
}

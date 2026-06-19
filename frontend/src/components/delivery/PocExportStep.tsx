"use client";

import type { SolutionRecommendations } from "@/lib/types";

export function PocExportStep({
    recommendations,
    exportSelectedIds,
    exportRecommendationsCount,
    exportError,
    isExportingPdf,
    isExportingDocx,
    canExport,
    onToggleExport,
    onSelectAllExport,
    onClearExport,
    onPdfExport,
    onDocxExport,
    onSendEmail,
    onArchive,
}: {
    recommendations: SolutionRecommendations[];
    exportSelectedIds: Set<string>;
    exportRecommendationsCount: number;
    exportError: string | null;
    isExportingPdf: boolean;
    isExportingDocx: boolean;
    canExport: boolean;
    onToggleExport: (solutionId: string) => void;
    onSelectAllExport: () => void;
    onClearExport: () => void;
    onPdfExport: () => void;
    onDocxExport: () => void;
    onSendEmail: () => void;
    onArchive: () => void;
}) {
    return (
        <section className="ipm-sourcing-workspace ipm-delivery-workspace ipm-poc-export-workspace">
            <aside className="ipm-summary-panel ipm-delivery-actions">
                <div className="qualification-card delivery-summary-card">
                    <div className="qualification-section-heading">PoC preparation</div>
                    <h2>Export package</h2>
                    <p className="delivery-summary-copy">
                        Choose one or more bundles to include, then download or send the PoC preparation document.
                    </p>
                    <div className="decision-stats">
                        <span>
                            <strong>{exportRecommendationsCount}</strong>
                            Included
                        </span>
                        <span>
                            <strong>{recommendations.length}</strong>
                            Bundles
                        </span>
                    </div>
                </div>

                <ul className="delivery-export-bundle-list">
                    {recommendations.map((rec) => (
                        <li key={rec.solution_id}>
                            <label className="delivery-export-bundle-item">
                                <input
                                    type="checkbox"
                                    checked={exportSelectedIds.has(rec.solution_id)}
                                    onChange={() => onToggleExport(rec.solution_id)}
                                />
                                <span>{rec.solution_name}</span>
                            </label>
                        </li>
                    ))}
                </ul>

                <div className="qualification-actions">
                    <button type="button" className="ipm-outline-action" onClick={onArchive}>
                        Final Archive
                    </button>
                </div>
            </aside>

            <div className="ipm-step-column">
                <h2 className="ipm-step-title">
                    STEP 6 - <span>POC PREPARATION</span>
                </h2>
                <p className="ipm-step-subtitle">
                    Download the PoC preparation package or send it by email.
                </p>
                <div className="delivery-export-toolbar delivery-export-toolbar-compact">
                    <div>
                        <span className="qualification-section-heading">Export selection</span>
                        <p>Choose one or more bundles to include in the DOCX export, PDF conversion, or email.</p>
                    </div>
                    <div className="delivery-export-toolbar-actions">
                        <span className="delivery-tag">{exportRecommendationsCount} included</span>
                        <button type="button" className="ipm-outline-action delivery-toolbar-btn" onClick={onSelectAllExport}>
                            Select all
                        </button>
                        <button type="button" className="ipm-outline-action delivery-toolbar-btn" onClick={onClearExport}>
                            Clear
                        </button>
                    </div>
                </div>

                <div className="delivery-main">
                    {exportError && <div className="qualification-alert danger">{exportError}</div>}

                    <div className="poc-export-grid">
                        <div className="qualification-card poc-export-card">
                            <div className="poc-export-card-head">
                                <div>
                                    <h3>PoC preparation document</h3>
                                    <p>Canonical editable package in DOCX format.</p>
                                </div>
                                <span className="delivery-tag delivery-tag-icon delivery-tag-docx" aria-hidden="true">
                                    <img src="/icons/docx.png" alt="" />
                                </span>
                            </div>
                            <p className="poc-export-note">
                                {canExport
                                    ? `${exportRecommendationsCount} bundle${exportRecommendationsCount === 1 ? "" : "s"} included`
                                    : "Select at least one bundle in the export list"}
                            </p>
                            <button
                                type="button"
                                className="ipm-primary-action"
                                onClick={onDocxExport}
                                disabled={isExportingDocx || !canExport}
                            >
                                {isExportingDocx ? "Generating DOCX..." : "Download DOCX"}
                            </button>
                        </div>

                        <div className="qualification-card poc-export-card">
                            <div className="poc-export-card-head">
                                <div>
                                    <h3>PoC preparation PDF</h3>
                                    <p>PDF converted from the same canonical DOCX document.</p>
                                </div>
                                <span className="delivery-tag delivery-tag-icon delivery-tag-pdf" aria-hidden="true">
                                    <img src="/icons/pdf.png" alt="" />
                                </span>
                            </div>
                            <p className="poc-export-note">
                                {canExport
                                    ? `${exportRecommendationsCount} bundle${exportRecommendationsCount === 1 ? "" : "s"} included`
                                    : "Select at least one bundle in the export list"}
                            </p>
                            <button
                                type="button"
                                className="ipm-primary-action"
                                onClick={onPdfExport}
                                disabled={isExportingPdf || !canExport}
                            >
                                {isExportingPdf ? "Converting PDF..." : "Download PDF"}
                            </button>
                        </div>

                        <div className="qualification-card poc-export-card poc-export-card-email">
                            <div className="poc-export-card-head">
                                <div>
                                    <h3>Send via email</h3>
                                    <p>Share the PoC preparation package with stakeholders.</p>
                                </div>
                                <span className="delivery-tag delivery-tag-icon delivery-tag-email" aria-hidden="true">
                                    <img src="/icons/email.png" alt="" />
                                </span>
                            </div>
                            <p className="poc-export-note">
                                {canExport
                                    ? "Opens your email client with the export attached or linked."
                                    : "Select at least one bundle before sending"}
                            </p>
                            <button
                                type="button"
                                className="ipm-outline-action"
                                onClick={onSendEmail}
                                disabled={!canExport}
                            >
                                Send via email
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

"use client";

import type { SolutionRecommendations } from "@/lib/types";

export function PocExportStep({
    recommendations,
    exportSelectedIds,
    exportRecommendationsCount,
    exportMessage,
    exportMessageKind,
    isExportingPdf,
    isExportingDocx,
    isSendingEmail,
    canExport,
    emailRecipient,
    emailFormat,
    onToggleExport,
    onSelectAllExport,
    onClearExport,
    onEmailRecipientChange,
    onEmailFormatChange,
    onPdfExport,
    onDocxExport,
    onSendEmail,
    onArchive,
}: {
    recommendations: SolutionRecommendations[];
    exportSelectedIds: Set<string>;
    exportRecommendationsCount: number;
    exportMessage: string | null;
    exportMessageKind: "success" | "error";
    isExportingPdf: boolean;
    isExportingDocx: boolean;
    isSendingEmail: boolean;
    canExport: boolean;
    emailRecipient: string;
    emailFormat: "pdf" | "docx";
    onToggleExport: (solutionId: string) => void;
    onSelectAllExport: () => void;
    onClearExport: () => void;
    onEmailRecipientChange: (email: string) => void;
    onEmailFormatChange: (format: "pdf" | "docx") => void;
    onPdfExport: () => void;
    onDocxExport: () => void;
    onSendEmail: () => void;
    onArchive: () => void;
}) {
    return (
        <section className="ipm-sourcing-workspace ipm-delivery-workspace ipm-poc-export-workspace">
            <aside className="ipm-summary-panel ipm-delivery-actions">
                <div className="qualification-card delivery-summary-card">
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
                        <span className="delivery-tag delivery-export-count-tag">{exportRecommendationsCount} included</span>
                    </div>
                    <div className="delivery-export-toolbar-actions">
                        <div className="delivery-export-button-stack">
                            <button type="button" className="ipm-outline-action delivery-toolbar-btn" onClick={onSelectAllExport}>
                                Select all
                            </button>
                            <button type="button" className="ipm-outline-action delivery-toolbar-btn" onClick={onClearExport}>
                                Clear
                            </button>
                        </div>
                    </div>
                </div>

                <div className="delivery-main">
                    {exportMessage && (
                        <div className={`qualification-alert ${exportMessageKind === "error" ? "danger" : "success"}`}>
                            {exportMessage}
                        </div>
                    )}

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
                                    ? "Sends the selected PoC dossier as an email attachment."
                                    : "Select at least one bundle before sending"}
                            </p>
                            <label className="qualification-section-heading" htmlFor="delivery-email-recipient">
                                Recipient
                            </label>
                            <input
                                id="delivery-email-recipient"
                                type="email"
                                className="ipm-input"
                                placeholder="stakeholder@example.com"
                                value={emailRecipient}
                                onChange={(event) => onEmailRecipientChange(event.target.value)}
                                disabled={isSendingEmail}
                            />
                            <div className="email-format-options" role="radiogroup" aria-label="Email attachment format">
                                <label className="email-format-option">
                                    <input
                                        type="radio"
                                        name="delivery-email-format"
                                        value="pdf"
                                        checked={emailFormat === "pdf"}
                                        onChange={() => onEmailFormatChange("pdf")}
                                        disabled={isSendingEmail}
                                    />
                                    <span>PDF</span>
                                </label>
                                <label className="email-format-option">
                                    <input
                                        type="radio"
                                        name="delivery-email-format"
                                        value="docx"
                                        checked={emailFormat === "docx"}
                                        onChange={() => onEmailFormatChange("docx")}
                                        disabled={isSendingEmail}
                                    />
                                    <span>DOCX</span>
                                </label>
                            </div>
                            <button
                                type="button"
                                className="ipm-outline-action"
                                onClick={onSendEmail}
                                disabled={!canExport || isSendingEmail || emailRecipient.trim().length === 0}
                            >
                                {isSendingEmail ? "Sending..." : "Send via email"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

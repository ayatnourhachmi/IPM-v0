/**
 * Recommendations and Output page (DELIVERY PHASE).
 * VC-4 must be passed before PDF/DOCX export buttons become active.
 */

"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createFlowStepClickHandler, IpmFlowShell } from "@/components/sourcing/IpmFlowShell";
import type { SourcingWorkflowStepId } from "@/components/sourcing/SourcingWorkflowProgress";
import { DeliveryStep, type DeliverySolution } from "@/components/delivery/DeliveryStep";
import { PocExportStep } from "@/components/delivery/PocExportStep";
import { Sg4ValidationPanel } from "@/components/sourcing/Sg4ValidationPanel";
import { PhaseLoading } from "@/components/sourcing/PhaseLoading";
import { emailRecommendationsDossier, exportRecommendationsDocx, exportRecommendationsPdf, getNeed, getRecommendations, updateNeedStatus } from "@/lib/api";
import type { ExportReportRequest, SolutionRecommendations, GapAnalysisResponse, RecommendationSolutionPayload } from "@/lib/types";

/** Saved from Discovery — matches localStorage + gap-analysis API shape */
type DiscoverySelectedSolution = {
    id: string;
    name: string;
    relevance?: number;
    description?: string;
    source?: string;
    features?: string[];
    business_impact?: string;
    maturity_level?: string;
    gap_analysis?: GapAnalysisResponse | null;
};

function RecosPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const ipmId = searchParams.get("id") || undefined;
    const [showGate, setShowGate] = useState(false);
    const [gateCleared, setGateCleared] = useState(false);
    const [deliverySolutions, setDeliverySolutions] = useState<DeliverySolution[]>([]);
    const [selectedSolutions, setSelectedSolutions] = useState<DiscoverySelectedSolution[]>([]);
    const [recommendations, setRecommendations] = useState<SolutionRecommendations[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [isExportingDocx, setIsExportingDocx] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [exportMessage, setExportMessage] = useState<string | null>(null);
    const [exportMessageKind, setExportMessageKind] = useState<"success" | "error">("error");
    const [emailRecipient, setEmailRecipient] = useState("");
    const [emailFormat, setEmailFormat] = useState<"pdf" | "docx">("pdf");
    const [exportSelectedIds, setExportSelectedIds] = useState<Set<string>>(new Set());
    const [deliveryView, setDeliveryView] = useState<"recommendations" | "poc_export">("recommendations");

    useEffect(() => {
        const saved = localStorage.getItem("ipm_delivery_solutions");
        if (saved) {
            try {
                setDeliverySolutions(JSON.parse(saved));
            } catch {
                setDeliverySolutions([]);
            }
        }

        const savedSelected = localStorage.getItem("ipm_selected_solutions");
        if (savedSelected) {
            try {
                setSelectedSolutions(JSON.parse(savedSelected));
            } catch {
                setSelectedSolutions([]);
            }
        }
    }, []);

    useEffect(() => {
        if (!ipmId) return;
        getNeed(ipmId)
            .then((need) => {
                if (need.status === "delivery") {
                    setGateCleared(true);
                }
            })
            .catch(() => {
                /* keep default gate state */
            });
    }, [ipmId]);

    useEffect(() => {
        if (!ipmId || deliverySolutions.length === 0) {
            setRecommendations([]);
            setExportSelectedIds(new Set());
            return;
        }

        const selectedById = new Map(selectedSolutions.map((solution) => [solution.id, solution]));
        const payload: RecommendationSolutionPayload[] = deliverySolutions.map((solution) => {
            const selectedContext = selectedById.get(solution.id);
            return {
                id: solution.id,
                name: solution.name,
                relevance: solution.relevance,
                overall: solution.overall,
                description: selectedContext?.description || "",
                source: selectedContext?.source || "",
                features: selectedContext?.features || [],
                business_impact: selectedContext?.business_impact || "",
                maturity_level: selectedContext?.maturity_level || "",
                gap_analysis: selectedContext?.gap_analysis || null,
                evaluation_scores: selectedContext?.gap_analysis?.evaluation_scores || null,
            };
        });

        let cancelled = false;
        setIsGenerating(true);
        setGenerationError(null);

        getRecommendations(ipmId, { selected_solutions: payload })
            .then((result) => {
                if (cancelled) return;
                setRecommendations(result.recommendations || []);
                setExportSelectedIds(new Set((result.recommendations || []).map((rec) => rec.solution_id)));
            })
            .catch((error) => {
                if (cancelled) return;
                setGenerationError(error instanceof Error ? error.message : "Unable to generate recommendations.");
                setRecommendations([]);
                setExportSelectedIds(new Set());
            })
            .finally(() => {
                if (!cancelled) setIsGenerating(false);
            });

        return () => {
            cancelled = true;
        };
    }, [ipmId, deliverySolutions, selectedSolutions]);

    const toggleExportSelection = (solutionId: string) => {
        setExportSelectedIds((current) => {
            const next = new Set(current);
            if (next.has(solutionId)) next.delete(solutionId);
            else next.add(solutionId);
            return next;
        });
    };

    const exportRecommendations = recommendations.filter((rec) => exportSelectedIds.has(rec.solution_id));
    const canExport = gateCleared && exportRecommendations.length > 0 && Boolean(ipmId);

    const technicalRecommendationsCount = recommendations.reduce((sum, rec) => sum + rec.technical_recommendations.length, 0);
    const organizationalRecommendationsCount = recommendations.reduce((sum, rec) => sum + rec.organizational_recommendations.length, 0);
    const kpiCount = recommendations.reduce((sum, rec) => sum + rec.kpis.length, 0);

    const buildExportPayload = (): ExportReportRequest => ({
        recommendations: exportRecommendations,
        delivery_solutions: deliverySolutions.filter((solution) => exportSelectedIds.has(solution.id)),
    });

    const triggerDownload = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    const handlePdfExport = async () => {
        if (!ipmId || !canExport) return;
        setExportMessage(null);
        setIsExportingPdf(true);
        try {
            const blob = await exportRecommendationsPdf(ipmId, buildExportPayload());
            triggerDownload(blob, `${ipmId.toLowerCase()}-recommendations.pdf`);
        } catch (error) {
            setExportMessageKind("error");
            setExportMessage(error instanceof Error ? error.message : "PDF export failed.");
        } finally {
            setIsExportingPdf(false);
        }
    };

    const handleDocxExport = async () => {
        if (!ipmId || !canExport) return;
        setExportMessage(null);
        setIsExportingDocx(true);
        try {
            const blob = await exportRecommendationsDocx(ipmId, buildExportPayload());
            triggerDownload(blob, `${ipmId.toLowerCase()}-recommendations.docx`);
        } catch (error) {
            setExportMessageKind("error");
            setExportMessage(error instanceof Error ? error.message : "DOCX export failed.");
        } finally {
            setIsExportingDocx(false);
        }
    };

    const handleSendEmail = async () => {
        if (!ipmId || !canExport) return;
        const recipient = emailRecipient.trim();
        if (!recipient) {
            setExportMessageKind("error");
            setExportMessage("Enter a recipient email address before sending.");
            return;
        }
        const bundleNames = exportRecommendations.map((rec) => rec.solution_name).join(", ");
        setExportMessage(null);
        setIsSendingEmail(true);
        try {
            const result = await emailRecommendationsDossier(ipmId, {
                ...buildExportPayload(),
                to_email: recipient,
                format: emailFormat,
                subject: `PoC preparation dossier - ${ipmId}`,
                message: `Hello,\n\nPlease find attached the PoC preparation dossier for ${ipmId}.\n\nIncluded solution bundle(s): ${bundleNames || "Not specified"}.\n\nRegards,\nIPM Flow`,
            });
            setExportMessageKind("success");
            setExportMessage(`Email sent to ${result.recipient} with attachment ${result.filename}.`);
        } catch (error) {
            setExportMessageKind("error");
            setExportMessage(error instanceof Error ? error.message : "Email sending failed.");
        } finally {
            setIsSendingEmail(false);
        }
    };

    const workflowState = deliveryView === "poc_export" ? "export" : "recommendations";
    const navigateStep = createFlowStepClickHandler(router, ipmId);
    const handleStepClick = (stepId: SourcingWorkflowStepId) => {
        if (stepId === "recommendations") {
            setDeliveryView("recommendations");
            return;
        }
        if (stepId === "export") {
            if (gateCleared) setDeliveryView("poc_export");
            return;
        }
        navigateStep(stepId);
    };

    return (
        <IpmFlowShell workflowState={workflowState} onStepClick={handleStepClick}>
            {deliveryView === "poc_export" ? (
                <PocExportStep
                    recommendations={recommendations}
                    exportSelectedIds={exportSelectedIds}
                    exportRecommendationsCount={exportRecommendations.length}
                    exportMessage={exportMessage}
                    exportMessageKind={exportMessageKind}
                    isExportingPdf={isExportingPdf}
                    isExportingDocx={isExportingDocx}
                    isSendingEmail={isSendingEmail}
                    canExport={canExport}
                    emailRecipient={emailRecipient}
                    emailFormat={emailFormat}
                    onToggleExport={toggleExportSelection}
                    onSelectAllExport={() => setExportSelectedIds(new Set(recommendations.map((rec) => rec.solution_id)))}
                    onClearExport={() => setExportSelectedIds(new Set())}
                    onEmailRecipientChange={setEmailRecipient}
                    onEmailFormatChange={setEmailFormat}
                    onPdfExport={handlePdfExport}
                    onDocxExport={handleDocxExport}
                    onSendEmail={handleSendEmail}
                    onArchive={() => router.push("/dashboard")}
                />
            ) : (
                <DeliveryStep
                    gateCleared={gateCleared}
                    deliverySolutions={deliverySolutions}
                    recommendations={recommendations}
                    isGenerating={isGenerating}
                    generationError={generationError}
                    onValidateSg4={() => setShowGate(true)}
                    onContinueToExport={() => setDeliveryView("poc_export")}
                />
            )}

            {showGate && (
                <Sg4ValidationPanel
                    open={showGate}
                    deliverySolutions={deliverySolutions}
                    hasRecommendations={recommendations.length > 0}
                    technicalRecommendationsCount={technicalRecommendationsCount}
                    organizationalRecommendationsCount={organizationalRecommendationsCount}
                    kpiCount={kpiCount}
                    onGo={async () => {
                        if (ipmId && deliverySolutions.length > 0) {
                            await updateNeedStatus(ipmId, { status: "delivery" });
                        }
                        setGateCleared(true);
                        setShowGate(false);
                    }}
                    onRework={() => setShowGate(false)}
                    onAbandon={() => {
                        router.push("/dashboard");
                    }}
                    onClose={() => setShowGate(false)}
                />
            )}
        </IpmFlowShell>
    );
}

export default function RecosPage() {
    return (
        <Suspense fallback={<PhaseLoading phase="delivery" variant="page" label="Loading recommendations..." />}>
            <RecosPageContent />
        </Suspense>
    );
}

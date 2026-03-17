/**
 * TypeScript interfaces mirroring backend Pydantic schemas.
 */

export type Horizon = "court_terme" | "moyen_terme" | "long_terme";

export type Status = "draft" | "submitted" | "rework" | "abandoned" | "in_qualification" | "delivery";

export type Objectif = "cost_reduction" | "cx_improvement" | "risk_mitigation" | "market_opportunity";

export type Origine = "enjeu_marche" | "probleme_operationnel" | "demande_client";

export interface Tags {
    objectif: Objectif;
    domaine: string[];
    impact: string[];
    origine: Origine;
}

export const CATEGORIES = ["Coût", "Expérience client", "Risque", "Opportunité marché"] as const;
export type Category = (typeof CATEGORIES)[number];

export interface DuplicateMatch {
    id: string;
    pitch: string;
    status: Status;
    similarity_score: number;
}

export interface Suggestion {
    label: string;
    text: string;
}

export interface BusinessNeed {
    id: string;
    pitch: string;
    horizon: Horizon;
    tags: Tags;
    status: Status;
    rework_note?: string | null;
    duplicate_matches: DuplicateMatch[];
    created_at: string;
    updated_at: string;
}

export interface AnalyzeResponse {
    tags: Tags;
    suggestions: Suggestion[];
}

export interface CreateNeedRequest {
    pitch: string;
    horizon: Horizon;
}

export interface UpdateStatusRequest {
    status: Status;
    note?: string;
}

export const HORIZON_LABELS: Record<Horizon, { label: string; detail: string }> = {
    court_terme: { label: "Short term", detail: "< 3 months" },
    moyen_terme: { label: "Mid term", detail: "6–12 months" },
    long_terme: { label: "Long term", detail: "> 1 year" },
};

export const STATUS_LABELS: Record<Status, string> = {
    draft: "Draft",
    submitted: "Submitted",
    rework: "Rework",
    abandoned: "Abandoned",
    in_qualification: "In Qualification",
    delivery: "Delivery",
};

export const OBJECTIF_LABELS: Record<Objectif, string> = {
    cost_reduction: "Cost Reduction",
    cx_improvement: "CX Improvement",
    risk_mitigation: "Risk Mitigation",
    market_opportunity: "Market Opportunity",
};

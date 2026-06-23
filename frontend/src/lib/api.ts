/**
 * Typed fetch wrapper for all IPM API endpoints.
 */

import type { AnalyzeResponse, AnalyzeSuggestionsResponse, AnalyzeTagsResponse, BusinessNeed, CatalogProduct, CatalogSearchResponse, CreateNeedRequest, EmailDossierRequest, EmailDossierResponse, ExportReportRequest, GapAnalysisResponse, RecommendationsRequest, RecommendationsResponse, UpdateStatusRequest } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const DEFAULT_REQUEST_TIMEOUT_MS = 8000;
const ANALYZE_REQUEST_TIMEOUT_MS = 20000;

function timeoutErrorMessage() {
    return "The request timed out. Please try again.";
}

async function request<T>(
    path: string,
    options: RequestInit = {},
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS
): Promise<T> {
    const url = `${API_BASE_URL}${path}`;
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, {
            headers: { "Content-Type": "application/json", ...options.headers },
            ...options,
            signal: options.signal ?? controller.signal,
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: res.statusText }));
            throw new Error(error.detail || `API error: ${res.status}`);
        }

        return res.json() as Promise<T>;
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            throw new Error(timeoutErrorMessage());
        }
        throw error;
    } finally {
        globalThis.clearTimeout(timeout);
    }
}

async function requestBlob(path: string, options: RequestInit = {}): Promise<Blob> {
    const url = `${API_BASE_URL}${path}`;
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), 30000);

    try {
        const res = await fetch(url, {
            headers: { "Content-Type": "application/json", ...options.headers },
            ...options,
            signal: options.signal ?? controller.signal,
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: res.statusText }));
            throw new Error(error.detail || `API error: ${res.status}`);
        }

        return res.blob();
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            throw new Error(timeoutErrorMessage());
        }
        throw error;
    } finally {
        globalThis.clearTimeout(timeout);
    }
}

export function analyzePitchTags(pitch: string, horizon?: string | null): Promise<AnalyzeTagsResponse> {
    return request<AnalyzeTagsResponse>("/api/v1/needs/analyze/tags", {
        method: "POST",
        body: JSON.stringify({ pitch, ...(horizon ? { horizon } : {}) }),
    }, ANALYZE_REQUEST_TIMEOUT_MS);
}

export function analyzePitchSuggestions(pitch: string, horizon?: string | null): Promise<AnalyzeSuggestionsResponse> {
    return request<AnalyzeSuggestionsResponse>("/api/v1/needs/analyze/suggestions", {
        method: "POST",
        body: JSON.stringify({ pitch, ...(horizon ? { horizon } : {}) }),
    }, ANALYZE_REQUEST_TIMEOUT_MS);
}

export function analyzePitch(pitch: string, horizon?: string | null): Promise<AnalyzeResponse> {
    return request<AnalyzeResponse>("/api/v1/needs/analyze", {
        method: "POST",
        body: JSON.stringify({ pitch, ...(horizon ? { horizon } : {}) }),
    }, ANALYZE_REQUEST_TIMEOUT_MS);
}

export function getBackendHealth(): Promise<{ status: string; service?: string }> {
    return request<{ status: string; service?: string }>("/health", {}, 3000);
}

export function createNeed(data: CreateNeedRequest): Promise<BusinessNeed> {
    return request<BusinessNeed>("/api/v1/needs", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export function listNeeds(): Promise<BusinessNeed[]> {
    return request<BusinessNeed[]>("/api/v1/needs");
}

export function updateNeedStatus(id: string, data: UpdateStatusRequest): Promise<BusinessNeed> {
    return request<BusinessNeed>(`/api/v1/needs/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify(data),
    });
}

export function getNeed(id: string): Promise<BusinessNeed> {
    return request<BusinessNeed>(`/api/v1/needs/${id}`);
}

export function searchCatalog(needId: string): Promise<CatalogSearchResponse> {
    return request<CatalogSearchResponse>(`/api/v1/needs/${needId}/catalog-search`, {
        method: "POST",
    });
}

export function getGapAnalysis(needId: string, selectedSolution: CatalogProduct): Promise<GapAnalysisResponse> {
    return request<GapAnalysisResponse>(`/api/v1/needs/${needId}/gap-analysis`, {
        method: "POST",
        body: JSON.stringify({ selected_solution: selectedSolution }),
    });
}

export function getRecommendations(needId: string, body: RecommendationsRequest): Promise<RecommendationsResponse> {
    return request<RecommendationsResponse>(`/api/v1/needs/${needId}/recommendations`, {
        method: "POST",
        body: JSON.stringify(body),
    });
}

export function exportRecommendationsPdf(needId: string, body: ExportReportRequest): Promise<Blob> {
    return requestBlob(`/api/v1/needs/${needId}/export/pdf`, {
        method: "POST",
        body: JSON.stringify(body),
    });
}

export function exportRecommendationsDocx(needId: string, body: ExportReportRequest): Promise<Blob> {
    return requestBlob(`/api/v1/needs/${needId}/export/docx`, {
        method: "POST",
        body: JSON.stringify(body),
    });
}

export function emailRecommendationsDossier(needId: string, body: EmailDossierRequest): Promise<EmailDossierResponse> {
    return request<EmailDossierResponse>(`/api/v1/needs/${needId}/export/email`, {
        method: "POST",
        body: JSON.stringify(body),
    }, 30000);
}

/**
 * Debounced hook for pitch analysis — tags and suggestions run on separate endpoints.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { analyzePitchSuggestions, analyzePitchTags } from "@/lib/api";
import type { Suggestion, Tags } from "@/lib/types";

const DEBOUNCE_MS = 900;
const MIN_PITCH_LENGTH = 30;

interface UseAnalyzeResult {
    tags: Tags | null;
    suggestions: Suggestion[];
    isTagging: boolean;
    isSuggesting: boolean;
    isAnalyzing: boolean;
    error: string | null;
    requestImmediateAnalysis: () => void;
}

export function useAnalyze(pitch: string, horizon?: string | null): UseAnalyzeResult {
    const [tags, setTags] = useState<Tags | null>(null);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isTagging, setIsTagging] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [immediateToken, setImmediateToken] = useState(0);

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const generationRef = useRef(0);
    const lastImmediateTokenRef = useRef(0);

    const runTagging = useCallback(async (text: string, h: string, generation: number) => {
        setIsTagging(true);
        try {
            const result = await analyzePitchTags(text, h);
            if (generationRef.current !== generation) return;
            setTags(result.tags);
        } catch (err) {
            if (generationRef.current !== generation) return;
            if (err instanceof Error && err.name !== "AbortError") {
                setError(err.message);
            }
        } finally {
            if (generationRef.current === generation) {
                setIsTagging(false);
            }
        }
    }, []);

    const runSuggestions = useCallback(async (text: string, h: string, generation: number) => {
        setIsSuggesting(true);
        try {
            const result = await analyzePitchSuggestions(text, h);
            if (generationRef.current !== generation) return;
            setSuggestions(result.suggestions || []);
        } catch (err) {
            if (generationRef.current !== generation) return;
            if (err instanceof Error && err.name !== "AbortError") {
                setError(err.message);
            }
        } finally {
            if (generationRef.current === generation) {
                setIsSuggesting(false);
            }
        }
    }, []);

    const requestImmediateAnalysis = useCallback(() => {
        setImmediateToken((current) => current + 1);
    }, []);

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);

        if (!horizon || pitch.trim().length < MIN_PITCH_LENGTH) {
            if (pitch.trim().length < MIN_PITCH_LENGTH) {
                setTags(null);
                setSuggestions([]);
                setError(null);
            }
            setIsTagging(false);
            setIsSuggesting(false);
            return;
        }

        const generation = ++generationRef.current;
        const skipDebounce = immediateToken !== lastImmediateTokenRef.current;
        if (skipDebounce) {
            lastImmediateTokenRef.current = immediateToken;
        }

        setError(null);
        setIsTagging(true);
        setIsSuggesting(true);

        const delay = skipDebounce ? 0 : DEBOUNCE_MS;

        timerRef.current = setTimeout(() => {
            void runTagging(pitch, horizon, generation);
            void runSuggestions(pitch, horizon, generation);
        }, delay);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [pitch, horizon, immediateToken, runTagging, runSuggestions]);

    return {
        tags,
        suggestions,
        isTagging,
        isSuggesting,
        isAnalyzing: isTagging || isSuggesting,
        error,
        requestImmediateAnalysis,
    };
}

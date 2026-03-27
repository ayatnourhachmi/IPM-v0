"""LLM abstraction — single interface for Groq and Azure OpenAI providers."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Langfuse prompt fallbacks (used when Langfuse is unreachable)
# ---------------------------------------------------------------------------

FALLBACK_PROMPTS: dict[str, dict[str, str]] = {
    "gap-analysis": {
        "system": (
            "You are an enterprise innovation analyst at DXC Technology.\n"
            "Given a business need and a proposed internal solution, perform\n"
            "a structured gap analysis. Be specific and concise.\n"
            "Return ONLY valid JSON — no markdown, no explanation, no preamble."
        ),
        "user": (
            "Business need:\n"
            "- Pitch: {{pitch}}\n"
            "- Objective: {{objectif}}\n"
            "- Expected impact: {{impact}}\n"
            "- Domain: {{domains}}\n\n"
            "Proposed DXC solution:\n"
            "- Name: {{solution_name}}\n"
            "- Description: {{solution_description}}\n"
            "- Current features: {{solution_features}}\n"
            "- Business impact: {{solution_business_impact}}\n"
            "- Maturity: {{solution_maturity}}\n\n"
            "Return this exact JSON structure:\n"
            "{\n"
            '  "features_matching": ["feature that directly addresses the need", "..."],\n'
            '  "features_missing": ["capability the need requires but solution lacks", "..."],\n'
            '  "resources_needed": ["team / integration / data / infrastructure needed", "..."],\n'
            '  "fit_score": <integer 1-10 where 10 = perfect fit>\n'
            "}\n\n"
            "Rules:\n"
            "- features_matching: only list real overlaps, not generic claims\n"
            "- features_missing: be specific about gaps, not vague\n"
            "- resources_needed: practical implementation requirements\n"
            "- fit_score: be honest, not optimistic"
        ),
    },
    "nlp_tagging": {
        "system": (
            "You are a senior innovation portfolio analyst at a large IT services company. "
            "Your job is to classify business need pitches into a structured taxonomy.\n\n"
            "## TAXONOMY DEFINITIONS\n\n"
            "### objectif (pick exactly ONE)\n"
            "- cost_reduction: The pitch focuses on reducing costs, eliminating waste, automating manual work, "
            "optimizing resources, or improving operational efficiency.\n"
            "- cx_improvement: The pitch focuses on improving customer experience, user satisfaction, "
            "service quality, communication channels, or employee experience.\n"
            "- risk_mitigation: The pitch focuses on reducing risk, improving security, ensuring compliance, "
            "disaster recovery, fraud detection, or regulatory adherence.\n"
            "- market_opportunity: The pitch focuses on capturing new markets, launching new products/services, "
            "generating new revenue streams, competitive advantage, or strategic positioning.\n\n"
            "### domaine (pick ONE or MORE from this exact list)\n"
            "- IA: Artificial intelligence, machine learning, NLP, computer vision, generative AI, chatbots, "
            "predictive models.\n"
            "- Cloud: Cloud migration, hybrid cloud, multi-cloud, SaaS, PaaS, IaaS, containerisation, "
            "serverless.\n"
            "- Cybersecurite: Security, zero-trust, SOC, SIEM, penetration testing, encryption, identity "
            "management, compliance (RGPD, ISO 27001).\n"
            "- Data: Data engineering, data lakes, data warehouses, BI, analytics, data governance, "
            "data quality, ETL/ELT pipelines.\n"
            "- RH: Human resources, recruitment, training, talent management, employee engagement, "
            "workforce planning, HRIS.\n"
            "- Finance: Accounting, financial reporting, budgeting, treasury, invoicing, payment processing, "
            "financial compliance.\n"
            "- Operations: Supply chain, logistics, manufacturing, procurement, facilities, project management, "
            "process automation (RPA), DevOps.\n"
            "- Autre: Anything that does not clearly fit the above categories.\n\n"
            "### impact (pick ONE or MORE from this exact list)\n"
            "- Revenue: Directly increases top-line revenue, monetisation, upsell, cross-sell.\n"
            "- Cost: Reduces operational costs, headcount, infrastructure spend, or manual effort.\n"
            "- Risk: Reduces exposure to security breaches, compliance fines, operational failures, or "
            "reputational damage.\n"
            "- CustomerExperience: Improves NPS, user satisfaction, response times, self-service, or "
            "client retention.\n\n"
            "### origine (pick exactly ONE)\n"
            "- enjeu_marche: Driven by market trends, competitive pressure, industry regulations, or "
            "emerging technologies.\n"
            "- probleme_operationnel: Driven by an internal pain point, inefficiency, recurring incident, "
            "or technical debt.\n"
            "- demande_client: Driven by explicit client feedback, feature request, contract requirement, "
            "or customer complaint.\n\n"
            "## RULES\n"
            "1. Respond ONLY with valid JSON. No explanation, no markdown fences, no commentary.\n"
            "2. Use ONLY the exact enum values listed above (case-sensitive).\n"
            "3. domaine and impact MUST be arrays with at least one element.\n"
            "4. objectif and origine MUST be single strings, not arrays.\n"
            "5. When the pitch is ambiguous, prefer the most specific classification over 'Autre'.\n"
            "6. When the pitch spans multiple objectives, pick the PRIMARY one.\n"
            "7. The pitch will typically be in French. Classify regardless of language."
        ),
        "user": (
            "Classify this business need pitch and suggest improvements:\n\n"
            '"""{{pitch}}"""\n\n'
            "Return ONLY this JSON structure (no other text):\n"
            "{\n"
            '  "tags": {\n'
            '    "objectif": "cost_reduction | cx_improvement | risk_mitigation | market_opportunity",\n'
            '    "domaine": ["IA", "Cloud", "Cybersecurite", "Data", "RH", "Finance", "Operations", "Autre"],\n'
            '    "impact": ["Revenue", "Cost", "Risk", "CustomerExperience"],\n'
            '    "origine": "enjeu_marche | probleme_operationnel | demande_client"\n'
            "  },\n"
            '  "suggestions": [\n'
            '    { "label": "Reformulation", "text": "<rewrite the pitch more clearly, 1 sentence max 20 words>" },\n'
            '    { "label": "Business Precision", "text": "<more specific version with measurable outcome, 1 sentence>" },\n'
            '    { "label": "Value Angle", "text": "<reframe around ROI or strategic value, 1 sentence>" }\n'
            "  ]\n"
            "}\n\n"
            "### EXAMPLES\n\n"
            'Pitch: "Automate monthly accounting reconciliations with an RPA tool to '
            'eliminate manual errors and reduce closing time from 5 days to 1 day."\n'
            "Answer:\n"
            "{\n"
            '  "tags": {\n'
            '    "objectif": "cost_reduction",\n'
            '    "domaine": ["Finance", "IA"],\n'
            '    "impact": ["Cost", "Risk"],\n'
            '    "origine": "probleme_operationnel"\n'
            "  },\n"
            '  "suggestions": [\n'
            '    { "label": "Reformulation", "text": "Automate monthly accounting close via RPA to eliminate manual reconciliation errors." },\n'
            '    { "label": "Business Precision", "text": "Reduce reconciliation cycle from 5 to 1 day, targeting 99.5% entry accuracy." },\n'
            '    { "label": "Value Angle", "text": "Free up 80 hours/month of accounting work for higher-value activities." }\n'
            "  ]\n"
            "}\n\n"
            "Now classify the pitch above and generate 3 suggestions in English."
        ),
    },
}


@dataclass
class LLMResponse:
    """Structured response from the LLM provider."""

    content: str
    usage: dict[str, int]


def _get_langfuse_prompt(prompt_name: str, variables: dict[str, str]) -> tuple[str, str]:
    """Fetch a prompt from Langfuse, falling back to hardcoded defaults."""
    try:
        from langfuse import Langfuse

        lf = Langfuse(
            public_key=settings.langfuse_public_key,
            secret_key=settings.langfuse_secret_key,
            host=settings.langfuse_host,
        )
        prompt = lf.get_prompt(prompt_name)
        compiled = prompt.compile(**variables)
        # Langfuse chat prompts return a list of messages
        if isinstance(compiled, list):
            system_msg = next((m["content"] for m in compiled if m["role"] == "system"), "")
            user_msg = next((m["content"] for m in compiled if m["role"] == "user"), "")
        else:
            # Langfuse text prompts return a single string
            system_msg, user_msg = "", str(compiled)

        # If the prompt doesn't include suggestions, it's outdated — use the fallback
        if "suggestions" not in user_msg and prompt_name in FALLBACK_PROMPTS:
            logger.warning("Langfuse prompt '%s' has no suggestions format, using fallback", prompt_name)
            raise ValueError("outdated prompt")

        return system_msg, user_msg
    except Exception as exc:
        logger.warning("Langfuse unavailable (%s), using fallback prompt for '%s'", exc, prompt_name)
        fallback = FALLBACK_PROMPTS.get(prompt_name)
        if not fallback:
            raise ValueError(f"No fallback prompt defined for '{prompt_name}'") from exc
        system_text = fallback["system"]
        user_text = fallback["user"]
        for key, value in variables.items():
            user_text = user_text.replace("{{" + key + "}}", value)
            system_text = system_text.replace("{{" + key + "}}", value)
        return system_text, user_text


async def _complete_groq(system_prompt: str, user_prompt: str, response_format: str | None) -> LLMResponse:
    """Call Groq API with llama-3.3-70b-versatile."""
    from groq import AsyncGroq

    client = AsyncGroq(api_key=settings.groq_api_key)
    kwargs: dict = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.1,
        "max_tokens": 1024,
    }
    if response_format == "json":
        kwargs["response_format"] = {"type": "json_object"}

    response = await client.chat.completions.create(**kwargs)
    choice = response.choices[0]
    return LLMResponse(
        content=choice.message.content or "",
        usage={
            "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
            "completion_tokens": response.usage.completion_tokens if response.usage else 0,
        },
    )


async def _complete_azure(system_prompt: str, user_prompt: str, response_format: str | None) -> LLMResponse:
    """Call Azure OpenAI with GPT-4o."""
    from openai import AsyncAzureOpenAI

    client = AsyncAzureOpenAI(
        api_key=settings.azure_openai_api_key,
        azure_endpoint=settings.azure_openai_endpoint,
        api_version=settings.azure_openai_api_version,
    )
    kwargs: dict = {
        "model": settings.azure_openai_deployment,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.1,
        "max_tokens": 1024,
    }
    if response_format == "json":
        kwargs["response_format"] = {"type": "json_object"}

    response = await client.chat.completions.create(**kwargs)
    choice = response.choices[0]
    return LLMResponse(
        content=choice.message.content or "",
        usage={
            "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
            "completion_tokens": response.usage.completion_tokens if response.usage else 0,
        },
    )


async def complete(
    prompt_name: str,
    variables: dict[str, str],
    response_format: str | None = None,
) -> LLMResponse:
    """Unified LLM completion interface — dispatches to configured provider."""
    system_prompt, user_prompt = _get_langfuse_prompt(prompt_name, variables)

    if settings.llm_provider == "groq":
        return await _complete_groq(system_prompt, user_prompt, response_format)
    elif settings.llm_provider == "azure":
        return await _complete_azure(system_prompt, user_prompt, response_format)
    else:
        raise ValueError(f"Unknown LLM provider: {settings.llm_provider}")


def parse_json_response(response: LLMResponse) -> dict:
    """Parse a JSON response from the LLM, stripping markdown fences if present."""
    content = response.content.strip()
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(lines[1:-1])
    return json.loads(content)

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**IPM (Innovation Progress Model)** — an AI-powered innovation intake platform. Users submit a business need (pitch + horizon), which is classified by an LLM, checked for duplicates via vector similarity, and progressed through a multi-stage pipeline with stage-gate reviews.

**v0 scope**: Single role (CLIENT DXC), sourcing phase functional, DXC catalog search + gap analysis live, remaining discovery panels are stubs, no auth.

---

## Development Commands

### Full Stack (Docker — recommended)

```bash
cp .env.example .env   # Edit with your GROQ_API_KEY

docker compose up --build
docker compose down -v
```

Services: frontend `:3000`, api `:8000`, chromadb `:8001` (internal `:8000`), minio `:9000` (UI `:9001`), postgres `:5432`.

### Backend (local)

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend (local)

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
npm run build
npm run lint
```

---

## Architecture

### Backend — FastAPI (Python)

`backend/app/` structure:
- **`main.py`** — FastAPI entry, CORS, lifespan hooks in order: create tables → warm up embedding model → seed ChromaDB (`business_needs` collection) → seed DXC catalog (`seed_catalog.py`) → ensure MinIO bucket
- **`api/v1/needs.py`** — All REST endpoints under `/api/v1/needs`: `POST /analyze`, `POST /`, `GET /`, `PATCH /{id}/status`, `GET /{id}`, `POST /{id}/catalog-search`, `POST /{id}/gap-analysis`; `GET /health` at root
- **`core/config.py`** — Pydantic `BaseSettings`; all env vars — always extend here, never inline
- **`core/llm_client.py`** — Abstraction over Groq (default, `llama-3.3-70b-versatile`) and Azure OpenAI; supports JSON mode; Langfuse observability; `FALLBACK_PROMPTS` dict for `nlp_tagging` and `gap-analysis` when Langfuse is unavailable
- **`core/embedding_client.py`** — Local `BAAI/bge-small-en-v1.5` (warmed up on startup) or OpenAI; sync `embed_text(text, is_query)` + async `embed_text_async(text, is_query)` (uses `asyncio.to_thread`); batch `embed_texts()`; BGE query prefix applied when `is_query=True` and model name contains "bge"
- **`core/chroma.py`** — ChromaDB HTTP client singleton; `get_collection(name)` with `hnsw:space: cosine`; two collections: `business_needs` (duplicate detection) and `dxc_catalog` (catalog search)
- **`core/seed_catalog.py`** — Loads `catalog.json`, builds rich document text per product (`name + description + features + business_impact + use_cases`), embeds with `is_query=False`, upserts into `dxc_catalog` collection; idempotent (skips already-seeded products); converts lists → comma-separated strings, None → empty string for ChromaDB metadata
- **`services/nlp_service.py`** — `analyze_pitch()` with 5-min in-memory cache; handles both flat and nested LLM JSON responses
- **`services/embedding_service.py`** — `upsert_embedding()` and `search_duplicates()` both accept an optional pre-computed `embedding` to avoid redundant model calls; always pass `is_query=False` (symmetric — documents only, never query side); `SIMILARITY_THRESHOLD = 0.80`, `MAX_RESULTS = 3`
- **`services/id_service.py`** — Generates `BN-YYYY-NNN` IDs using a year-scoped DB counter with `SELECT FOR UPDATE`
- **`models/`** — SQLAlchemy ORM: `BusinessNeed` (JSONB `tags`, `duplicate_matches`), `IdCounter`
- **`schemas/business_need.py`** — Pydantic v2 request/response models including `CatalogProduct` (15 optional metadata fields + features array + relevance_score), `CatalogSearchResponse`, `GapAnalysisRequest`, `GapAnalysisResponse`
- **`alembic/`** — Database migrations (`alembic upgrade head`)

**Performance pattern in `create_need`**: LLM tagging and embedding are run concurrently with `asyncio.gather()`, and the resulting embedding is reused for both `upsert_embedding` and `search_duplicates` (no redundant model calls).

**Catalog search query construction** (in `needs.py` `catalog_search`):
```python
OBJECTIF_LABELS = {
    "cost_reduction": "cost reduction efficiency savings",
    "cx_improvement": "customer experience improvement satisfaction",
    "risk_mitigation": "risk management compliance security",
    "market_opportunity": "market growth revenue expansion",
    "productivity": "productivity automation efficiency",
    "innovation": "innovation digital transformation modernization",
}
query_text = " ".join(filter(None, [pitch, objectif_label, domains_str, impact_str]))[:600]
embedding = await embed_text_async(query_text, is_query=True)  # BGE prefix applied
```

**Status machine** — transitions enforced in `needs.py` via `ALLOWED_TRANSITIONS`:
```
draft → submitted | rework | abandoned
submitted → in_qualification | rework | abandoned
in_qualification → delivery | rework | abandoned
rework → draft | submitted
delivery / abandoned → (terminal)
```

> `solutions_reviewed` exists in the `Status` enum and Pydantic schema but is not present in `ALLOWED_TRANSITIONS` — reserved for Phase 2.

### Frontend — Next.js 14 App Router (TypeScript)

`frontend/src/` structure:
- **`app/`** — One directory per pipeline stage: `sourcing/`, `discovery/`, `evaluation/`, `selection/`, `recos/`, `dashboard/`
- **`lib/types.ts`** — Single source of truth for all TypeScript interfaces, enums (`Horizon`, `Status`, `Objectif`, `Origine`), and label maps (`HORIZON_LABELS`, `STATUS_LABELS`, `OBJECTIF_LABELS`); mirrors backend schemas. `Status` includes `solutions_reviewed` (schema-only, unused in transitions)
- **`lib/api.ts`** — Typed fetch wrapper (`NEXT_PUBLIC_API_URL` base); all backend calls: `analyzePitch`, `createNeed`, `listNeeds`, `updateNeedStatus`, `getNeed`, `searchCatalog`, `getGapAnalysis`
- **`lib/discoveryStubs.ts`** — Mock data for Tech Signals, Startups, Tech Watch; DXC catalog stub is commented out (replaced by real API); defines `DiscoveryItem` and `DiscoverySource` interfaces
- **`hooks/useNeeds.ts`** — Fetches and manages business needs state (used by dashboard)
- **`components/layout/WorkflowBar.tsx`** — Sticky 3-row progress bar:
  - Row 1: Title bar — first 50 chars of pitch + status badge + "Awaiting [gate] Validation" subtitle
  - Row 2: Progress strip — monospace ✓/◆/greyed indicators per step with `stripPulse` animation on current page
  - Row 3: Full animated diagram — 3 phase containers (Sourcing/blue, Qualification/emerald, Delivery/orange), gate nodes (SG-1 through SG-4), `SolutionRecap` component reads `ipm_selected_solutions` from localStorage
  - `deriveStatusState(status, currentStep)` maps backend status → `{completedSteps, completedGates, currentActiveGate}`
  - Pre-configured checklist data for SG-1, SG-2, SG-3, SG-4 gates
- **`components/sourcing/SourcingShell.tsx`** — Orchestrates sourcing: calls `createNeed()` first, then opens `Sg1ValidationPanel`; never open the panel before `createNeed()` resolves; `DuplicateBanner` with "View →" navigation
- **`components/sourcing/Sg1ValidationPanel.tsx`** — SG-1 gate review; right-side slide panel (Framer Motion, same style as `GateModal`); `hasDuplicates` prop controls "No confirmed duplicate detected" checklist item; GO disabled until `allMet`
- **`components/sourcing/Sg2ValidationPanel.tsx`** — SG-2 gate review; right-side slide panel (480px, Framer Motion `x: 100% → 0`); shows selected solutions recap + 2-item checklist ("At least one solution selected" auto-checked, "Solutions reviewed and validated" manual); GO/REWORK/STOP; triggers status update to `in_qualification` on GO
- **`components/sourcing/DuplicateBanner.tsx`** — Horizontal warning bar; shows duplicate count, id, truncated pitch, similarity score, "View →" button; "Continue anyway" to dismiss
- **`components/discovery/DiscoveryPanel.tsx`** — 2-panel progressive disclosure layout:
  - Left column: 4 source cards (DXC Catalog live API, Tech Signals/Startups/Tech Watch stubs); accordion-style idle → active → done state machine per card
  - Right column: gap analysis panel (AnimatePresence `x: 24` slide) — calls `getGapAnalysis()` on card click; shows features_matching (✓ green), features_missing (✗ red), resources_needed (⚙ muted), fit_score
  - Bottom bar: "⊕ For More Exploration" ghost button + "Proceed to Qualification →" (enabled when `selectedIds.size > 0`)
  - `onProceed` writes `localStorage.ipm_selected_solutions` (selected solution objects) and `localStorage.ipm_sg2_state = { cardStates, totalSelected }`; opens `Sg2ValidationPanel`
- **`components/workflow/GateModal.tsx`** — Reference design for gate panels: right-side slide with monospace gate label, animated card-style checklist, 2-step REWORK/STOP confirm with required textarea; GO/REWORK/STOP buttons
- **`components/gates/StageGate.tsx`** — Reusable gate modal using CSS classes (`gate-overlay`, `gate-modal`, `gate-btn`); supports gate IDs SG-1 through SG-5; GO disabled until `allMet`; same 2-step confirm pattern as `GateModal`

**Routing**: Each pipeline stage is a separate page; state is passed via URL `?id=` param and re-fetched from the API. Discovery → Evaluation state via two `localStorage` keys: `ipm_selected_solutions` (SolutionRecap in WorkflowBar) and `ipm_sg2_state` (evaluation page).

### CSS / Styling

All global CSS is in `frontend/src/app/globals.css`. Key CSS variables:
- `--accent: #635BFF` / `--accent-light: #635BFF` / `--accent-subtle: rgba(99,91,255,0.12)` — primary purple brand
- `--bg-void: #080a0f`, `--bg-card`, `--bg-inner`, `--bg-input` — backgrounds
- `--border-warm` (99,91,255 @ 0.55), `--glow-amber`, `--glow-core` (99,91,255 @ 0.6) — glow/border values
- `--text-primary: #f0ece6`, `--text-secondary`, `--text-muted`
- `--done: #2a9d6e` (green for completed states)
- Tag chip variants: amber, green, blue, purple, orange, gray (each has `bg/fg/border`)
- Fonts: DM Sans (body), DM Mono (monospace), Playfair Display (display)
- Workflow phases: `--wf-sourcing` (hsl 217), `--wf-qualification` (hsl 142), `--wf-delivery` (hsl 24)
- Layout: `--header-height: 40vh`, `--content-height: 60vh`
- Workflow bar: `var(--wf-*)` (`--wf-card`, `--wf-border`, `--wf-muted`, `--wf-fg`, `--wf-muted-fg`, `--wf-destructive`)
- Discovery layout: `.disc-two-col` (two-column grid, collapses to 1 column at `max-width: 768px`), `.disc-card`, `.disc-card-header`, `.disc-card-idle`, `.disc-card-active`, `.disc-card-results`, `.disc-launch-btn`, `.disc-item`, `.disc-item-checkbox`, `.disc-item-score`, `.disc-recap`, `.disc-proceed-btn`, `.disc-action-ghost`, `.disc-card-summary`, `.disc-summary-chip`
- Gate modal: `.gate-overlay`, `.gate-modal`, `.gate-title`, `.gate-checklist`, `.gate-check-item`, `.gate-check-icon`, `.gate-note-field`, `.gate-actions`, `.gate-btn`
- Duplicate banner: `.dup-banner`, `.dup-icon`, `.dup-content`, `.dup-match`, `.dup-score`
- `@keyframes stripPulse` — used by WorkflowBar for the current-page node highlight

### DXC Catalog Integration

- **Data source**: `backend/app/data/catalog.json` — 9 products (dxc-001, 002, 003, 004, 005, 006, 007, 009, 011)
- **Seeding**: `seed_catalog.py` runs at API startup; embeds `name + description + features + business_impact + use_cases`; upserts into ChromaDB `dxc_catalog` collection with `is_query=False`; idempotent
- **Search**: `POST /api/v1/needs/{id}/catalog-search` — enriched query with human-readable objectif label + domains + impact, embedded with `is_query=True`, top-5 returned by cosine similarity
- **Gap analysis**: `POST /api/v1/needs/{id}/gap-analysis` — takes `selected_solution` body, runs LLM with `gap-analysis` prompt, returns `features_matching`, `features_missing`, `resources_needed`, `fit_score (1–10)`
- **Re-seeding required** after any change to `catalog.json` or `EMBEDDING_MODEL_LOCAL`: delete the `dxc_catalog` ChromaDB collection before restarting

### Landing Page

`frontend/public/landing.html` is a Webflow export. Animations use **lottie-web** (`frontend/public/vendor/lottie.min.js`) + **GSAP ScrollTrigger** (not Webflow IX2):
- Lottie JSON (`frontend/public/lottie/ipm-workflow.json`) is scrubbed to scroll position via `goToAndStop(progress * totalFrames, true)`
- How-We-Work cards toggle `.is-active` class based on scroll progress
- `<html class="w-mod-js w-mod-ix3">` is required to prevent Webflow's hide rule from hiding cards

### Public Assets

- `frontend/public/ipm-flow-mark.svg` — Brand icon (64×64 three-layer card stack with gradient fills and radial glow); use for favicon/logo
- `frontend/public/lottie/ipm-workflow.json` — Lottie animation for landing page workflow visualization
- `frontend/public/vendor/lottie.min.js` — Vendored lottie-web library (served locally, no CDN dependency)

### Infrastructure

`docker-compose.yml` defines 5 services. The `api` service depends on `postgres` healthcheck; `frontend` depends on `api`. All secrets come from `.env`.

---

## Key Conventions

- **LLM provider**: `LLM_PROVIDER=groq` (default) or `azure`; never hardcode provider in service code
- **Embeddings**: `EMBEDDING_PROVIDER=local` (default, `BAAI/bge-small-en-v1.5`) or `openai`; `is_query=False` for all document embeddings; `is_query=True` for catalog search queries only (not for duplicate detection)
- **Two ChromaDB collections**: `business_needs` — symmetric duplicate detection (always `is_query=False`); `dxc_catalog` — asymmetric retrieval (documents `is_query=False`, queries `is_query=True`)
- **Horizon values**: `court_terme` | `moyen_terme` | `long_terme` (French, stored as-is)
- **ID format**: `BN-YYYY-NNN` — generated server-side only (`id_service.py`); never create on the client
- **Discovery panels**: DXC catalog calls real API; Tech Signals, Startups, Tech Watch use stubs in `discoveryStubs.ts`
- **Gate panel style**: Use `GateModal.tsx` as the reference design for any new gate or validation panels; `StageGate.tsx` is the reusable CSS-class-based implementation
- **TypeScript types**: All interfaces in `lib/types.ts`; all API calls in `lib/api.ts` — no inline fetches in components
- **localStorage keys**: `ipm_selected_solutions` (solution objects, read by `SolutionRecap`); `ipm_sg2_state` (card states + total count, read by evaluation page)

---

## What Is Stubbed

| Panel / Feature | Stub location | Phase 2 replacement |
|---|---|---|
| Tech Signals | `discoveryStubs.ts` `STUB_TECH_SIGNALS` | Patent database + tech trends API |
| Startups | `discoveryStubs.ts` `STUB_STARTUPS` | StartupConnect AI API |
| Tech Watch | `discoveryStubs.ts` `STUB_TECH_WATCH` | AI Watch feed API |
| Evaluation scoring | `app/evaluation/page.tsx` | LLM-assisted scoring or scoring service |
| Selection recommendations | `app/selection/page.tsx` | Real recommendation engine |
| PDF / DOCX export | `app/recos/page.tsx` | Document generation service |
| Multi-role / auth | entire app | Sponsor Métier role + authentication |
| `solutions_reviewed` status | schema only | Backend transition wiring |

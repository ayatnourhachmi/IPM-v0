# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**IPM (Innovation Progress Model)** — an AI-powered innovation intake platform. Users submit a business need (pitch + horizon), which is classified by an LLM, checked for duplicates via vector similarity, and progressed through a multi-stage pipeline with stage-gate reviews.

**v0 scope**: Single role (CLIENT DXC), sourcing phase functional, discovery panels are stubs, no auth.

---

## Development Commands

### Full Stack (Docker — recommended)

```bash
cp .env.example .env   # Edit with your GROQ_API_KEY

docker compose up --build
docker compose down -v
```

Services: frontend `:3000`, api `:8000`, chromadb `:8001`, minio `:9000` (UI `:9001`), postgres `:5432`.

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
- **`main.py`** — FastAPI entry, CORS, lifespan hooks (create tables, warm up embedding model, seed ChromaDB, ensure MinIO bucket)
- **`api/v1/needs.py`** — All REST endpoints; `POST /analyze`, `POST /`, `GET /`, `PATCH /{id}/status`, `GET /{id}` under `/api/v1/needs`; `GET /health` at root
- **`core/config.py`** — Pydantic `BaseSettings`; all env vars loaded here — always extend here, not inline
- **`core/llm_client.py`** — Abstraction over Groq (default) and Azure OpenAI; supports JSON mode; Langfuse observability; has fallback prompts if Langfuse prompt is outdated
- **`core/embedding_client.py`** — Local (`all-MiniLM-L6-v2`, warmed up on startup) or OpenAI embeddings; sync `embed_text()` + async `embed_text_async()` (uses `asyncio.to_thread`)
- **`core/chroma.py`** — ChromaDB client for vector storage/retrieval
- **`services/nlp_service.py`** — `analyze_pitch()` with 5-min in-memory cache; handles both flat and nested LLM JSON responses
- **`services/embedding_service.py`** — `upsert_embedding()` and `search_duplicates()` both accept an optional pre-computed `embedding` to avoid redundant model calls
- **`services/id_service.py`** — Generates `BN-YYYY-NNN` IDs using a year-scoped DB counter
- **`models/`** — SQLAlchemy ORM (`BusinessNeed`, `IdCounter`)
- **`schemas/`** — Pydantic v2 request/response models
- **`alembic/`** — Database migrations (`alembic upgrade head`)

**Performance pattern in `create_need`**: LLM tagging and embedding are run concurrently with `asyncio.gather()`, and the resulting embedding is reused for both `upsert_embedding` and `search_duplicates` (no redundant model calls).

**Status machine** — transitions enforced in `needs.py` via `ALLOWED_TRANSITIONS`:
```
draft → submitted | rework | abandoned
submitted → in_qualification | rework | abandoned
in_qualification → delivery | rework | abandoned
rework → draft | submitted
delivery / abandoned → (terminal)
```
`rework` and `abandoned` transitions require a `note` field.

### Frontend — Next.js 14 App Router (TypeScript)

`frontend/src/` structure:
- **`app/`** — One directory per pipeline stage: `sourcing/`, `discovery/`, `evaluation/`, `selection/`, `recos/`, `dashboard/`
- **`lib/types.ts`** — Single source of truth for all TypeScript interfaces, enums, and label maps; mirrors backend schemas
- **`lib/api.ts`** — Typed fetch wrapper; all backend calls go through here
- **`lib/discoveryStubs.ts`** — Mock data for all 4 discovery panels (DAIC, Patents, Startups, Tech Watch); replace with real API calls in Phase 2
- **`hooks/useNeeds.ts`** — Fetches and manages business needs state
- **`components/layout/WorkflowBar.tsx`** — Sticky 8-step progress bar; `deriveStatusState(status, currentStep)` maps backend `status` string to `{completedSteps, completedGates, currentActiveGate}`; `STEP_TO_STRIP_ID` maps the `currentStep` prop to which strip node gets a pulse highlight
- **`components/sourcing/SourcingShell.tsx`** — Orchestrates sourcing: creates the need first (API), then opens `Sg1ValidationPanel`; never open the panel before `createNeed()` resolves
- **`components/sourcing/Sg1ValidationPanel.tsx`** — SG-1 gate review; right-side slide panel (framer-motion, same style as `GateModal`); shows filled summary fields + dynamic checklist; `hasDuplicates` prop controls "No confirmed duplicate detected" item
- **`components/discovery/DiscoveryPanel.tsx`** — 4 tool cards; each card has `"idle" | "active" | "done"` state; idle shows launch button, active shows items with checkboxes, done shows selected-item chips
- **`components/workflow/GateModal.tsx`** — Reference design for gate panels: right-side slide with monospace gate label, card-style checklist items, 2-step REWORK/STOP confirm with required textarea

**Routing**: Each pipeline stage is a separate page; state is passed via URL `?id=` param and re-fetched from the API.

### CSS / Styling

All global CSS is in `frontend/src/app/globals.css`. Key CSS variables:
- `--accent: #635BFF` / `--accent-light: #635BFF` / `--accent-subtle: rgba(99,91,255,0.12)` — primary purple brand color
- `--border-warm`, `--glow-amber`, `--glow-core` — purple-shifted glow values
- Workflow bar uses `var(--wf-*)` variables (`--wf-card`, `--wf-border`, `--wf-muted`, `--wf-fg`, `--wf-muted-fg`, `--wf-qualification`, `--wf-sourcing`, `--wf-destructive`)
- Discovery tool card styles: `.disc-card`, `.disc-card-header`, `.disc-launch-btn`, `.disc-item`, `.disc-item-score`, `.disc-recap`, `.disc-proceed-btn`
- `@keyframes stripPulse` — used by WorkflowBar for the current-page node highlight

### Landing Page

`frontend/public/landing.html` is a Webflow export. Animations use **lottie-web** + **GSAP ScrollTrigger** (not Webflow IX2, which requires a live Webflow backend):
- Lottie JSON is scrubbed to scroll position via `goToAndStop(progress * totalFrames, true)`
- How-We-Work cards toggle `.is-active` class based on scroll progress
- `<html class="w-mod-js w-mod-ix3">` is required to prevent Webflow's hide rule from hiding cards

### Infrastructure

`docker-compose.yml` defines 5 services. The `api` service depends on `postgres` healthcheck; `frontend` depends on `api`. All secrets come from `.env`.

---

## Key Conventions

- **LLM provider**: `LLM_PROVIDER=groq` (default) or `azure` in `.env`; never hardcode in service code
- **Embeddings**: `EMBEDDING_PROVIDER=local` (default, no API key needed) or `openai`
- **Horizon values**: `court_terme` | `moyen_terme` | `long_terme` (French, stored as-is, not translated)
- **ID format**: `BN-2025-001` — generated server-side only (`id_service.py`)
- **Discovery panels**: All stub data in `discoveryStubs.ts` — marked for real API integration in Phase 2
- **Gate panel style**: Use `GateModal.tsx` as the reference design for any new gate/validation panels

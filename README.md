# IPM — Innovation Progress Model · v0

## What is this?

IPM is an AI-powered innovation intake platform. Business stakeholders submit a free-text pitch describing a business need; the system auto-classifies it with an LLM (objectif, impact, domaine, origine), detects near-duplicates via vector similarity, and routes the initiative through a structured pipeline.

Single user role in v0: **CLIENT DXC**. No Sponsor Métier role, no authentication.

---

## Full Pipeline

The 8-step workflow bar is sticky on every page. Steps map to routes; stage gates live between steps.

```
Sourcing → [SG-1] → Discovery → [SG-2] → Evaluation → [SG-3] → Selection → Recos
```

| Route | Step | What happens |
|---|---|---|
| `/sourcing` | Business Need | Pitch + Horizon → LLM tags → SG-1 review |
| `/discovery` | Discovery | DXC catalog search + gap analysis + signals → SG-2 review |
| `/evaluation` | Evaluation | Scoring grid (stub) → SG-3 review |
| `/selection` | Selection | Pick one solution (stub) |
| `/recos` | Recommendations | SG-4 review → Export PDF/DOCX (stub) |
| `/dashboard` | Dashboard | Live list of all IPMs + status |

**State between pages:** The need ID is passed as `?id=` URL param and re-fetched from the API on each page. Discovery card selection state is written to `localStorage` as two keys:
- `ipm_selected_solutions` — selected solution objects, read by `SolutionRecap` in the WorkflowBar
- `ipm_sg2_state` — `{ cardStates, totalSelected }` — read by the evaluation page

---

## Discovery Step Detail

The discovery page uses a **2-panel progressive disclosure** layout.

**Left column — tool cards (sequential)**
1. **DXC Internal Catalog** — always visible; calls `POST /api/v1/needs/{id}/catalog-search` (live API, BGE embedding); shows top-5 ranked products with relevance scores; user selects items and clicks "Confirm selection ✓"
2. **Tech Signals / Patents** — appears after catalog is confirmed; stub data (`STUB_TECH_SIGNALS`)
3. **Startups / Tech Watch** — hidden by default; unlocked via "For More Exploration" modal in the bottom bar; stubs (`STUB_STARTUPS`, `STUB_TECH_WATCH`)

**Right column — gap analysis**
When a catalog product is selected and "Explore Gap Analysis →" is clicked, a right-side panel calls `POST /api/v1/needs/{id}/gap-analysis` and shows:
- Features matching the need
- Features missing / gaps
- Resources needed
- Fit score (1–10)

**Bottom bar**
- "⊕ For More Exploration" — opens a centered modal to enable Startups and Tech Watch cards
- "Proceed to Qualification →" — enabled when at least 1 item is selected; writes `ipm_sg2_state` to localStorage; opens the SG-2 side panel (`Sg2ValidationPanel`)

---

## DXC Solution Catalog (9 products)

Seeded into ChromaDB collection `dxc_catalog` at startup from `backend/app/data/catalog.json`.

| ID | Name | Category |
|---|---|---|
| dxc-001 | Assessment Advisor | AI maturity assessment, data strategy |
| dxc-002 | Data Health | Data quality, validation, monitoring |
| dxc-003 | Intelligent Analytics | ML/NLP analytics, forecasting |
| dxc-004 | ROI Simulator | Investment ROI, cost-benefit modeling |
| dxc-005 | AO Handler | Tender discovery, bid automation |
| dxc-006 | AI Use Case Radar | AI trend scanning, innovation benchmarking |
| dxc-007 | AI Implementation Framework | AI deployment, responsible AI, MLOps |
| dxc-009 | HR Assistant | Conversational AI, HR automation, CV triage |
| dxc-011 | AI Workbench | Agent-based AI platform, LLM orchestration, MCP |

Each product is embedded as: `name. description. Features: … Business impact: … Use cases: …`

**After any change to `catalog.json` or the embedding model**, delete the `dxc_catalog` ChromaDB collection before restarting the API so it re-seeds with fresh vectors.

---

## Status Machine

| From | To | Trigger | Note required? |
|---|---|---|---|
| `draft` | `submitted` | SG-1 GO | No |
| `draft` | `rework` | SG-1 Rework | **Yes** |
| `draft` | `abandoned` | SG-1 Stop | **Yes** |
| `submitted` | `in_qualification` | SG-2 GO | No |
| `submitted` | `rework` | SG-2 Rework | **Yes** |
| `submitted` | `abandoned` | SG-2 Stop | **Yes** |
| `in_qualification` | `delivery` | SG-3 GO | No |
| `in_qualification` | `rework` | SG-3 Rework | **Yes** |
| `in_qualification` | `abandoned` | SG-3 Stop | **Yes** |
| `rework` | `draft` | Re-submit | No |
| `rework` | `submitted` | Re-submit | No |

Terminal states: `delivery`, `abandoned`.

```
draft → submitted → in_qualification → delivery
  ↓         ↓              ↓
rework    rework         rework
  ↓         ↓              ↓
abandoned abandoned      abandoned
```

> Note: `solutions_reviewed` exists in the TypeScript `Status` enum and Pydantic schema but is not wired into `ALLOWED_TRANSITIONS` — reserved for Phase 2.

---

## How to Run

### Docker (recommended)

```bash
cp .env.example .env
# Edit .env — set GROQ_API_KEY at minimum

docker compose up --build

# Frontend:  http://localhost:3000
# API docs:  http://localhost:8000/docs
# MinIO UI:  http://localhost:9001  (minioadmin / minioadmin)
# ChromaDB:  http://localhost:8001
```

```bash
docker compose down -v   # stop and remove volumes
```

### Backend only (local)

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Requires a running PostgreSQL instance and ChromaDB. Set `DATABASE_URL` and `CHROMADB_HOST` in `.env`.

### Frontend only (local)

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
npm run build
npm run lint
```

Set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `frontend/.env.local`.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `LLM_PROVIDER` | `groq` | `groq` or `azure` |
| `GROQ_API_KEY` | — | Required if `LLM_PROVIDER=groq` |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Groq model name |
| `AZURE_OPENAI_API_KEY` | — | Required if `LLM_PROVIDER=azure` |
| `AZURE_OPENAI_ENDPOINT` | — | Azure resource URL |
| `AZURE_OPENAI_DEPLOYMENT` | `gpt-4o` | Deployment name |
| `AZURE_OPENAI_API_VERSION` | `2024-02-01` | API version |
| `EMBEDDING_PROVIDER` | `local` | `local` or `openai` |
| `EMBEDDING_MODEL_LOCAL` | `BAAI/bge-small-en-v1.5` | Sentence-transformers model |
| `OPENAI_API_KEY` | — | Required if `EMBEDDING_PROVIDER=openai` |
| `DATABASE_URL` | `postgresql+asyncpg://ipm:ipm@postgres:5432/ipm` | PostgreSQL connection string |
| `CHROMADB_HOST` | `chromadb` | ChromaDB service host |
| `CHROMADB_PORT` | `8001` | ChromaDB service port (external mapping) |
| `MINIO_ENDPOINT` | `minio:9000` | MinIO endpoint |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO access key |
| `MINIO_SECRET_KEY` | `minioadmin` | MinIO secret key |
| `LANGFUSE_PUBLIC_KEY` | — | Optional — Langfuse observability |
| `LANGFUSE_SECRET_KEY` | — | Optional |
| `LANGFUSE_HOST` | `https://cloud.langfuse.com` | Langfuse host |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Frontend → API base URL |

---

## Key Files

| Feature | File |
|---|---|
| All API endpoints | `backend/app/api/v1/needs.py` |
| Status transitions | `backend/app/api/v1/needs.py` — `ALLOWED_TRANSITIONS` |
| LLM client (Groq/Azure) | `backend/app/core/llm_client.py` |
| Embedding client (BGE/OpenAI) | `backend/app/core/embedding_client.py` |
| ChromaDB collections | `backend/app/core/chroma.py` |
| Catalog seeding | `backend/app/core/seed_catalog.py` |
| DXC catalog data | `backend/app/data/catalog.json` |
| All config/env vars | `backend/app/core/config.py` |
| Pydantic schemas | `backend/app/schemas/business_need.py` |
| ORM models | `backend/app/models/business_need.py` |
| DB migrations | `backend/alembic/` |
| TypeScript interfaces | `frontend/src/lib/types.ts` |
| API fetch wrapper | `frontend/src/lib/api.ts` |
| Discovery stub data | `frontend/src/lib/discoveryStubs.ts` |
| Workflow progress bar | `frontend/src/components/layout/WorkflowBar.tsx` |
| Gate modal (GO/REWORK/STOP) | `frontend/src/components/workflow/GateModal.tsx` |
| Reusable stage gate | `frontend/src/components/gates/StageGate.tsx` |
| Discovery panel | `frontend/src/components/discovery/DiscoveryPanel.tsx` |
| Sourcing shell | `frontend/src/components/sourcing/SourcingShell.tsx` |
| SG-1 validation panel | `frontend/src/components/sourcing/Sg1ValidationPanel.tsx` |
| SG-2 validation panel | `frontend/src/components/sourcing/Sg2ValidationPanel.tsx` |
| Duplicate warning banner | `frontend/src/components/sourcing/DuplicateBanner.tsx` |
| Global CSS | `frontend/src/app/globals.css` |
| Landing page | `frontend/public/landing.html` |
| Brand icon | `frontend/public/ipm-flow-mark.svg` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Framer Motion |
| Backend | FastAPI (Python 3.11+), SQLAlchemy async, Pydantic v2 |
| Database | PostgreSQL 15 |
| Vector DB | ChromaDB — `hnsw:space: cosine`; 2 collections: `business_needs`, `dxc_catalog` |
| Embeddings | Local `BAAI/bge-small-en-v1.5` (default, warmed up on startup) or OpenAI |
| LLM | Groq `llama-3.3-70b-versatile` (default) or Azure OpenAI; switchable via `.env` |
| Observability | Langfuse (optional — silent if unconfigured) |
| Object Storage | MinIO |
| Styling | CSS custom properties + Framer Motion animations |
| Landing page | Webflow export + lottie-web + GSAP ScrollTrigger |
| Infrastructure | Docker Compose (5 services) |

---

## What's Not in v0 (Phase 2+)

| Feature | Status |
|---|---|
| Tech Signals, Startups, Tech Watch panels | Stub data only (`discoveryStubs.ts`) |
| Evaluation scoring | Manual stub — no LLM call or backend storage |
| Selection page | Mock solutions — no real recommendation engine |
| PDF / DOCX export | Placeholder buttons — no real generation |
| Multi-role support | Single CLIENT DXC role only |
| Authentication / RBAC | None |
| `solutions_reviewed` status transition | Schema only — not wired into backend transitions |
| Test suite | None |
| CI/CD pipeline | None |

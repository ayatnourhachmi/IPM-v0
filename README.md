# IPM — Innovation Progress Model · v0

## What is this?

IPM is an AI-powered innovation intake platform. Business stakeholders submit a free-text pitch, the system auto-classifies it with NLP (objectif, impact, catégorie, contexte), detects duplicates via vector similarity, and routes the initiative through a user-driven pipeline across three phases: **Sourcing → Qualification → Delivery**.

Single user role in v0: **CLIENT DXC** only. No Sponsor Métier.

---

## Full Pipeline (3 Phases · 3 Stage Gates)

<img width="1850" height="271" alt="image" src="https://github.com/user-attachments/assets/3e2fc801-7dd8-433a-aed5-a1a7eec79af2" />


The workflow header is **sticky** on every page and shows the current step highlighted, completed steps with ✓, and the current status badge.

---

## IPM = Innovation Progress Model

Each IPM has:
- **Pitch** — free-text description (≥20 chars, debounced)
- **Horizon** — temporal scope (3-button selector: Court / Moyen / Long)
- **AI Fields** — auto-extracted after analyze, **editable before submit**:
  - Objectif business · Impact attendu · Catégorie · Contexte et contraintes
- **Status** — current stage in the pipeline (see Status Machine below)
- **ID** — auto-generated `BN-YYYY-NNN`

---

## Form Input Model

Only **2 manual user inputs**:
1. **Pitch** (textarea) — debounced, triggers `POST /needs/analyze`
2. **Horizon** (3-button selector) — Court terme / Moyen terme / Long terme

**Everything else is AI-generated**, rendered as editable fields after analysis completes.

---

## Pipeline Steps

### Step 1 — Business Need (`/sourcing`)
- Pitch + Horizon → AI fills objectif, impact, catégorie, contexte
- AI fields are editable before submit
- Submit creates IPM with status `DRAFT`

### Step 2 — Discovery (`/discovery`)
- 4 tool cards: DXC Internal Catalog · Tech Signals / Patents · Startups · Tech Watch
- Each card has 3 states: **idle** (launch button) → **active** (items + checkboxes + relevance scores) → **done** (collapsed chip summary)
- Recap section appears when items are selected, grouped by source
- "Proceed to Qualification →" button navigates directly to Evaluation (no gate modal on this page)
- **SG-1** gate runs at the end of Sourcing (before Discovery), not at the start of Discovery

### Step 3 — Evaluation (`/evaluation`)
- Side-by-side comparison of selected Discovery items
- Scoring grid: fit, feasibility, cost, innovation (1-5)
- **SG-2** gate: GO → IN_QUALIFICATION / REWORK / STOP → ABANDONED

### Step 4 — Selection (`/selection`)
- Select exactly 1 solution from evaluated options
- **SG-3** gate: GO → DELIVERY / REWORK / STOP → ABANDONED

### Step 5 — Recos + PDF/DOCX (`/recos`)
- AI-generated recommendation document (stubbed in v0)
- Export: Download PDF / Download DOCX (stubbed — placeholder files)

---

## Status Machine — All 9 Transitions

**Stage gate placement:**
- **SG-1** fires at the end of Sourcing (after pitch submission), before Discovery
- **SG-2** fires at the end of Evaluation, before Selection
- **SG-3** fires at the end of Selection, before Recos

```
  DRAFT ─────────→ SUBMITTED ──────────→ IN_QUALIFICATION ─────→ DELIVERY
    │   (SG-1 GO)     │   (SG-2 GO)          │   (SG-3 GO)
    │                  │                      │
    ├──→ REWORK        ├──→ REWORK            ├──→ REWORK
    │   (SG-1 Rework)  │   (SG-2 Rework)      │   (SG-3 Rework)
    │                  │                      │
    └──→ ABANDONED     └──→ ABANDONED         └──→ ABANDONED
         (SG-1 Stop)        (SG-2 Stop)            (SG-3 Stop)
```

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

Terminal states: `delivery`, `abandoned` (no further transitions).

---

## How to Run (v0)

```bash
# 1. Clone the repository
git clone <repo-url> && cd IPM-v0

# 2. Copy environment template and add your keys
cp .env.example .env
# Edit .env: set GROQ_API_KEY=gsk_your_key_here

# 3. Build and start all services
docker compose up --build

# 4. Access the app
#    Frontend:  http://localhost:3000
#    API docs:  http://localhost:8000/docs
#    MinIO UI:  http://localhost:9001  (minioadmin / minioadmin)
```

---

## Discovery Stubs — Where to Replace

| Panel | Source Label | Stub File | What to connect |
|---|---|---|---|
| DXC Internal Catalog | DAIC / AI Catalog | `discoveryStubs.ts` | Internal DXC solution catalog API |
| Tech Signals | Patents & Trends | `discoveryStubs.ts` | Patent databases, tech trend APIs |
| Startups | StartupConnect AI | `discoveryStubs.ts` | Startup directory/matching API |
| Tech Watch | AI Watch | `discoveryStubs.ts` | AI/tech watch feed API |

All stubs are in `frontend/src/lib/discoveryStubs.ts`, marked `// TODO: replace stub with real API`.

---

## Key Files & Where to Edit

| Feature | File | What to change |
|---|---|---|
| **Workflow header** | `frontend/src/components/layout/WorkflowBar.tsx` | Add/modify pipeline steps |
| **Stage gate** | `frontend/src/components/gates/StageGate.tsx` | Modify GO/REWORK/STOP logic |
| **Discovery panels** | `frontend/src/components/discovery/DiscoveryPanel.tsx` | Connect real APIs |
| **Discovery stubs** | `frontend/src/lib/discoveryStubs.ts` | Replace mock data |
| **Editable AI fields** | `frontend/src/components/sourcing/PitchPanel.tsx` | Modify AI field layout |
| **API endpoints** | `backend/app/api/v1/needs.py` | Add/modify routes |
| **Status transitions** | `backend/app/api/v1/needs.py` | Edit `ALLOWED_TRANSITIONS` |
| **Pydantic schemas** | `backend/app/schemas/business_need.py` | Add fields, change validation |
| **LLM prompts** | `backend/app/core/llm_client.py` | Edit fallback prompts |
| **LLM provider swap** | `backend/app/core/config.py` | Add new provider settings |
| **Docker services** | `docker-compose.yml` | Add services, change ports |

---

## LLM & Embedding Provider Switching

Both are controlled by env vars — no code changes needed.

```env
# LLM — Groq (default) or Azure OpenAI
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_your_key

# LLM — Azure OpenAI alternative
LLM_PROVIDER=azure
AZURE_OPENAI_API_KEY=your_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/

# Embeddings — local model (default, no API key needed)
EMBEDDING_PROVIDER=local   # uses all-MiniLM-L6-v2, warmed up on startup

# Embeddings — OpenAI alternative
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk_your_key
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Framer Motion |
| Backend | FastAPI (Python), SQLAlchemy async, Pydantic v2 |
| Database | PostgreSQL 15 |
| Vector DB | ChromaDB — cosine similarity duplicate detection |
| Embeddings | Local `all-MiniLM-L6-v2` (default) or OpenAI |
| LLM | Groq (default) or Azure OpenAI — switchable via `.env` |
| Observability | Langfuse (optional) |
| Object Storage | MinIO |
| Styling | CSS custom properties, Framer Motion animations |
| Landing page | Webflow export + lottie-web + GSAP ScrollTrigger |

---

## What's NOT in v0 (Phase 2+)

- **Real Discovery APIs** — all 4 panels use stubs in `discoveryStubs.ts`
- **AI ranking in Evaluation** — scoring is manual, no LLM call
- **PDF/DOCX generation** — export buttons download placeholder text files
- **Multi-role support** — single CLIENT DXC role only, Sponsor Métier is Phase 2
- **Authentication / RBAC** — no login, no roles
- **Test suite** — no unit or integration tests
- **CI/CD pipeline** — no deployment automation

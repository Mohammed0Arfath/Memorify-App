# 🧠 Interview Prep: Memorify — AI-Powered Reflective Diary (Repo-Mapped)

Repository: `Mohammed0Arfath/Memorify-App`  
Branch: `main`

---

## ⭐ STAR Method Overview (Memorify-Specific)

| Component | What to say in interview |
|---|---|
| **Situation** | Users need a private journaling app that goes beyond note-taking and provides emotionally aware, personalized reflection support. |
| **Task** | Build a production-ready React app that integrates AI generation, emotion analysis, memory/check-in logic, and secure per-user storage. |
| **Action** | Implement a modular frontend + service-layer design, integrate Supabase Auth/DB, Together.ai LLM APIs, and ElevenLabs voice widget, with robust fallback and retry/error handling. |
| **Result** | Delivered an AI diary experience with proactive companion behavior, weekly insights, and secure user-scoped data access using RLS. |

---

## S — Situation

Memorify solves the gap between static journaling apps and supportive reflective tools. The product goal is to convert daily conversations into structured diary entries, detect emotional patterns, and proactively support users over time.

**Evidence in repo:**
- Product intent and features: `README.md`
- Entry point and app shell: `src/main.tsx`, `src/components/AppRouter.tsx`

---

## T — Task

My task was to design and ship an architecture where:
1. Users can authenticate and store private entries securely.
2. AI can generate responses, diary entries, and insights.
3. The app can run even when AI APIs fail (fallback mode).
4. Agent behavior (memory/check-ins/insights) can run predictably from user data.

**Core implementation modules:**
- Auth/session: `src/lib/supabase.ts`, `src/hooks/useAuth.ts`, `src/components/AppRouter.tsx`
- Diary CRUD: `src/services/diaryService.ts`
- Agent logic: `src/services/agentService.ts`
- LLM integration + retries: `src/utils/togetherService.ts`
- Fallback AI behavior: `src/utils/mockAI.ts`
- DB schema + policies: `supabase/migrations/20250626170406_frosty_wind.sql`

---

## A — Action (Layer-by-Layer Technical Walkthrough)

## 1) Client/UI Layer (Single deployable app)
- Built as a Vite React TypeScript SPA (`package.json` scripts `dev`/`build`).
- Routing/state transitions handled in `src/components/AppRouter.tsx`.
- Main UX orchestration happens in `src/App.tsx` (`loadEntries`, `handleGenerateEntry`, `runInitialAgentLoop`).

**Deployed separately?**
- Yes: this repo primarily deploys as one frontend service/artifact.

## 2) Identity + Session Service (Supabase Auth)
- Supabase client initialized in `src/lib/supabase.ts`.
- Session lifecycle and auth listeners in:
  - `src/components/AppRouter.tsx` (`supabase.auth.getSession`, `onAuthStateChange`)
  - `src/hooks/useAuth.ts` (signIn/signUp/signOut/reset/update methods)

**Communication style:**
- Browser SDK calls over HTTPS to Supabase managed APIs.

## 3) Data Service (Supabase Postgres)
- Diary persistence implemented in `src/services/diaryService.ts`:
  - `createEntry`, `getEntries`, `updateEntry`, `deleteEntry`
- Agent-related persistence in `src/services/agentService.ts`:
  - memories (`agent_memories`), check-ins (`agent_checkins`), settings (`agent_settings`), weekly insights (`weekly_insights`)
- Schema and security are defined in SQL migration:
  - `supabase/migrations/20250626170406_frosty_wind.sql`
  - RLS enabled + per-user policies (`auth.uid() = user_id`) on all core tables.

**Communication style:**
- HTTPS via Supabase JS client; no direct DB socket from frontend.

## 4) AI Inference Service (Together.ai)
- Config in `src/config/together.ts` (`baseURL`, model, token/temperature).
- API orchestration in `src/utils/togetherService.ts`:
  - `makeRequest` with retries, timeout, status-based error mapping.
  - AI features: `generateAIResponse`, `generateDiaryEntry`, `analyzeEmotionWithAI`, `generateWeeklyInsight`, `extractMemoryPatterns`, `generateCheckinMessage`.

**Communication style:**
- REST over HTTPS (`https://api.together.xyz/v1/chat/completions`).

## 5) Agentic Behavior Layer (Application service module)
- Implemented in `src/services/agentService.ts`.
- `runAgentLoop(entries)` drives proactive checks:
  - inactivity trigger (`checkInactivityTrigger`)
  - emotional pattern trigger (`checkEmotionalPatterns`)
  - milestone trigger (`checkMilestones`)
  - memory extraction (`updateMemoriesFromEntries`)
- Uses both data service (Supabase tables) and AI service (`togetherService`) to produce check-ins and insights.

**Important interview point:**
- This is a logical “service” in code, but not a separately deployed microservice in this repo.

## 6) Fallback/Resilience Layer
- `src/utils/mockAI.ts` routes to Together.ai when API key exists, else fallback behavior.
- Fallback includes template-based generation and rule-based emotion analysis.
- Error/retry wrappers are consistently used via `src/utils/errorHandler.ts` from service modules.

## 7) Voice Integration Service (ElevenLabs)
- `src/components/VoiceChat.tsx` embeds `elevenlabs-convai` web component using `agent-id`.
- Voice is integrated as external SaaS, not local backend logic.

---

## Microservice Architecture: Is Memorify a Microservices System?

### Short answer
**Partially / externally.** The repo itself is a **frontend-centric modular app**, not a repo containing multiple independently deployable internal services.  
However, runtime behavior is **service-oriented** by integrating multiple external managed services.

### What is separately deployed?
1. **Frontend app** (this repo build artifact).
2. **Supabase services** (Auth + Postgres + RLS policies) configured externally; schema managed via `supabase/migrations/...sql`.
3. **Together.ai inference service** (external LLM API).
4. **ElevenLabs conversational voice service** (external widget/agent).

### How do they communicate?
- **REST/HTTPS APIs** from frontend to external services (Supabase client APIs + Together API endpoint).
- **No gRPC**, **no message bus**, **no internal event broker** in this repo.

### Strengths in this design
- Faster delivery: no custom backend needed for MVP.
- Clear separation of concerns in code modules (`diaryService`, `agentService`, `togetherService`).
- Built-in security primitives from Supabase (RLS per user).
- Resilience from fallback paths (`mockAI`) when AI service fails.

### Tradeoffs
- Vendor dependency across multiple SaaS providers.
- Latency/network variability for all core intelligence calls.
- API key handling note in README: Together API currently called from browser; README recommends moving this to backend for production-hardening.
- No internal asynchronous queue/event bus, so long-running jobs are client-driven.

---

## Code + Config Annotations You Can Show in Interview

- **Supabase initialization and env validation:** `src/lib/supabase.ts`
- **AI endpoint/model config:** `src/config/together.ts`
- **Diary persistence API calls:** `src/services/diaryService.ts`
- **Agent orchestration and triggers:** `src/services/agentService.ts`
- **LLM request/retry/timeout handling:** `src/utils/togetherService.ts`
- **Fallback pipeline (when AI key missing or errors):** `src/utils/mockAI.ts`
- **Auth/session state transitions:** `src/components/AppRouter.tsx`, `src/hooks/useAuth.ts`
- **DB schema + RLS policies:** `supabase/migrations/20250626170406_frosty_wind.sql`
- **Voice SaaS integration:** `src/components/VoiceChat.tsx`

---

## Architecture Diagram (ASCII)

```text
[User Browser / React SPA]
        |
        | UI events + local state
        v
[src/App.tsx + components/*]
        |
        | calls
        +-----------------------> [DiaryService] ----HTTPS----> [Supabase Postgres]
        |                                   |                    (diary_entries, weekly_insights,
        |                                   |                     agent_memories, agent_checkins,
        |                                   |                     agent_settings + RLS)
        |
        +-----------------------> [AgentService]
        |                          |      \
        |                          |       \--uses--> [TogetherService] --REST--> [Together.ai]
        |                          |
        |                          \--writes/reads--> [Supabase tables]
        |
        +-----------------------> [VoiceChat component] --widget/API--> [ElevenLabs]
```

---

## R — Result (Interview Power Statements)

1. **“I delivered a service-oriented AI diary app where the frontend orchestrates Supabase Auth/DB, Together.ai reasoning, and ElevenLabs voice in one cohesive product flow.”**
2. **“I implemented secure multi-tenant data access with Supabase RLS so every diary, memory, and insight query is constrained by `auth.uid() = user_id`.”**
3. **“I designed graceful degradation: if AI calls fail or keys are missing, users still get journaling functionality via deterministic fallback generation and local logic.”**
4. **“I separated concerns with explicit service modules, making it easy to evolve into true backend microservices later without rewriting core product logic.”**

---

## 30-Second Interview Summary

“Memorify is a React + TypeScript journaling platform that combines secure per-user data storage in Supabase with AI-powered reflection via Together.ai and optional voice interaction via ElevenLabs. Architecturally, the repo is a frontend deployable that integrates external managed services rather than hosting multiple internal microservices. Inside the code, service boundaries are explicit—`diaryService` for CRUD, `agentService` for proactive intelligence, and `togetherService` for LLM orchestration—while Supabase migration SQL enforces RLS-backed data isolation.”

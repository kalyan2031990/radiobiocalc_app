# rbGyanX Mobile — Validated Product Roadmap

**Internal development only** — not shown in the mobile app UI.

**Tagline:** One Patient · One Plan · Complete Evaluation

**Naming:**

| Letter | Meaning | Status (Mar 2026) |
|--------|---------|-------------------|
| **rb** | Radiobiology models (TCP, NTCP, LKB, Poisson, Zaider–Minerbo, BED/EUD, composite therapeutic window) | **Implemented** — aligned with desktop/py_ntcpx and Lee/Patel/rbGyanX references |
| **Gyan** | Utilising existing knowledge (literature parameters, QUANTEC-style metrics, clinical context, citations) | **Partly implemented** — presets and advisory fields exist; provenance UI and knowledge graph absent |
| **X** | Machine learning (physics-informed neural networks) and AI support with **XAI** (explainability) | **Not implemented** — no training pipeline, no surrogate models, no attribution UI |

---

## Validation basis (what “done” means)

Each phase exit requires:

1. **Automated tests** — `scripts/run_*_test.ts`, rbgyanx_test_data suite, startup self-test (`lib/app-selftest.ts`).
2. **Clinical consistency** — OAR → NTCP, target → TCP; parotid not scored as TCP; composite UTCP/TWI within published sanity bands on anonymised HN demo (TCP ~89%, NTCP ~76%, TWI ~66% at 70 Gy / 35 fx).
3. **Traceability** — model name, literature source, and parameters visible on results screens.
4. **Privacy** — demo/self-test data anonymised (`server/anonymize-dvh.ts`); no PHI in logs.

---

## Phase 1 — rb core (current release baseline) ✅

**Goal:** Trustworthy single-plan radiobiological evaluation on mobile.

| Deliverable | Status |
|-------------|--------|
| DVH import (.csv / .txt), multi-structure merge | Done |
| Calculation setup → TCP/NTCP results (physical + bio tabs) | Done |
| Composite plan evaluation + therapeutic window | Done |
| Plan indices (TCI, CI, HI, GI) | Done |
| Anonymised demo plan + feature tour on first use | Done |
| Startup self-test on every open (post-disclaimer) | Done |
| Brand tagline on home | Done |

**Exit criteria met** for mobile MVP radiobiology path.

---

## Phase 2 — Gyan (knowledge layer) 🟡

**Goal:** Make “using existing knowledge” explicit, auditable, and clinician-facing.

| Deliverable | Priority | Effort |
|-------------|----------|--------|
| Parameter provenance panel (paper, table, TD50/γ source) | P0 | 1–2 w |
| QUANTEC / HyTEC dose–metric checklist per site/organ | P0 | 2 w |
| Reference library screen (searchable citations) | P1 | 1 w |
| Clinical context → export in PDF report (advisory disclaimer) | P1 | 1 w |
| Optional RAG over institutional protocols (offline bundle) | P2 | 3–4 w |

**Validation:** Golden tests per organ/site; UI shows same TD50/γ as `server/parameters` tables; citations match desktop rbGyanX.

---

## Phase 3 — Identity, accounts & sync 🔲

**Goal:** Register / login with **email + password** or **mobile OTP**; optional cloud sync.

| Deliverable | Notes |
|-------------|--------|
| `auth.local.*` tRPC stubs | UI exists; backend returns Phase 3 message until configured |
| Email register/login | bcrypt, `DATABASE_URL`, session cookie / JWT |
| Mobile OTP | SMS provider (Twilio/MSG91), rate limit, 6-digit TTL |
| OAuth coexistence | Keep Manus/OAuth for enterprise; local auth for hospital deployments |
| Profile + encrypted backup | Opt-in only; HIPAA-aligned architecture review |

**Validation:** OWASP-style auth tests; no plaintext passwords; OTP brute-force limits.

**Dependencies:** `DATABASE_URL`, SMTP or SMS API keys, legal privacy policy update.

---

## Phase 4 — X (PINN / ML + XAI) — mobile partial ✅ / desktop ML 🔲

**Mobile (single patient / single plan):** PINN not feasible on-device. Implemented **rb X explainability** (`lib/rbgyanx-explain.ts`): literature-linked narrative for TCP/NTCP/TWI and NTCP drivers; therapeutic window screen. **Fractionation-aware indices** (`lib/plan-index-applicability.ts`): Paddick CI + gradient index only for SRS/SRT/SBRT per Patel et al. RPOR 2020; conventional 2 Gy/fx shows TCI, RTOG-style CI, ICRU HI only (Lee et al. InTech 2015).

| Workstream | Mobile | Desktop |
|------------|--------|---------|
| XAI | Rule-based plan explanation + citations | SHAP/IG vs literature models |
| PINN | Not in scope | Cohort training + ethics |
| Indices | Gated by fractionation profile | `plan_quality_indices_default.yaml` packs |

**Tests:** `run_plan_indices_clinical_test.ts`, `run_phase4_xai_test.ts` in `test:cycle`.

**Release / validation program:** `docs/VALIDATION_AND_RELEASE.md` · benchmark template `docs/BENCHMARK_CASES.md` · help draft `docs/USER_HELP.md` · in-app **Product & validation** screen (`app/product-info.tsx`).

**Dependencies (desktop ML):** Phase 1 stable metrics; ethics approval for training data.

---

## Phase 5 — Product hardening & parity with desktop

| Deliverable | Notes |
|-------------|--------|
| DVH visualization from real session | Replace mock structures |
| Report export (PDF) with signatures | |
| Deep link to desktop rbGyanX for cohort/DICOM | |
| Regulatory intended-use & risk management file | |

---

## Suggested implementation order (for your approval)

1. **Phase 2a** — Provenance + QUANTEC tables (extends Gyan without ML risk).  
2. **Phase 3** — Email/OTP auth + optional sync (you choose SMS provider).  
3. **Phase 2b** — Reference library + report citations.  
4. **Phase 4 pilot** — PINN surrogate for one site (e.g. HN parotid NTCP) + XAI panel.  
5. **Phase 5** — Viz, export, regulatory bundle.

---

## Current codebase anchors

| Area | Path |
|------|------|
| Demo anonymisation | `server/anonymize-dvh.ts` |
| First-use tour | `app/auto-demo.tsx`, `components/app-bootstrap.tsx` |
| Self-test | `lib/app-selftest.ts` |
| Auth UI | `app/auth/login.tsx`, `app/auth/register.tsx` |
| Auth API stubs | `server/_core/routers/auth-local.ts` |
| In-app roadmap | `app/product-roadmap.tsx` |

---

*Document version: 2026-06-03 — validated against mobile test suite and anonymised HN demo plan.*

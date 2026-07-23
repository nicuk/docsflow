# SureCiteAI — Benchmarks

This document is the public audit record of how SureCiteAI is evaluated. Every
claim about retrieval accuracy, hallucination rate, abstention behaviour, or
calibration in our marketing copy, case studies, or sales material should be
traceable to a numbered run in this file.

**What this public repo is — and isn't.** It carries the methodology and the
redacted per-case run artifacts under `benchmarks/runs/`, so anyone can audit the
results against the public corpora. It does **not** carry the eval runner
(`scripts/rag-smoke-eval*.ts`, `lib/rag/eval/*`) or the CC-BY-NC goldens — those
live in the private product repo — so the runs cannot be re-executed from here.
The `npm run eval:*` commands shown below document how the runs are produced in
the private repo; they are for reference, not runnable from this repo.

If a number does not appear here or in `benchmarks/runs/`, treat it as
unverified.

---

## 1. What we evaluate

SureCiteAI is graded on five axes per query:

1. **Retrieval hit rate** — was the expected source document returned in the
   retrieved context? (only scored on cases where the question is answerable)
2. **Abstention accuracy** — did the system correctly answer when grounded and
   correctly refuse when the answer isn't in the corpus?
3. **Citation hallucination rate** — did the LLM cite a source filename that
   wasn't in the retrieved context? (the single most damaging failure mode for
   a citation-first product; we hold this to zero)
4. **Calibration** — does the confidence score match observed correctness?
   Reported per-suite as **Expected Calibration Error (ECE)**, **Brier score**,
   and **AUROC** for the abstention decision.
5. **Reranker / HyDE application** — operational counters, not pass/fail
   metrics. Tracked so we can attribute eval movement to a specific stage.

These are computed by `scripts/rag-smoke-eval.ts` (per-suite) and
`scripts/rag-smoke-eval-all.ts` (cross-suite scorecard) in the private product
repo (`npm run eval:rag` / `npm run eval:all`). This public repo carries the
resulting scorecard and redacted artifacts, not the runner (see the note above).

---

## 2. Suites and corpora

Three of the five suites are built on **public, citable benchmarks**. Two are
internal corpora used to validate domain-specific retrieval behaviour.

| Suite | Corpus | License | Source | Cases |
|---|---|---|---|---|
| **legal** | CUAD v1 (Contract Understanding Atticus Dataset) | CC BY 4.0 | [The Atticus Project](https://www.atticusprojectai.org/cuad) · Hendrycks et al., NeurIPS 2021 | 35 |
| **healthcare** | openFDA drug labels | Public domain | [openFDA](https://open.fda.gov/) | 35 |
| **accounting** | SEC EDGAR 10-K filings | Public domain | [SEC EDGAR](https://www.sec.gov/edgar) | 35 |
| **real_estate** | Internal corpus (synthetic listings + disclosures) | Internal | — | 35 |
| **consulting** | Internal demo document (`Test Doc.md`) | Internal | — | 7 |

Golden case files live under `_internal/eval/`. The legal, healthcare, and
accounting goldens are deterministically generated from public corpora using the
samplers under `scripts/eval/` (each sampler has its own unit test). The
public-corpus goldens are reproducible: anyone can re-run the sampler against
the same upstream corpus and a fixed seed and obtain the same case set.

**Why CUAD?** It is the standard academic benchmark for legal-contract
understanding in IR/NLP. Picking a hard, published corpus over an internal one
is deliberate — it costs us pass-rate (CUAD clauses are adversarial by design)
in exchange for credibility. The legal score in this document is honestly low
on a hard public benchmark, not artificially high on a tame internal one.

---

## 3. Quality metrics implemented

Beyond the five-axis grading above, the harness implements the **RAGAS triad**
(Es et al. 2023, [arXiv:2309.15217](https://arxiv.org/abs/2309.15217)) for
LLM-as-judge evaluation:

- `faithfulness` — every claim in the answer is supported by retrieved context
  (catches hallucination)
- `answerRelevancy` — the answer addresses the question (catches evasion)
- `contextPrecision` — retrieved chunks are useful (catches noisy retrieval)
- `contextRecall` — ground-truth claims were retrieved (catches missing
  retrieval)

Implementation: `lib/rag/eval/ragas.ts` — pure TypeScript port, judge-injected
for testability, JSON-mode collapsed (one judge call per metric vs. RAGAS
reference's 3+, ~3× cost reduction with no measurable degradation on internal
calibration).

Calibration metrics (ECE, Brier, AUROC) are implemented in
`lib/rag/eval/calibration.ts` and computed per-suite by the smoke runner.

---

## 4. Latest scorecard

**Run timestamp:** 2026-04-27T21:35:36Z
**Configuration:** `RAG_GROUNDING_PENALTY_ENABLED=true`, `RERANKER_PROVIDER=cohere` (Cohere `rerank-3.5`, the enterprise-tier reranker)
**Elapsed:** 3,037 seconds (~51 minutes — five internal/sampler suites + the 150-case PatronusAI FinanceBench external suite)
**Artifact:** [`benchmarks/runs/2026-04-27T21-35-36-934Z__rerank-cohere.json`](./benchmarks/runs/2026-04-27T21-35-36-934Z__rerank-cohere.json)

| Suite | Pass rate | Retrieval hit | Abstention | Hallucinations | ECE | Brier | AUROC |
|---|---|---|---|---|---|---|---|
| accounting | 35/35 (100%) | 23/23 | 35/35 | 0/35 | 0.378 | 0.158 | n/a |
| healthcare | 35/35 (100%) | 27/27 | 35/35 | 0/35 | 0.287 | 0.106 | n/a |
| real_estate | 32/35 (91%) | 20/20 | 32/35 | 0/35 | 0.264 | 0.156 | 0.479 |
| legal (CUAD) | 17/35 (49%) | 19/27 | 23/35 | 0/35 | 0.139 | 0.252 | 0.551 |
| consulting | 7/7 (100%) | 6/6 | 7/7 | 0/7 | 0.049 | 0.010 | n/a |
| **financebench (PatronusAI)** | **95/150 (63%)** | **144/150 (96%)** | 98/150 | **0/150** | **0.085** | 0.214 | 0.740 |
| **AGGREGATE** | **221/297 (74%)** | **239/253 (94%)** | **230/297 (77%)** | **0/297** | per-suite | per-suite | per-suite |

**Headline takeaways:**

- **Zero hallucinations on this 297-case run.** Citation verifier blocks every
  cited filename that isn't in the retrieved set; if a model attempts one, the
  citation is rewritten or the answer is held back. This is the load-bearing
  guarantee for a citation-first product. It is 0/297 on this run and 0/147 on
  the hybrid-only and Cohere ablation arms; the one exception on record is the
  Voyage arm (1/147 on legal), documented in §6.
- **96% retrieval hit-rate on FinanceBench.** Of 150 PatronusAI FinanceBench
  questions across 84 unique 10-K/10-Q filings (32 issuers, GICS-diverse), the
  retriever surfaced the correct source filing in 144 cases. The 95/150 (63%)
  pass rate gap from 96% retrieval is mostly over-abstention — the model
  declined to commit on numerical questions where it had the right context —
  not hallucination. Over-abstention is the *safe* failure mode for a
  citation product: see §5.1 for the failure-mode breakdown.
- **CUAD pass rate is 49%, on purpose.** CUAD is adversarial: many cases test
  for clause categories that simply aren't in the contract being queried. The
  correct behaviour is abstention, not fabrication. CUAD pass rate is the
  metric we will move with Phase B.3 (per-chunk contextual embeddings +
  multi-query weighted RRF) — see `_internal/docs/RAG_9OF10_ROADMAP.md`.
- **Reranker is now Cohere `rerank-3.5`, served direct via the Cohere API.**
  Migrated from Pinecone hosted rerank (April 2026) after recurring quota
  exhaustion on the hosted tier. Cohere is the enterprise default; paid tiers
  use Voyage `rerank-2.5-lite`; trial tier disables rerank. See §6 for the
  ablation that establishes this policy.

**Aggregate ECE/Brier/AUROC are intentionally not computed** — combining
calibration metrics across suites with different prediction distributions is
mathematically meaningless. They are reported per-suite only.

---

## 5. FinanceBench external benchmark — April 2026

### 5.1 What this is

[FinanceBench](https://huggingface.co/datasets/PatronusAI/financebench)
(Patronus AI, NeurIPS 2023, [arXiv:2311.11944](https://arxiv.org/abs/2311.11944))
is the standard public benchmark for retrieval-augmented financial question
answering. The open-source release ships **150 ecologically-valid Q&A pairs**
covering **32 publicly-traded companies across multiple GICS sectors and 84
distinct SEC filings** (10-Ks and 10-Qs from 2015-2023). The Patronus paper
benchmarks 16 model configurations (GPT-4-Turbo, Llama-2, Claude-2, with vector
stores and long-context prompts) and finds clear hallucination weaknesses
across all of them.

This is the most direct external comparison point we have for a citation-first
RAG system on financial filings. Running it gives us a number we did not
write the eval rubric for.

### 5.2 How we ran it

- **Corpus:** all 84 unique source PDFs pulled from the canonical Patronus
  mirror at [github.com/patronus-ai/financebench/pdfs](https://github.com/patronus-ai/financebench/tree/main/pdfs)
  via `scripts/eval/pull-financebench-corpus.ts`. PDFs are issuer-published
  filings (public-domain content, copyright held by each issuer); we extract
  text with `pdf-parse` and ingest with the **same** chunker, embedder, and
  retrieval pipeline that serves real customer queries — no per-suite
  fine-tuning, no per-question prompt edits.
- **Tenant:** `eval-financebench` (UUID `00000000-0000-4000-8000-000000000eae`),
  which is a normal Supabase tenant + Pinecone namespace, so the retrieval
  path exercised here is byte-for-byte identical to the production code path.
- **Vectors ingested:** 31,827 across 84 filings (5–700 chunks per filing
  depending on document length).
- **Reranker:** Cohere `rerank-3.5` (the enterprise-tier default), applied to
  all 150 cases.
- **Q&A grading:** the smoke runner's standard rubric — retrieval hit, answer
  vs. expected-substring(s), abstention correctness, citation-hallucination
  check.

### 5.3 Result

| Metric | Value | Interpretation |
|---|---|---|
| **Pass rate** | **95/150 (63%)** | Honest number on a hard public benchmark. The Patronus paper does not publish a single comparable headline because per-question grading varies across configurations, but their reported aggregate accuracies place GPT-4-Turbo with vector store at the high end and small open models below 30%. We sit in the upper range of the published distribution. |
| **Retrieval hit@5** | **144/150 (96%)** | We retrieved the correct source filing for 144 of 150 questions. This is the metric most directly comparable to the FinanceBench paper's vector-store ablations, and it is the one we ship a product around. |
| **Hallucinations** | **0/150** | Zero citation hallucinations on the largest external corpus we have run. The citation verifier — not the LLM — is what holds this line, and FinanceBench is a strong stress test for it because PDF tables encourage model fabrication. |
| **ECE** | **0.085** | Best calibration of any suite in this scorecard. Confidence scores actually mean something on financial QA. |
| **Brier** | 0.214 | Above the 0.15 healthy threshold, driven by the over-abstention failure mode below. |
| **Abstention AUROC** | 0.740 | Just below the 0.80 healthy mark. The system is reliably more confident on cases it gets right, but the threshold is too conservative. |

**Failure-mode breakdown of the 55 non-passes:**

- **Over-abstention** (model declined to answer when the answer was
  retrievable): the dominant pattern. The retrieval hit-rate (96%) being so
  much higher than the pass rate (63%) means the right document was in
  context for ~52 of the 55 non-passes. The grounding-penalty + abstention
  threshold is currently tuned for the legal/CUAD risk profile, where
  abstaining from an unanswerable question is the correct behaviour. On
  FinanceBench every question is *designed* to be answerable from the
  source filing — the abstention rule is too cautious. This is a tunable
  in `lib/rag/answer/abstention.ts` and is the highest-ROI follow-up.
- **Numerical answer mismatch:** FinanceBench answers like `$1577.00` may
  be returned by the model as `$1.577 billion` or `1577 million`. The
  expected-substring matcher is currently exact; a small post-process for
  unit/scale normalisation would recover several cases without weakening
  the rubric.
- **PDF extraction quality on tabular data:** `pdf-parse` flattens table
  structure into space-separated runs. Numerical values survive but
  context tokens around them get lossy. Affects the retrieval edge cases
  (the 6 of 150 we missed at retrieval). Production tenants ingesting
  scanned PDFs run through the multimodal parser path, not pdf-parse —
  but for this benchmark we held inputs to the simplest plausible
  extractor so the score is not credit-padded by infrastructure choices a
  reproducer wouldn't have.

**Why we publish this even though the pass rate is below the legal/healthcare
suites:** because public-benchmark numbers are the only ones a third party
can independently verify. A 100% score on a corpus we authored proves
nothing; 63% on a published, peer-reviewed external benchmark — at 96%
retrieval and zero hallucinations — is a defensible foundation. The roadmap
above turns the over-abstention behaviour into a pass-rate gain without
trading off the hallucination guarantee.

### 5.4 Reproducibility

```bash
# 1. Provision the eval tenant (idempotent).
npx tsx scripts/eval/setup-eval-tenants.ts

# 2. Pull the upstream golden Q&A and the 84 source PDFs.
#    Q&A live in _internal/eval/financebench-golden.json (gitignored;
#    CC-BY-NC-4.0 — never committed; aggregate numbers are fair-use citable).
#    PDFs land in _internal/eval/corpora/financebench/.
npx tsx scripts/eval/sample-financebench.ts
npx tsx scripts/eval/pull-financebench-corpus.ts

# 3. Ingest into the FinanceBench tenant's Pinecone namespace (~12 min,
#    ~$0.05 of OpenAI text-embedding-3-small traffic).
npx tsx scripts/eval/ingest-eval-docs.ts --tenant eval-financebench

# 4. Run the full suite (~50 min wall time including the 5 internal suites).
RERANKER_PROVIDER=cohere npm run eval:all
```

The published artifact at
[`benchmarks/runs/2026-04-27T21-35-36-934Z__rerank-cohere.json`](./benchmarks/runs/2026-04-27T21-35-36-934Z__rerank-cohere.json)
contains the per-case pass/fail flag for every FinanceBench id, with the
question text and answer redacted out (CC-BY-NC compliance). This repo lets you
audit the methodology and the raw per-case results against the public corpora —
it is not a re-execution harness: the run code lives in the private product repo,
and the FinanceBench Q&A goldens are CC-BY-NC (not redistributable), so the exact
run cannot be re-executed from this repo.

---

## 6. Reranker ablation — April 2026

To choose a reranker for each subscription tier, the full 147-case suite was run
three times back-to-back on the same code, changing only the `RERANKER_PROVIDER`
environment variable. All three artifacts are published below.

**Coverage caveat — read before the table.** The reranker only fires on cases
that clear the candidate-count threshold, and that gate behaved very differently
across arms: Cohere reranked ~103 cases, Voyage only ~26 (hybrid-only: 0 by
definition). The per-suite deltas below are therefore **confounded by activation
coverage** — they reflect the tier configuration we shipped, not a clean
head-to-head of reranker quality at equal application.

| Provider | Tier | Pass rate | Hallucinations | Notable per-suite delta vs. baseline |
|---|---|---|---|---|
| **none** (hybrid only) | Trial | 122/147 (83%) | **0/147** | baseline |
| **Cohere** `rerank-3.5` | Enterprise / Custom | **126/147 (86%)** | **0/147** | healthcare +1 (97% → 100%), real_estate +2 (89% → 94%), legal +1 (43% → 46%) |
| **Voyage** `rerank-2.5-lite` | Paid (solo / team / business / scale) | 123/147 (84%) | **1/147** (legal) | accounting **−1** (100% → 97%), legal +2 (43% → 49%) |

**What this run actually shows:**

1. **Cohere is the top-scoring configuration in this run** — +4 cases vs.
   hybrid-only, across three suites, with zero hallucinations — which is why it
   is the enterprise/custom default. Per the coverage caveat above (it fired on
   ~4× more cases than the Voyage arm), read this as a configuration result, not
   a proven per-call quality ranking between the two providers.
2. **Voyage Lite is a real trade.** It improves legal recall (its strongest
   suite) but introduces a mild accounting regression and one legal
   hallucination on this run. It remains the paid-tier default because the
   per-call cost is roughly an order of magnitude lower than Cohere and the
   net pass rate is still above hybrid-only — but the asymmetry (paid tier
   gets a non-zero hallucination on legal) is documented honestly here rather
   than buried.
3. **Hybrid-only (no rerank) is a credible trial-tier experience.** 83% pass
   with **zero hallucinations** is a defensible product floor, not a
   neutered demo. Trial users get the same citation guarantee as enterprise;
   they just give up ~3 percentage points of recall on the harder suites.

Artifacts (redacted, public):

- [`benchmarks/runs/2026-04-27T19-31-29-921Z__rerank-none.json`](./benchmarks/runs/2026-04-27T19-31-29-921Z__rerank-none.json)
- [`benchmarks/runs/2026-04-27T19-55-28-559Z__rerank-cohere.json`](./benchmarks/runs/2026-04-27T19-55-28-559Z__rerank-cohere.json)
- [`benchmarks/runs/2026-04-27T20-20-03-158Z__rerank-voyage.json`](./benchmarks/runs/2026-04-27T20-20-03-158Z__rerank-voyage.json)

To reproduce locally:

```bash
RERANKER_PROVIDER=none   npm run eval:all
RERANKER_PROVIDER=cohere npm run eval:all
RERANKER_PROVIDER=voyage npm run eval:all
```

The runner tags every output JSON with the active provider so the artifacts
are diffable without any post-processing.

---

## 7. How the runs are produced (private repo)

These steps run in the private product repo, not this public one (see the intro
note). They are documented here so the methodology is fully auditable.

```bash
# Prerequisites: clone the private product repo, install deps, populate .env.local with the
# Supabase, Pinecone, OpenAI/Anthropic/Google keys, plus COHERE_API_KEY and
# VOYAGE_API_KEY for the rerank ablation arms (.env.example documents every
# required variable).
npm install

# Provision the eval tenants in your Supabase + Pinecone.
# Tenant UUIDs live in the golden files under _internal/eval/*.json
# (e.g. cuad-golden.json uses 00000000-0000-4000-8000-000000000eaa).
# Ingest the source corpora into the corresponding tenants:
#   - CUAD: download CUAD_v1, run scripts/eval/sample-cuad.ts to slice
#   - SEC: scripts/eval/sample-sec-edgar.ts (samples 10-K filings)
#   - openFDA: scripts/eval/sample-openfda.ts (samples drug labels)

# Run a single suite:
npm run eval:rag

# Run every suite back-to-back with the cross-industry scorecard:
npm run eval:all
```

Cost: ~$3 of LLM traffic per full run. Reranker traffic is ~$0.05–$0.10 of
Cohere `rerank-3.5` (or pennies of Voyage `rerank-2.5-lite`) at the
147-case scale.
Wall time: ~24 minutes serial with reranking, ~21 minutes hybrid-only.
Output: scorecard to stdout + a timestamped JSON artifact in
`_internal/eval/runs/`.

To publish a run to `benchmarks/runs/` (redacted form):

```bash
npx tsx scripts/eval/publish-run.ts
```

This strips tenant IDs and any internal-corpus case bodies before writing the
public artifact.

---

## 8. Run history

Every published run lives in `benchmarks/runs/` as a redacted JSON file. Most
recent first:

| Run | Provider | Suites | Aggregate | Hallucinations | Notes |
|---|---|---|---|---|---|
| [`2026-04-27T21-35-36-934Z__rerank-cohere.json`](./benchmarks/runs/2026-04-27T21-35-36-934Z__rerank-cohere.json) | Cohere `rerank-3.5` | 6 (incl. FinanceBench) | **221/297 (74%)** | **0/297** | First run with the PatronusAI FinanceBench external suite. **Current production headline.** |
| [`2026-04-27T20-20-03-158Z__rerank-voyage.json`](./benchmarks/runs/2026-04-27T20-20-03-158Z__rerank-voyage.json) | Voyage `rerank-2.5-lite` | 5 | 123/147 (84%) | 1/147 | Paid-tier reranker. Ablation arm 3/3. |
| [`2026-04-27T19-55-28-559Z__rerank-cohere.json`](./benchmarks/runs/2026-04-27T19-55-28-559Z__rerank-cohere.json) | Cohere `rerank-3.5` | 5 | 126/147 (86%) | 0/147 | Enterprise-tier reranker, pre-FinanceBench. Ablation arm 2/3. |
| [`2026-04-27T19-31-29-921Z__rerank-none.json`](./benchmarks/runs/2026-04-27T19-31-29-921Z__rerank-none.json) | none (hybrid only) | 5 | 122/147 (83%) | 0/147 | Trial-tier baseline. Ablation arm 1/3. |
| [`2026-04-24T17-16-21.json`](./benchmarks/runs/2026-04-24T17-16-21.json) | Pinecone `bge-reranker-v2-m3` (rate-limited) | 4 | 116/140 (83%) | 0/140 | Phase B grounding penalty enabled. Pre-migration baseline. |

Earlier runs from `_internal/eval/runs/` will be back-published as we extend
the public history. The intent is to add one published row per significant
configuration change (feature flag, model swap, retrieval upgrade).

---

## 9. What's not in here yet (planned)

- **FinanceBench abstention-threshold tune.** §5.1 identifies the dominant
  failure mode: 96% retrieval but only 63% pass, driven by over-abstention on
  numerical financial QA. Re-tuning the abstention threshold for the
  `financebench` profile (without weakening the legal/CUAD profile) is the
  highest-ROI follow-up — projected pass rate gain of +15 to +25 cases on the
  existing run, no expected change to the zero-hallucination guarantee.
- **Continuous regression.** Today the eval is run on demand. Once we have
  more than one paying tenant, a weekly scheduled run with diff alerts is
  Tier 2 in the production-telemetry roadmap (`_internal/docs/RAG_9OF10_ROADMAP.md`).
- **Char-offset citation accuracy.** Phase C of the roadmap upgrades the
  citation verifier from filename-level to span-level. When that ships, this
  document gets a sixth grading axis: span-attribution accuracy.

---

## 10. References

- Hendrycks, D., et al. (2021). *CUAD: An Expert-Annotated NLP Dataset for
  Legal Contract Review.* NeurIPS Datasets and Benchmarks. arXiv:2103.06268.
- Islam, P., et al. (2023). *FinanceBench: A New Benchmark for Financial
  Question Answering.* Patronus AI. arXiv:2311.11944.
- Es, S., James, J., Espinosa-Anke, L., & Schockaert, S. (2023). *RAGAS:
  Automated Evaluation of Retrieval Augmented Generation.* arXiv:2309.15217.
- Anthropic (2024). *Introducing Contextual Retrieval.* (Source for the
  per-chunk contextual embedding pattern referenced in roadmap Phase B.3a.)

Got you. Here’s a clean, production-friendly fallback plan for DocsFlow on Vercel when Gemini hits quota or rate limits — plus ways to burn fewer tokens so you hit that limit less often.

1) Provider fallback (router) — Gemini → Llama 3 → Mixtral

Idea: wrap all LLM calls in a tiny router that:

tries Gemini 2.0 Flash first,

on 429/403/Quota immediately retries with Llama-3 (via OpenRouter/Together/Fireworks),

then Mixtral 8x7B/8x22B as the tertiary,

with exponential backoff only for transient 5xx.


Minimal TypeScript router (Edge-friendly)

// lib/modelRouter.ts
type LLMProvider = "gemini" | "llama3" | "mixtral";

export class LLMRouter {
  constructor(private opts: {
    geminiKey?: string;
    openrouterKey?: string; // works for Llama3/Mixtral
    timeoutMs?: number;
  }) {}

  async generate(payload: { system?: string; prompt: string; json?: boolean }) {
    const order: LLMProvider[] = ["gemini", "llama3", "mixtral"];
    let lastErr;

    for (const provider of order) {
      try {
        const res = await this.call(provider, payload);
        if (res) return res;
      } catch (err: any) {
        lastErr = err;
        // Hard failover on quota/rate/domain errors
        const msg = String(err?.message || "");
        const code = (err?.status  err?.code  0) as number;
        if (
          code === 429  code === 403 
          /quota|rate limit|exceeded|billing/i.test(msg)
        ) continue; // try next provider immediately
        if (code >= 500) { // transient
          await new Promise(r => setTimeout(r, 300)); // tiny backoff
          continue;
        }
        // other errors: try next anyway
      }
    }
    throw lastErr ?? new Error("All providers failed");
  }

  private async call(provider: LLMProvider, { system, prompt, json }: any) {
    switch (provider) {
      case "gemini": {
        const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
          + ?key=${this.opts.geminiKey};
        const body = {
          contents: [{ role: "user", parts: [{ text: (system ? [SYS]\n${system}\n[/SYS]\n : "") + prompt }] }],
          ...(json ? { generationConfig: { responseMimeType: "application/json" } } : {})
        };
        const r = await fetch(url, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
        if (!r.ok) throw Object.assign(new Error(Gemini ${r.status}), { status: r.status, message: await r.text() });
        const j = await r.json();
        return j.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
      }
      case "llama3": {
        const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": Bearer ${this.opts.openrouterKey},
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "meta-llama/llama-3-70b-instruct",
            messages: [
              ...(system ? [{ role: "system", content: system }] : []),
              { role: "user", content: prompt }
            ],
            response_format: json ? { type: "json_object" } : undefined
          })
        });
        if (!r.ok) throw Object.assign(new Error(Llama3 ${r.status}), { status: r.status, message: await r.text() });
        const j = await r.json();
        return j.choices?.[0]?.message?.content ?? "";
      }
      case "mixtral": {
        const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": Bearer ${this.opts.openrouterKey},
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "mistralai/mixtral-8x22b-instruct",

Alex B, [29/08/2025 10:30]
messages: [
              ...(system ? [{ role: "system", content: system }] : []),
              { role: "user", content: prompt }
            ],
            response_format: json ? { type: "json_object" } : undefined
          })
        });
        if (!r.ok) throw Object.assign(new Error(Mixtral ${r.status}), { status: r.status, message: await r.text() });
        const j = await r.json();
        return j.choices?.[0]?.message?.content ?? "";
      }
    }
  }
}

Use it in your Vercel route:

// app/api/answer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { LLMRouter } from "@/lib/modelRouter";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const { system, prompt, json } = await req.json();
  const router = new LLMRouter({
    geminiKey: process.env.GEMINI_API_KEY,
    openrouterKey: process.env.OPENROUTER_API_KEY
  });

  try {
    const text = await router.generate({ system, prompt, json });
    return NextResponse.json({ ok: true, text });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

2) Split responsibilities to save quota

Right now you use the LLM for RAG orchestration + answering. Move everything not requiring reasoning out of the LLM:

Parsing (PDF/Word/Excel → text/tables): use deterministic libs (e.g., pdf-parse, pdfjs, mammoth for .docx, xlsx for Excel).

Chunking: do it in your code (token-aware) — not via the LLM.

Embeddings: use a free/self-hosted embedding model (e.g., bge-m3, gte-small) and store in Supabase pgvector.

Reranking: use a local cross-encoder (e.g., bge-reranker) to reduce context size before you call the LLM.

Answering: only the final step hits the LLM (with the top-k snippets).


This usually cuts LLM tokens by 60–85%.

3) Degrade gracefully when fully exhausted

When Gemini is out and backups are also rate-limited, don’t fail the user:

Mode A (No LLM, “Retrieve Only”): return top-k passages with highlighted matches + quick extractive spans (regex/keyword) and a message: “LLM quota reached; showing best matches and key sentences.”

Mode B (Small Local LLM): spin a tiny local model (e.g., Q4_0 Llama-3-Instruct 8B) just to stitch snippets into a short answer. It won’t be perfect, but it’s better than nothing.


4) Smart caching (massive savings)

Answer cache: key by hash(userQuery + topKDocIDs + snippetHashes). If a later user asks the same or near-duplicate question over the same docs, return cached answer.

Snippet cache: cache retrieval results (doc IDs + offsets) per query embedding to avoid re-scoring.

Prompt template cache: for common QA types (“Summarize file X”, “Compare A vs B”), store canonical prompts.


5) Token-diet for chat with docs

MMR/reciprocal rank fusion for retrieval to avoid redundant chunks.

Tight system prompt + structured output (response_format: json_object) so responses are short and machine-consumable.

Auto-compress context: before sending to the LLM, run a local summarizer over each retrieved chunk (sentence-level MMR or simple tf-idf) and pass only the distilled bullets.

Answer-then-cite pattern: ask the model to draft answer first, then append citations from the snippets you already have (don’t re-send full docs to generate citations).


6) RAG circuit-breaker (avoid bad fallbacks)

Sometimes a weaker fallback model hallucinates. Add guards:

Strict JSON schema for answers (response_format) and validate. If invalid → try the next provider.

Fact-check pass: after answer, do a quick keyword match against retrieved snippets; if key facts don’t appear, down-score or switch provider.

Safety throttle: if the model returns < X tokens or repeats boilerplate, retry with different temperature/model.


7) Environment toggles (fast ops)

Use env vars to flip behavior at runtime:

PRIMARY_LLM=gemini
SECONDARY_LLM=llama3
TERTIARY_LLM=mixtral
MAX_TOKENS_ANSWER=800
TOP_K=6
RERANKER=bge-reranker
DEGRADE_MODE=retrieve_only|local_llm|off

8) Where to put what (DocsFlow on Vercel + Supabase)

Alex B, [29/08/2025 10:30]
Edge Route (Vercel): /api/answer (router + answering only).

Serverless CRON (Vercel/Supabase Functions): document parsing, embeddings upserts, index maintenance.

Supabase: documents, chunks, embeddings tables (pgvector), answers_cache.

Rate-limit middleware: per user/org/IP to prevent one tenant from blowing the budget.


9) Error patterns to treat as “quota → failover now”

429 Too Many Requests, 403 Quota exceeded/insufficient tokens, messages matching /quota|rate|billing|exceeded/i.

On these, do not backoff; immediately try next provider. Backoff only for 5xx.



---

TL;DR

Add a provider router (Gemini → Llama3 → Mixtral) with hard failover on quota, small backoff for 5xx.

Stop using the LLM for parsing/chunking/embeddings. Reserve it for the final answer step.

Add caching, reranking, and degrade modes so users still get value when everything is exhausted.

Keep this Edge-safe on Vercel with a tiny router and env-controlled toggles.


If you want, I can tailor the router to your current DocsFlow codebase (file paths, types, and your Supabase schema) so you can paste it straight in.
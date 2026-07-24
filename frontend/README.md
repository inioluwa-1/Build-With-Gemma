# Vernac

**Official documents, in your true tongue. Verified.**

Vernac photographs any official document — a bill, a legal notice, a government letter, a loan agreement — and explains what it says in the language you actually speak. Where the numbers are governed by published rules, it goes further: it checks them against those rules and shows the math.

Gemma 4 Hackathon · Track 4: Fair Access (SDG 10) · installable PWA, mobile-first.

## The one architectural idea

**The model reads; the code decides.**

Gemma 4 does classification, extraction and language generation. It never computes a verdict, so a verdict can never be hallucinated. Verification is deterministic TypeScript against static, date-stamped reference tables, and it runs client-side — which is why it still works with the network off.

Two tiers, and the boundary is visible on every result:

| Tier | Applies to | Output |
|------|-----------|--------|
| **Verify** | Documents with a published, machine-checkable ruleset (electricity bills today) | A verdict — checks out / discrepancy / can't verify — with line-by-line math and the rule source stamped |
| **Interpret** | Everything else | A plain-language explanation under **Explained — not verified**. No stamp, no green, no red, no complaint button |

The tier boundary is enforced by the `Verdict` discriminated union, not by copy: `interpretation_only` structurally cannot reach the stamp component.

## Running it

```bash
npm install
cp .env.example .env.local     # add a Google AI Studio key
npm run dev
```

| Command | What it does |
|---|---|
| `npm test` | Verification unit suite — the correctness gate |
| `npm run build` | Production build and typecheck |
| `npm run lint` | ESLint |
| `npm run icons` | Regenerate PWA icons from the stamp mark |
| `npm run translate` | Draft the Yorùbá/Pidgin catalogues with Gemma (needs `--env-file=.env.local`) |

The app works without an API key: manual entry and verification are entirely local. Extraction and explanation degrade with copy that says so.

## The reference table — read this before demoing

`lib/rulesets/nerc-table.json` is the whole verification reference. Three things about it need to be true, and two of them still need confirmation.

**1. It is pinned to IKEDC.** Band rates vary by DisCo. The table carries Ikeja Electric's rates, effective **2025-12-07**, from the NERC MYTO of November 2025:

| Band | ₦/kWh | Min. supply hours |
|---|---|---|
| A | 209.50 | 20 |
| B | 62.48 | 16 |
| C | 50.00 | 12 |
| D | 43.00 | 8 |
| E | 40.00 | 4 |

Demo with an IKEDC bill, or swap the table first.

**2. The rates come from a secondary source.** They were taken from published summaries citing the NERC order, not from the order PDF itself, and reports conflict on Band A — ₦225 as NERC-approved, ₦209.50 widely quoted, and a reported Ikeja reduction to ₦206.80. **Confirm Band A against the actual bill you plan to demo, before demo day.** `effectiveDate` is a first-class field and is stamped on every verified verdict; when rates change, you edit one file and redeploy.

**3. VAT is assumed to be exclusive of the published rate** — `ratesIncludeVat: false`, so the app computes `units × rate + 7.5%`. This is the single highest-risk constant in the product: if it is backwards, every correct bill gets flagged, which is worse than useless. Two things support the assumption — technical.md specifies it, and design.md's own worked example (142 kWh × ₦209.50 → "should be ₦31,981") only reconciles with VAT added on top; the engine computes ₦31,980.18. **It is still an assumption until a real, known-correct bill confirms it.** When you have one, put its numbers in `test/verify.test.ts` and run `npm test`. If it fails, flip the flag.

`minSupplyHours` is carried in the table but never enters a verdict. Band *eligibility* depends on hours of supply, which cannot be read off the document — so it is surfaced as a complaint ground and never asserted as a finding.

## Input handling

Three ways in: photograph it, upload a file, or type it.

**PDFs go straight to the model.** The Gemini API accepts `application/pdf` as inline data and tokenises it as a document (up to 1000 pages), so there is no pdf.js in the bundle and no loss of text fidelity from rasterising. Photos are downscaled on-device to 1280px / JPEG q0.8 first — a raw 8MB camera JPEG over 3G is the difference between a demo and a timeout. See `lib/upload.ts`.

The camera button and the upload button are separate inputs on purpose: `capture="environment"` opens the rear camera directly, which is right for a photo but bypasses the file browser a PDF needs.

## Latency

Gemma 4 reasons before answering unless told not to. Measured on the same bill image: **41.1s** with the default thinking budget, **2.3s** at `thinkingLevel: MINIMAL` — for identical extractions. Nothing this app asks is a reasoning problem; extraction is transcription and explanation is paraphrase. MINIMAL is the default in `lib/gemma/client.ts` and `"default"` is opt-in per call. (`thinkingBudget: 0` is rejected by these models — it has to be the level.)

Two consequences worth keeping:

- The model returns its reasoning as extra parts flagged `thought: true`. Those are filtered out before the JSON parser sees anything.
- 4xx responses are permanent — an unsupported file, a document past the page limit — so the harness fails fast instead of retrying three times. That turned a 25s dead end into an 8.8s one.

Extraction is capped by a 45s deadline on the client, with a live elapsed counter and a Cancel button, so a slow call can never look like a hang.

## Adding a verification vertical

One new table, one entry in `lib/rulesets/registry.json`, one pure verify function. No code path changes, no retraining. See `lib/rulesets/index.ts`.

## Money is integer kobo

All arithmetic in `lib/verify/` runs in integer kobo, never floating-point naira. `29749 × 0.075` is exactly ₦2,231.175 in decimal but 2231.1749999999997 in binary, which rounds the wrong way. A kobo never changes a verdict — the tolerance band is far wider — but it does put a wrong number on a screen whose entire purpose is showing work that is exactly right.

## Language

Every UI string lives in `lib/i18n/en.ts`. Yorùbá and Pidgin are drafted by `npm run translate` and tracked in `lib/i18n/review-status.json`; a key marked reviewed is never overwritten by a re-run, and any key that is missing or blank falls back to English at runtime. **The generated catalogues are drafts until a native speaker passes over them.**

Explanations are a separate path. A **verdict** explanation is short, so all three languages come back in one call and the toggle is an instant client-side swap. An **interpretation** is a full account of the document — long, times three languages, ~55s in one call — so it is fetched in two passes: the language on screen first (~20s to first result), then the other two in the background. By the time anyone reaches for the toggle the other languages have usually arrived; a background failure costs the toggle, never the result.

Font coverage is verified, not assumed. Inter is loaded with the `latin`, `latin-ext` and `vietnamese` subsets, which between them carry every character Yorùbá needs: ẹ/ọ (U+1EB8–1ECD, in `vietnamese`), ṣ/Ṣ (U+1E62/3, in `latin-ext`), the tone marks, and ₦ (U+20A6, in `latin-ext`). A browser probe confirms all of them render from Inter itself with no system fallback. Still worth one look on a real low-end Android before demo, since Chrome's font stack there is not identical.

## Offline

The service worker (`public/sw.js`, hand-written, no library) caches the shell and static assets, and never caches `/api/*`. Rulesets are bundled into the app rather than fetched, so offline verification is a build-time guarantee rather than a cache-hit gamble: with no network, the app opens, manual entry works, and verification works in full.

The worker registers in **every** environment, so the app is installable whether you run `npm run dev` or a production build — verified in a real browser (registered, activated, root scope; manifest with 192/512/maskable icons). The mode is passed through the registration URL (`/sw.js?mode=…`): in development the worker installs but runs network-only, so it satisfies installability without ever serving a stale chunk and breaking hot reload; in production it does the full precache-and-serve. Offline behaviour is therefore only real in a production build — that is the one to test with airplane mode on.

## Known simplifications

- Interpretation-tier amounts and dates are edited as `Label — value` lines rather than as structured rows.
- No accounts, no history, no persistence — per the PRD's non-goals. Language choice resets with the page.

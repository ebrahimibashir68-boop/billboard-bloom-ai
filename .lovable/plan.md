## Ad Smart Contracts + AI Distribution — MVP

Pi Network does not currently expose user-deployable on-chain smart contracts, so "true on-chain" is delivered as a **verifiable contract**: a canonical JSON contract, SHA-256 hashed, signed by the advertiser's Pi identity, and anchored to a real Pi payment txid. The contract hash + txid are what "prove" the deal on-chain via Pi's payment ledger. All AI matching + schedule is off-chain.

### 1. Data model (new tables via migration)

- `ad_contracts` — id, advertiser_pi_uid, advertiser_pi_username, tier (`individual`|`enterprise`), title, body_text, image_url (nullable), placements (text[]), duration_days, target_venues (int), cost_pi, contract_hash, contract_json (jsonb), pi_payment_id (nullable), pi_txid (nullable), status (`draft`|`awaiting_payment`|`active`|`completed`|`cancelled`), created_at, activated_at, ends_at.
- `ad_placements` — id, contract_id → ad_contracts, venue_code, venue_name, sport, ai_match_score numeric, scheduled_start, scheduled_end, status (`scheduled`|`playing`|`done`).
- `ad_plays` — id, placement_id, played_at, impressions int (simulated). *(lightweight; for schedule/analytics.)*

RLS: contracts + placements readable by owner (`pi_uid = current claim`), publicly readable list of `active`/`completed` contract summaries (safe columns only). All writes via server functions using service role after Pi token verify. `GRANT`s + `TO anon` narrow read policies.

### 2. Server routes (new under `src/routes/api/public/`)

- `POST /api/public/pi-contracts` — verify Pi bearer token → build canonical contract JSON → SHA-256 hash → insert `ad_contracts` (status `awaiting_payment`) → return `{ contractId, hash, cost }`.
- `POST /api/public/pi-contracts/activate` — body `{ contractId, paymentId, txid }`; verify token; verify payment via Pi Platform API (`/payments/{id}`) matches amount + memo hash; set contract `active`, store txid, then call AI matcher.
- `GET /api/public/pi-contracts` — list caller's contracts + placements.
- `GET /api/public/pi-contracts/:id` — single contract + placements + plays.

### 3. AI venue matcher (server-only helper)

`src/lib/ai/match-venues.server.ts` — uses existing Lovable AI Gateway (`google/gemini-3-flash-preview`) with `Output.object` schema to score/select venues from a seeded venue catalog based on `{ body_text, placements, tier, target_venues, duration_days }`. Returns venues with match score + reasoning. Called from `activate` handler; inserts `ad_placements` rows and stubs a rotating `ad_plays` schedule.

### 4. Frontend

- **New route** `src/routes/contracts.tsx` (public listing of active contracts — social proof) — safe columns only.
- **New route** `src/routes/_authenticated-ish/my-contracts.tsx` gated by Pi wallet connection (not Supabase auth — this app uses Pi identity). Reuse existing Pi wallet gate pattern from campaigns.
- **New component** `SmartContractDialog.tsx` — tier picker (Individual / Enterprise), title, ad body text, optional image URL, placement multi-select, duration slider, target venue count (enterprise only). Shows live cost, canonical JSON preview, and hash. On submit:
  1. POST create contract → get hash + cost
  2. `Pi.createPayment` with memo = `contract:{hash}` and metadata `{ contractId, hash }`
  3. On `onReadyForServerCompletion` → POST activate → toast success + navigate to My Contracts.
- **Enterprise tier** unlocks: multiple placements, up to 50 target venues, brand asset URL, priority AI match. Individual tier: single placement, up to 5 venues.
- **My Contracts page**: cards with status, matched venues, live schedule, hash + txid link, cancel (before active).
- Wire "New Contract" CTA into TopBar and the dashboard.

### 5. Cost formula

`cost_pi = base(5) × placement_multiplier_sum × durationDays × tierFactor` where tierFactor = 1 (individual) or 0.85 × targetVenues/5 (enterprise volume discount, floored at 1×).

### 6. Verification

- Migration approved → check tables + policies.
- `bunx tsgo --noEmit` clean.
- Playwright smoke: open `/contracts`, open dialog, verify hash renders + JSON preview updates as fields change (payment flow requires Pi Browser — cannot Playwright-verify end-to-end).

### Out of scope (MVP)

- Real on-chain deployment (unavailable on Pi).
- Actual playback on physical billboards (simulated schedule + impressions).
- Refunds / partial cancellation after `active`.
- Image upload/storage — image URL field only.

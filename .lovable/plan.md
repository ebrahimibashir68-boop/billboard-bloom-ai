# Ad Design Studio + Partner Approval Workflow

Extends the existing Smart Contracts feature with (1) a creative studio for designing text / image / video billboards, and (2) a partner-company workflow where real ad/billboard operators register, review, and approve creatives before AI distributes them.

## 1. Studio — `/studio-design` (new route)

A single-page designer that outputs a **Creative** (reusable asset) which can then be attached to a Smart Contract.

- **Format tabs**: Text · Image · Video.
- **Text billboard**: headline + subline, font family (4 presets), background (solid / gradient / brand color), text color, alignment, layout preset. Live preview at 16:9, 9:16, 1:1.
- **Image billboard**:
  - Upload image URL, or
  - "Generate with AI" → Lovable AI Gateway `google/gemini-3.1-flash-image` (streaming via `src/routes/api/generate-billboard-image.ts`).
  - Overlay text layer (optional) with same typography controls as Text mode.
- **Video billboard**:
  - Paste a video URL (mp4 / hls), or
  - Compose a 6–10s slideshow from 2–4 image billboards with Ken Burns pan/zoom + text keyframes; rendered client-side to a `<canvas>` preview loop. Actual per-billboard rendering is delegated to the venue player (spec stored as JSON — no server-side ffmpeg on Workers).
- **Brand preset** (per Pi user): logo URL, primary/secondary color, tagline — persisted so repeat designs stay on-brand.
- **Save** → creates a row in `creatives`; **Use in contract** → opens `SmartContractDialog` prefilled with this creative.

## 2. Partner Ad-Companies

New actor type. A partner represents a real billboard operator (e.g. "Clear Channel Outdoor NYC"). Partners register, get verified by an admin (`has_role('admin')`), then own **venues** and approve creatives that target them.

- **Registration**: public `/partners/register` — company name, contact email, country, website, billboards summary. Creates `ad_partners` row with `status='pending'`.
- **Admin verification**: partner-admin console at `/admin/partners` (gated by `has_role('admin')`) to approve/reject.
- **Partner dashboard** `/partner` (gated by `has_role('partner')`) — lists incoming approval requests, own venues, currently-playing creatives, revenue share.
- **Venue ownership**: each `venues` row is now `partner_id`-owned. AI matcher only assigns placements to venues whose partner has `status='approved'`.

## 3. Approval workflow (fits current contract flow)

Current flow: sign contract → pay Pi → AI matches venues → placements go straight to `scheduled`.

New flow inserts a review gate per partner:

1. Contract signed + paid (unchanged).
2. AI matches candidate venues; each placement is created with `status='pending_approval'` and grouped by owning partner into `ad_approval_requests` (one per contract × partner).
3. Partner reviews the creative + placement details in their dashboard → approve / reject / request changes.
4. On approve: placement → `scheduled`; on reject: placement → `rejected` and Pi share for that placement is refunded from a partner-payout escrow back to advertiser.
5. Contract-level status becomes `active` once ≥1 placement is approved; `cancelled` if all rejected.

Advertiser sees per-partner review status on the contract detail card.

## 4. Data model (single migration)

New tables (all with GRANTs + RLS + `updated_at` trigger):

- `creatives` — `pi_uid`, `pi_username`, `kind` ('text'|'image'|'video'), `name`, `spec` (jsonb — full studio state), `preview_url` (nullable), `thumbnail_url`.
- `brand_presets` — one per `pi_uid`: `logo_url`, `primary_color`, `secondary_color`, `tagline`, `font_family`.
- `ad_partners` — `owner_user_id` (auth.users), `company_name`, `contact_email`, `country`, `website`, `billboards_summary`, `status` ('pending'|'approved'|'rejected'|'suspended'), `revenue_share_pct` (default 60).
- `venues` — replaces the hardcoded in-code catalog: `code`, `name`, `sport`, `city`, `country`, `daily_impressions`, `base_rate_pi`, `partner_id` → `ad_partners`, `active` bool. Seeded from current catalog with a synthetic "Lovable Demo Network" partner (auto-approved) so existing contracts keep matching.
- `ad_approval_requests` — `contract_id`, `partner_id`, `status`, `reviewed_at`, `reviewer_notes`.
- Extend `ad_contracts`: add `creative_id` (nullable — legacy contracts keep inline fields).
- Extend `ad_placements`: add `pending_approval` and `rejected` to allowed statuses; add `approval_request_id`.
- Reuse existing `user_roles` pattern (`app_role` enum) — add `'partner'` and `'admin'` values via migration.

RLS highlights: creatives + brand_presets owner-only (by Pi uid claim via existing `pi-*` server routes); ad_partners readable by owner or admin; venues publicly readable; approval requests readable by advertiser (via contract) OR owning partner OR admin.

## 5. Server surface

- `src/routes/api/public/pi-creatives.ts` — POST create, GET list (Pi-authed).
- `src/routes/api/public/pi-brand-preset.ts` — GET/PUT.
- `src/routes/api/generate-billboard-image.ts` — SSE image stream (Lovable AI).
- `src/lib/api/partners.functions.ts` — `createServerFn` set: `registerPartner`, `listMyPartner`, `listApprovalRequests`, `decideApprovalRequest` (all `requireSupabaseAuth`; role-checked with `has_role`).
- `src/lib/api/admin.functions.ts` — `listPendingPartners`, `decidePartner` (`admin` only).
- Update `src/lib/ai/match-venues.server.ts` to query the `venues` table filtered by approved partners, and to insert placements as `pending_approval` grouped into `ad_approval_requests`.

## 6. Frontend

- New routes: `/studio-design`, `/creatives`, `/partners/register`, `/_authenticated/partner`, `/_authenticated/partner/requests/$id`, `/_authenticated/admin/partners`.
- New components: `StudioCanvas`, `TextBillboardEditor`, `ImageBillboardEditor`, `VideoBillboardEditor`, `CreativePickerDialog`, `PartnerRequestCard`, `ApprovalDecisionDialog`.
- Sidebar: add **Studio**, **Creatives**, and conditional **Partner Console** / **Admin** entries based on role.
- `SmartContractDialog` gains a "Pick creative" step (replaces raw title/body/image fields when a creative is chosen) and shows per-partner "pending approval" state on the resulting contract.

## 7. Out of scope (MVP)

- Server-side video rendering (Workers can't run ffmpeg — spec is JSON, played by venue).
- Real Pi escrow smart-contract holds — refunds simulated by crediting `pi_balances`.
- Payout SEPA/wire integration for partners — revenue tracked in a `partner_earnings` view for now.
- Bulk CSV venue import for partners.

## 8. Verification

- Migration approved → tables + GRANTs + policies + seeded venues/partner visible.
- `bunx tsgo --noEmit` clean.
- Playwright smoke: `/studio-design` renders each format tab, `/partners/register` submits, admin console approves a partner, and `SmartContractDialog` accepts a saved creative.

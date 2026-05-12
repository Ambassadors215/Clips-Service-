# PRD — Customer Account & Store-Owner Dashboards (Manchester Pilot)

**Status:** Shipped v1 · **Owner:** Clip Services Ltd · **Last updated:** 2026-05-12
**Companies House:** 17168420 · **Pilot city:** Manchester

---

## 1. Executive summary

We just pivoted the marketplace to a **Manchester-first launch**. To convert pilot
buzz into repeat orders, the platform needs **two persistent, signed-in surfaces**:

1. **Customer account** at `/account` — “my orders, my saved stores, my Manchester.”
2. **Store-owner dashboard** at `/store-owner/dashboard` — “my orders, my products,
   my payouts.”

Plus an **operator surface** (admin) that already exists and now tracks customer
signups + city-waitlist.

The goal is to **turn a one-off Stripe checkout into a relationship** — drive
re-orders, save-store affordances, push/WhatsApp opt-ins, and give pilot
merchants a single screen for everything they need to ship orders.

This PRD describes what shipped, why, and what comes next.

---

## 2. Problem & opportunity

**Before this change:**

- Customers paid via Stripe Checkout, landed on a confirmation page, then
  could only track via a guest order-lookup page (email + ref).
- No saved address book, no saved-store list, no profile, no preferences.
- We had no way to re-engage someone who placed a £30 order yesterday.
- Store owners had a working dashboard but no signal whether customers had
  signed up to follow them.

**Opportunity:**

- A signed-in account gives us a unique customer email + opt-ins which directly
  unlock WhatsApp push, repeat-order nudges, and Manchester-pilot loyalty.
- A heart-to-save button on every store page becomes a top-of-funnel signal for
  store owners (“12 people saved your store this week”).
- Same one-time-code sign-in pattern means **zero friction** — no password to
  remember.

---

## 3. Goals & non-goals

### Goals (v1)
- Ship `/account` with: orders list, saved stores, addresses, profile,
  notifications. Sign in by 6-digit code, no password.
- Reuse existing store-owner dashboard at `/store-owner/dashboard`; surface
  customer-side engagement back to the merchant where it makes sense.
- Add a “Save store” heart on every store page that writes to the signed-in
  customer profile.
- Admin gains visibility on registered-customer count + city-waitlist bucket.
- PWA shortcuts include `/account` so users can jump straight in.

### Non-goals (v1)
- Passwords, social login, magic-link in URL. Sticking with **one-time email
  code** for both audiences.
- Server-side rendered personalisation. v1 hydrates client-side via fetch.
- A separate "service-bookings" surface — `/user` legacy negotiation dashboard
  stays untouched for legacy customers; new marketplace customers go to
  `/account`.

---

## 4. Users & jobs to be done

### 4.1 Customer (“Adanna in Longsight”)
- “Where’s my order right now?” → check status + ETA in two taps.
- “I want to reorder from Mama D’s” → tap saved store → re-add to basket.
- “Save my home address so I don’t retype on every order.”
- “Tell me when my favourite Manchester store gets new stock.”

### 4.2 Store owner (“Bismillah Halal Foods, Rusholme”)
- “Show me today’s orders.”
- “Mark order ready for collection and ping the customer.”
- “Add a new product (with one photo) in under a minute.”
- “How much did I make this week? Stripe payouts on track?”
- “Who left a review I need to respond to?”

### 4.3 Operator (Clip Services founders)
- “How many people signed up this week?”
- “Which non-Manchester cities are people from on the waitlist?”
- “Trigger payouts, approve pending stores, review listings, see funnel.”

---

## 5. Scope of v1 (what shipped)

### 5.1 Customer dashboard (`/account/index.html`)

**Sign-in / signup (unified)**
- Enter email → server emails a 6-digit code → enter the code → an HttpOnly
  cookie session (`cs_cust_sess`, 30 days, HMAC-signed) is set.
- First successful verification auto-creates the customer profile.

**Sections**

1. **Overview** — welcome card, four lifetime stats (orders, active, saved
   stores, lifetime spend), active orders preview, saved-stores preview.
2. **Orders** — full marketplace order list with status pill (new → confirmed →
   preparing → ready / en route → completed), reorder link, WhatsApp store
   link, and inline "Leave a review" once completed.
3. **Saved stores** — Manchester-pilot store cards with cover image, heritage
   tags, services, pilot badge, “Visit store”, “Remove”.
4. **Addresses** — list / add / edit / delete (max 8). Validated postcode.
5. **Profile** — first/last name, phone, preferred Manchester area.
6. **Notifications** — WhatsApp opt-in, monthly email digest opt-in, push
   notifications (uses existing Web Push stack).

**Engagement hooks**
- Welcome hero gradient (navy → terracotta) repeats the Manchester pilot
  language we use on the marketplace homepage.
- “No orders yet” / “No saved stores” empty states funnel back to `/stores`.

### 5.2 Store-owner dashboard

Already in place at `/store-owner/dashboard/index.html`. No regressions:
- OTP sign-in via `POST /api/provider-auth`.
- Data fetch via `GET /api/store-owner` (returns listing, metrics, orders,
  reviews, products, Stripe summary).
- Order stage updates via `POST /api/store-owner { action:"set-order-stage" }`.
- Products CRUD via `save-products`, `delete-product`, `bulk-stock`,
  `bulk-delete-products`.
- Stripe Connect status surfaced.
- Sections: Overview, Orders, Products, Store Profile, Revenue, Reviews,
  Promotions, Analytics, Settings.

### 5.3 Save-store heart on storefront

- Added a “Save store” / “Saved” toggle on the storefront hero in
  `lib/store-page-html.js`.
- Click → `POST /api/customer-api { action: "save-store" | "unsave-store" }`.
- 401 → bounce to `/account?next=<store-url>` and continue afterwards.

### 5.4 Admin updates

- New `?action=customer-summary` returns total customers registered, total
  marketplace orders, paid orders, unique paying customers, and Manchester
  revenue (GBP, 2dp).
- `?action=contacts` now also returns a `buckets` object so the admin UI can
  split waitlist / newsletter / messages without re-parsing.

### 5.5 PWA

- `manifest.webmanifest` shortcuts now include **My account → `/account`**.
- Service worker bumped to `clip-services-v12`; explicit “never cache” rule
  for `/account`, `/admin`, `/store-owner/dashboard` so personal pages are
  always fresh.

---

## 6. System architecture

### 6.1 Routes

| Route | What |
|-------|------|
| `GET /account` | Customer dashboard shell (static HTML). |
| `GET /api/customer-auth?action=whoami` | Returns `{ email \| null }` from cookie. |
| `POST /api/customer-auth` | Actions: `request-otp`, `verify-otp`, `logout`. |
| `GET /api/customer-api?action=overview` | Profile + stats + recent orders + saved stores. |
| `GET /api/customer-api?action=orders` | Full marketplace order list. |
| `GET /api/customer-api?action=saved-stores` | Hydrated saved-store cards. |
| `GET /api/customer-api?action=profile` | Profile + addresses. |
| `POST /api/customer-api` | Actions: `save-store`, `unsave-store`, `save-address`, `delete-address`, `update-profile`. |
| `GET /api/admin?action=customer-summary` | (Admin token) signup + GMV summary. |
| `GET /store-owner/dashboard` | Existing owner dashboard. |
| `POST /api/provider-auth` | Existing OTP sign-in for store owners. |
| `GET/POST /api/store-owner` | Existing owner API (products, orders, stage). |

### 6.2 Cookies & sessions

| Audience | Cookie | TTL | Mechanism |
|----------|--------|-----|-----------|
| Customer | `cs_cust_sess` | 30 days | HMAC-signed JSON, HttpOnly, SameSite=Lax, Secure on Vercel. |
| Store owner | `cs_prov_sess` | 30 days | Same pattern, different key. |
| Admin | header `X-Admin-Token` | — | Timing-safe equality vs `ADMIN_TOKEN`. |

Cookies are independent so a store owner can shop as a customer with a
separate session.

### 6.3 Data model (KV / Redis)

Prefix `cs:` unless overridden by `KV_PREFIX`.

- `cs:customer:<email>` — customer profile (JSON)
  - `email`, `firstName`, `lastName`, `phone`, `whatsappOptIn`,
    `marketingOptIn`, `preferredArea`, `savedStoreIds` (≤ 60),
    `addresses` (≤ 8), `createdAt`, `lastSeenAt`.
- `cs:customers_index` — Redis set of all known customer emails (for the
  admin summary).
- `cs:customer_otp:<email>` — TTL 15 min, salted-hashed.
- `cs:customer_otp_cd:<email>` — TTL 45 s cooldown.
- Existing keys reused: `cs:bookings`, `cs:contacts`,
  `cs:marketplace_listings`, `cs:providers`, `cs:provider_otp:*`,
  `cs:push:user:*`.

Customer **orders** are not duplicated; they are read on-demand from
`cs:bookings` via `getBookingsByEmail()` and filtered to
`marketplaceOrder === true`.

### 6.4 Email

- Same `lib/email.js` (Brevo SMTP) used for provider OTPs is reused for
  customer OTPs.
- A short, plain HTML message with a 6-digit code in a monospaced block.

### 6.5 Failure modes

| Failure | Behaviour |
|---------|-----------|
| `SESSION_SECRET` not set / too short | Auth returns 503 with a clear error. |
| Redis not configured locally | Auth route works, but verify-otp fails because OTP can’t be persisted. Profile fetches return null gracefully. |
| Email send fails | Returns a friendly hint matched from SMTP error text. |
| Saved-store call from an unauth’d device | Returns 401 → storefront redirects to `/account?next=...`. |

---

## 7. UX principles

- **No passwords.** A 6-digit code email is the only way in.
- **One brand chrome.** `/account` reuses the navy + terracotta marketplace
  header so the experience is contiguous from `/`, to a store, to checkout,
  to `/account`.
- **Manchester-first language.** Hero, area selector and copy all reference
  Manchester explicitly. Profile lists the 8 pilot areas.
- **Always-empty-state honest.** If a customer has zero orders, the empty
  state pushes back to `/stores`.
- **Optimistic UI for hearts.** Save / unsave updates locally first, rolls
  back on error.

---

## 8. Success metrics (first 90 days)

| Metric | Target by 2026-08-12 |
|--------|----------------------|
| Customer signups (`cs:customers_index`) | ≥ 150 |
| Saved-stores per signed-in customer | ≥ 2 median |
| Marketplace orders (paid) | ≥ 60 |
| % paid orders from repeat customers | ≥ 25 % |
| Push opt-in rate | ≥ 30 % |
| Manchester-pilot stores onboarded | ≥ 5 → 8 |

We surface signup + GMV in the admin via `customer-summary`. The orders +
push numbers come from `public-stats` + `push-vapid` subscription counts.

---

## 9. Privacy & security

- HttpOnly cookies, Secure on Vercel, SameSite=Lax.
- HMAC signed with `SESSION_SECRET` (≥ 16 chars enforced at boot).
- OTPs salted-hashed at rest, single-use, 15-min TTL.
- No PII leaves the platform without explicit opt-in (WhatsApp, marketing,
  push are off by default).
- Admin routes 401 without `X-Admin-Token`.
- Service worker explicitly **never** caches `/account`, `/admin`,
  `/store-owner/dashboard`.
- Companies House Number 17168420 footer preserved on every page.

---

## 10. What we deliberately did **not** do

- We did **not** delete the legacy `/user` negotiation dashboard. It still
  serves existing service-booking customers. New marketplace customers go to
  `/account`.
- We did **not** delete the `/cities/<city>` placeholder pages — they keep
  SEO presence outside Manchester.
- We did **not** rebuild the store-owner dashboard from scratch. It already
  handles everything pilot merchants need. v2 will refresh its visual chrome
  to match the navy / terracotta marketplace.
- We did **not** add an SMS sign-in path. Email is enough for pilot scale.

---

## 11. Next (v2 candidates)

| Idea | Effort | Why later |
|------|--------|-----------|
| Push notifications for status changes ("Order packed!") | M | We have web push, just need to wire `set-order-stage` to `push-subscribe` per user. |
| Order rating + photo upload from `/account/orders` | M | Today reviews live at `/customer/review`. Move them in-line. |
| Store-owner dashboard reskin to navy/Oja chrome | M | Visual debt; no functional change. |
| Loyalty / re-order discount badge on saved stores | L | Needs Stripe coupons + per-customer reward tracking. |
| Cross-device sync of basket via signed-in customer | L | Today basket lives in localStorage. |
| Magic-link sign-in alongside OTP | S | Some users hate typing codes; nice to have. |
| Address geocoding for delivery fee estimates | M | Today fees come from listing. |
| Store-owner WhatsApp template manager | M | Today owners type free-form. |

---

## 12. Rollout & monitoring

- **Deploy:** push to `origin/main` and let Vercel handle the build.
- **Smoke test on prod:** sign in to `/account` with a real email; place a
  test order; verify it appears in /account/orders within 60 s of Stripe
  webhook firing.
- **Observability:** `/api/admin?action=customer-summary`,
  `/api/admin?action=contacts` (buckets), `/api/public-stats`.
- **Rollback:** static page + JS only on the frontend; KV writes are
  idempotent merges. Revert the commit if anything regresses.

---

## 13. Open questions

1. Should we autocollapse the legacy `/user` dashboard into a redirect to
   `/account` after one calendar month? (Probably yes.)
2. Do we want a "Sign in with Apple/Google" path before opening up to UK-wide
   in 2027? Right now we plan to keep email OTP.
3. Should the saved-store heart on the storefront also drop into the basket
   side panel for re-engagement? (Likely yes for v2.)

---

*End of PRD.*

# Clip Services — notification matrix (email + PWA push)

Push notifications require **VAPID keys** in Vercel (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`) and the user (or admin) tapping **Enable** to grant permission. Email uses **Brevo SMTP** (`BREVO_SMTP_USER`, `BREVO_SMTP_KEY`, `EMAIL_FROM`, `ADMIN_EMAIL`).

## Customer (end user)

| Event | Email | PWA push (customer channel) |
|-------|--------|-----------------------------|
| Booking saved (pay offline / WhatsApp path) | Yes — confirmation + ref | Yes — “Booking received” |
| Stripe checkout started (awaiting card) | Yes — link to pay | Yes — “Complete payment” |
| Card payment succeeded (Stripe webhook) | Yes — payment confirmed | Yes — “Payment confirmed” |
| Admin sets status → **confirmed** | Yes | Yes |
| Admin sets status → **completed** | Yes | Yes |
| Admin sets status → **cancelled** | Yes | Yes |
| Admin sets status → **paid** (manual) | Yes | Yes |
| Provider application submitted | Yes — “application received” | No (email only; avoids spamming all subscribers) |

## Admin (operator inbox + admin push channel)

| Event | Email to `ADMIN_EMAIL` | PWA push (admin channel) |
|-------|-------------------------|---------------------------|
| New booking (offline path) | Yes | Yes |
| Checkout started (awaiting payment) | Yes | Yes |
| Card payment succeeded | Yes | Yes |
| New provider application | Yes | Yes |
| Admin changes booking status in dashboard | No* | No* |

\*Status changes are customer-facing; the admin already performed the action in the dashboard.

## Optional future extensions

- Reminder before appointment (scheduled job + user consent).
- “Abandoned checkout” reminder if `awaiting_payment` > 24h (cron + KV scan).
- SMS via third party (not implemented).

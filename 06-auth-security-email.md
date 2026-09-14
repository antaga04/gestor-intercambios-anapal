# 06 — Auth, security and email

Goals: long-lived sessions without sending emails (Resend free tier: 100/day, 3 000/month), httpOnly cookies only (JS never sees tokens), admin-driven password reset.

## Tokens

| Token          | Format                                   | TTL      | Where                                           | Stored server-side                                   |
| -------------- | ---------------------------------------- | -------- | ----------------------------------------------- | ---------------------------------------------------- |
| Access token   | JWT `{ sub: userId, role, iat, exp }` signed with `ACCESS_TOKEN_SECRET` | 15 min (`ACCESS_TOKEN_TTL`) | cookie `access_token`, `Path=/`             | no                                                   |
| Refresh token  | 48 random bytes base64url               | 30 days (`REFRESH_TOKEN_TTL_DAYS`) | cookie `refresh_token`, `Path=/api/auth/refresh` | `refreshtokens` doc with HMAC-SHA256 hash, family id |

Cookie attributes (both): `HttpOnly`, `SameSite=Lax`, `Secure` when `IS_PRODUCTION=true`, `Domain=COOKIE_DOMAIN` only if set. `refresh_token` also gets `Max-Age` = 30 days; `access_token` gets `Max-Age` = 15 min.

Why `Lax` works: the client Vercel project rewrites `/api/*` to the server project, so from the browser's point of view API calls are same-origin (see 01). If a custom domain is used instead (`app.example.com` + `api.example.com`), set `COOKIE_DOMAIN=.example.com` — still same-site, still `Lax`. Do **not** use `SameSite=None` unless the two apps end up on unrelated domains.

## Flows

### Login
1. `POST /auth/login` → validate credentials (bcrypt compare, constant-time even when user missing), check `status === 'active'` (`pending` → 403 `auth.email_not_verified`, `blocked` → 403 `auth.blocked`).
2. Create refresh token: raw → hash → insert `{ user, tokenHash, family: uuid(), expiresAt, createdByIp, userAgent }`.
3. Sign access token. Set both cookies. Update `lastLoginAt`. Return `meUser`.

### Refresh (`POST /auth/refresh`)
1. Read `refresh_token` cookie; hash; find doc.
2. Not found or expired → 401 `auth.refresh_invalid`, clear cookies.
3. Found but `revokedAt` set → **reuse detected**: revoke every token in the same `family`, clear cookies, 401. (Someone replayed an old token.)
4. Valid → rotate: mark old `revokedAt = now`, `replacedByTokenHash = newHash`; insert new doc in the same family with a fresh 30-day expiry (sliding session); sign a new access token; set both cookies.
5. Throttled `lastSeenAt` update (skip if updated < 5 min ago).
6. Rate limit: 20/min per key.

### Logout
`POST /auth/logout`: revoke the presented refresh token (if any), clear both cookies. Client clears `hasSession` and the query cache. Optional "cerrar sesión en todos los dispositivos" in profile: revoke all tokens of the user.

### Client interceptor (`client/src/lib/api.ts`)
- Any response 401 whose request is not `/auth/refresh|login|logout|me` → if no refresh in flight, start one; all concurrent 401s await the same promise; on success re-issue their original requests once; on failure clear session and go to `/login`.
- `AuthProvider` boot: if `localStorage.hasSession === 'true'` call `GET /auth/me` (the interceptor transparently refreshes if the access token expired); on final failure treat as anonymous.
- On `visibilitychange` → `visible`, `refetchMe` (cheap; keeps `lastSeenAt` and role changes fresh).

### Revocation triggers (server)
- Password change by the user → revoke all other refresh tokens of that user (keep current session).
- Admin sets temporary password → revoke all.
- Admin blocks user → revoke all; `authenticate` also re-checks `status` cheaply (cached 60 s per user id) so a blocked user is cut off within a minute even with a valid access token.

## Registration and email verification

1. `POST /auth/register` → validate with `registerSchema`; email lowercased; check uniqueness of email and receptor number (both 409, distinct codes). Create user `status: 'pending'`.
2. Sign verification JWT `{ sub, purpose: 'verify-email' }` with `EMAIL_CONFIRMATION_SECRET`, TTL 24 h. Send with Resend from `EMAIL_FROM`, template `server/templates/verify-email.html` (`{{name}}`, `{{link}}` = `${CLIENT_URL}/verificar-email?token=…`). Increment `verificationEmailsSent`, set `lastVerificationEmailAt`. If Resend fails → still 201 but respond `email.send_failed` message variant so the UI offers "Reenviar".
3. `POST /auth/verify-email` → verify JWT purpose + user pending → `status: 'active'`. Already active → 200 `auth.already_verified`.
4. `POST /auth/resend-verification` → always 200. Sends only if user exists, is `pending`, and fewer than 3 sends in the last 24 h. IP-limited 3/h.

Email budget safeguards:
- Only this one email type exists. No login, reset, or notification emails.
- Per-user cap 3/day; global soft cap: service refuses to send when the count of sends today (aggregated from `lastVerificationEmailAt` ≥ start of day) reaches 90, returning `email.daily_cap` — leaves headroom under Resend's 100/day.
- Admin stats show emails sent today/this month (aggregate over users' counters; exact enough).
- Admins can activate a `pending` user manually (`PATCH /admin/users/:id/status`) when email delivery fails.

## Forgot password (no email)

1. User submits email on `/olvide-contrasena` → `POST /auth/forgot-password` → always 200 ("Un administrador te asignará una contraseña temporal"). If the email belongs to an existing user, upsert a `PasswordResetRequest` (`pending`, `requestedAt = now`).
2. Admin sees pending requests in `/admin/solicitudes` (badge in sidebar), contacts the admon out of band, sets a temporary password via `POST /admin/users/:id/reset-password` (min 10 chars; UI can generate one and copy it). Server: hash, `mustChangePassword = true`, resolve the request, revoke refresh tokens.
3. User logs in with the temporary password; dashboard and profile show a persistent alert until they change it via `PATCH /users/me/password`, which clears the flag.

## Password policy

`passwordSchema`: 8–72 chars, at least one letter and one digit. Same schema for register, change, admin temporary password (admin min 10). bcrypt cost 10. Never log passwords or tokens.

## Other hardening

- `helmet()` with defaults (API only, no CSP needed for JSON). `app.disable('x-powered-by')`.
- `express.json({ limit: '1mb' })`; lottery import chunked to keep bodies small.
- CORS: only in dev when the client is served from another origin (`CLIENT_URL`) with `credentials: true`; in production the proxy makes it same-origin, so CORS middleware can be skipped or restricted to `CLIENT_URL`.
- Rate limits per 04. Key = `USER-<id>` if authenticated else hashed IP + UA (reference approach with `request-ip`).
- All ids validated with `objectIdSchema` before hitting Mongo. Ownership checks in services, never in controllers alone.
- Zod `strict()` on request bodies to reject unknown fields (prevents mass assignment: `role`, `status`, `amountDecimos`…).
- Errors in production never include stack traces; 500s are logged with a request id (`crypto.randomUUID()` attached by a tiny middleware and returned in `X-Request-Id`).
- Env parsed with zod at boot (`config/env.ts`); missing secrets crash early.
- Secrets: generate with `openssl rand -base64 48`. Different values for access, refresh HMAC and email confirmation.

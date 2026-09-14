# 04 — API contract

Base path `/api`. JSON only. Every response uses the envelope from imprffctgames:

```ts
// success
{ success: true, i18n: 'exchange.created', message: 'Exchange created', payload?: T }
// error
{ success: false, i18n: 'exchange.duplicate_numero', message: 'Duplicate numero in rows', errors?: unknown }
```

`i18n` is a stable machine code; the client maps it to Spanish with `@anapal/shared/messages/es`. `message` is an English developer string. `errors` carries zod issues (`{ path, message }[]`) on `400 validation.failed`.

Paginated payloads:

```ts
{ items: T[], pagination: { totalItems, currentPage, totalPages, hasNextPage, hasPreviousPage } }
```

Pagination is done with `skip/limit` + `countDocuments` in Mongo (not in memory). Query params: `page` (default 1), `limit` (default 20, max 100).

## Middlewares

| Name                                | Purpose                                                                                                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `authenticate`                      | Reads `access_token` cookie, verifies JWT, sets `req.user = { id, role }`. 401 `auth.not_authenticated` if missing/invalid.                                                           |
| `authorize(...roles)`               | 403 `auth.forbidden` unless `req.user.role` is in roles. `superadmin` passes every `admin` check.                                                                                     |
| `validate({ body, query, params })` | zod parse; 400 `validation.failed` with issues.                                                                                                                                       |
| `activeCampaign`                    | Loads the active campaign into `req.campaign` (or `?campaign=<id>` override, validated). 409 `campaign.none_active` if none.                                                          |
| `requireOpenCampaign`               | 403 `campaign.closed` if `now > exchangeDeadline` and role is `user`.                                                                                                                 |
| rate limiters                       | See table at the end.                                                                                                                                                                 |
| `errorHandler`                      | `AppError` → its status/i18n; zod → 400; Mongoose duplicate key → 409 `db.duplicate`; CastError → 400 `validation.invalid_id`; anything else → 500 `server.error` (no stack in prod). |

## Endpoints

Legend: 🔓 public · 🔐 authenticated (`active` user) · 🛡 admin or superadmin · 👑 superadmin.

### Auth — `/auth`

| Method | Path                        | Access      | Body / query (zod)                                                                                             | Success payload                              | Errors                                                                            | Limit   |
| ------ | --------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------- | ------- |
| POST   | `/auth/register`            | 🔓          | `registerSchema` (email, password, receptorNumber, name, poblacion, provincia, address?, phone?, contactName?) | `{ email }` — 201                            | 409 `auth.email_taken`, 409 `auth.receptor_taken`, 502 `email.send_failed`        | auth    |
| POST   | `/auth/verify-email`        | 🔓          | `{ token }`                                                                                                    | `{}`                                         | 400 `auth.token_invalid`, 400 `auth.token_expired`, 200 `auth.already_verified`   | auth    |
| POST   | `/auth/resend-verification` | 🔓          | `{ email }`                                                                                                    | `{}` (always 200, even if unknown email)     | 429 `email.daily_cap` (3/day/user)                                                | resend  |
| POST   | `/auth/login`               | 🔓          | `loginSchema` (email, password)                                                                                | `meUser`                                     | 401 `auth.invalid_credentials`, 403 `auth.email_not_verified`, 403 `auth.blocked` | auth    |
| POST   | `/auth/refresh`             | 🔓 (cookie) | —                                                                                                              | `{}` + new cookies                           | 401 `auth.refresh_invalid` (cookies cleared)                                      | refresh |
| POST   | `/auth/logout`              | 🔓          | —                                                                                                              | `{}` (revokes refresh token, clears cookies) | —                                                                                 | —       |
| GET    | `/auth/me`                  | 🔐          | —                                                                                                              | `meUser`                                     | 401                                                                               | —       |
| POST   | `/auth/forgot-password`     | 🔓          | `{ email }`                                                                                                    | `{}` (always 200)                            | —                                                                                 | auth    |

Sets cookies `access_token` and `refresh_token` (see 06). `login` updates `lastLoginAt`.

### Users — `/users`

| Method | Path                 | Access | Body / query                                                                       | Payload                                                          | Errors                    |
| ------ | -------------------- | ------ | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------- |
| GET    | `/users`             | 🔐     | `q?` (matches receptorNumber prefix, name, poblacion), `provincia?`, pagination    | `Paginated<publicUser>` (only `active`, excludes me)             | —                         |
| GET    | `/users/:id`         | 🔐     | —                                                                                  | `publicUser`                                                     | 404 `user.not_found`      |
| PATCH  | `/users/me`          | 🔐     | `updateProfileSchema` (name, poblacion, provincia, address?, phone?, contactName?) | `meUser`                                                         | —                         |
| PATCH  | `/users/me/password` | 🔐     | `changePasswordSchema` (currentPassword, newPassword)                              | `{}` (clears `mustChangePassword`, revokes other refresh tokens) | 400 `auth.wrong_password` |

### Campaigns — `/campaigns`

| Method | Path                | Access | Payload                      | Errors                     |
| ------ | ------------------- | ------ | ---------------------------- | -------------------------- |
| GET    | `/campaigns/active` | 🔓     | `campaign` (landing uses it) | 404 `campaign.none_active` |
| GET    | `/campaigns`        | 🔐     | `campaign[]` (newest first)  | —                          |

### Exchanges — `/exchanges` (all 🔐, `activeCampaign`)

| Method | Path                      | Body / query                                                                                                                                                      | Payload                                                  | Errors                                                                                                                                                                         |
| ------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/exchanges`              | `exchangeQuerySchema`: `direction=out\|in` (default out), `status?`, `q?` (counterpart receptor/name/poblacion), `sort=updatedAt\|counterpart\|total`, pagination | `Paginated<exchangeSummary>`                             | —                                                                                                                                                                              |
| GET    | `/exchanges/inbox`        | —                                                                                                                                                                 | `exchangeSummary[]` (to=me, pending)                     | —                                                                                                                                                                              |
| GET    | `/exchanges/control-list` | `format=json\|csv` (default json)                                                                                                                                 | `ControlList` or CSV file                                | —                                                                                                                                                                              |
| POST   | `/exchanges`              | `exchangeInputSchema`: `{ to, note?, rows, send?: boolean }`                                                                                                      | `exchangeDetail` — 201                                   | 400 `exchange.self`, 404 `user.not_found`, 409 `exchange.exists` (payload: existing id), 400 `exchange.duplicate_numero`, 400 `validation.failed`, 403 `campaign.closed`       |
| GET    | `/exchanges/:id`          | —                                                                                                                                                                 | `exchangeDetail` (marks `seenByReceiverAt` if I am `to`) | 404 `exchange.not_found`, 403 `exchange.forbidden` (not a party)                                                                                                               |
| PUT    | `/exchanges/:id`          | `{ note?, rows }`                                                                                                                                                 | `exchangeDetail`                                         | 403 `exchange.not_owner`, 400 `exchange.duplicate_numero`, 403 `campaign.closed`. Status effects: `accepted` → `pending`; `rejected`/`cancelled` → `draft` (then `send` again) |
| DELETE | `/exchanges/:id`          | —                                                                                                                                                                 | `{}`                                                     | 403 `exchange.not_owner`, 403 `campaign.closed`                                                                                                                                |
| POST   | `/exchanges/:id/send`     | —                                                                                                                                                                 | `exchangeDetail`                                         | 409 `exchange.invalid_transition`, 400 `exchange.no_rows`                                                                                                                      |
| POST   | `/exchanges/:id/cancel`   | —                                                                                                                                                                 | `exchangeDetail`                                         | 409 `exchange.invalid_transition`                                                                                                                                              |
| POST   | `/exchanges/:id/accept`   | —                                                                                                                                                                 | `exchangeDetail`                                         | 403 `exchange.not_receiver`, 409 `exchange.invalid_transition`, 403 `campaign.closed`                                                                                          |
| POST   | `/exchanges/:id/reject`   | `{ reason? }`                                                                                                                                                     | `exchangeDetail`                                         | same as accept                                                                                                                                                                 |

Shapes:

```ts
exchangeSummary = {
    _id, status, totalDecimos, rowCount, signedRowCount, sentAt, respondedAt, seenByReceiverAt, updatedAt,
    from: publicUser, to: publicUser, direction: 'da' | 'recibe' | 'ambos', counterpartStatus?: ExchangeStatus,
}
exchangeDetail = exchangeSummary & { rows: ExchangeRow[], note?, rejectReason?, campaign: { _id, name, exchangeDeadline } }
```

The rule of record for transitions is 03 §3.

### Lottery — `/lottery` (all 🔐, `activeCampaign`)

| Method | Path              | Body / query                                                             | Payload                                  | Errors                  |
| ------ | ----------------- | ------------------------------------------------------------------------ | ---------------------------------------- | ----------------------- |
| GET    | `/lottery`        | —                                                                        | `lotteryNumber[]` (whole list, max 5000) | —                       |
| POST   | `/lottery/import` | `lotteryImportSchema` `{ rows: { numero, series? }[] }` (≤ 1000/request) | `{ inserted, updated }`                  | 400 `validation.failed` |
| POST   | `/lottery`        | `{ numero, series? }`                                                    | `lotteryNumber`                          | —                       |
| DELETE | `/lottery/:id`    | —                                                                        | `{}`                                     | 404 `lottery.not_found` |
| DELETE | `/lottery`        | —                                                                        | `{ deleted }` (clear campaign list)      | —                       |
| GET    | `/lottery/check`  | `numero`                                                                 | `{ owned: boolean, series?: Range[] }`   | —                       |

### Dashboard — `/dashboard` (🔐, `activeCampaign`)

Implemented in Phase 3 (`server/src/api/services/dashboard.ts`), two `$group` aggregations (one per direction) plus three counts:

```ts
GET /dashboard → {
    campaign: { _id, name, drawDate, exchangeDeadline, isClosed },
    inboxPending: number, inboxUnread: number,
    outgoing: { draft, pending, accepted, rejected, cancelled },     // counts
    incoming: { pending, accepted, rejected },
    decimosOut: number, decimosIn: number,                            // pending + accepted
    envelopesToSend: number, envelopesToReceive: number,
    lastExchange: exchangeSummary | null,                             // most recently updated, any direction
    lotteryCount: number,
    adminPendingRequests?: number,   // admins only: pending password reset requests
}
```

### Admin — `/admin` (🛡 unless noted)

| Method | Path                               | Body / query                                                                                               | Payload                                                                | Notes                                                                                  |
| ------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| GET    | `/admin/stats`                     | `campaign?`                                                                                                | `AdminStats` (see 07)                                                  |                                                                                        |
| GET    | `/admin/users`                     | `adminUserQuerySchema`: `q?`, `status?`, `role?`, `sort=lastSeenAt\|createdAt\|receptorNumber`, pagination | `Paginated<adminUser & { exchangeCounts: { out, in } }>`               |                                                                                        |
| GET    | `/admin/users/:id`                 | —                                                                                                          | `adminUser`                                                            |                                                                                        |
| PATCH  | `/admin/users/:id`                 | `adminUpdateUserSchema` (receptorNumber, name, poblacion, provincia, …)                                    | `adminUser`                                                            | Fix typos on behalf of users                                                           |
| PATCH  | `/admin/users/:id/status`          | `{ status: 'active' \| 'blocked' }`                                                                        | `adminUser`                                                            | Blocking revokes all refresh tokens. Can also activate a `pending` user manually.      |
| POST   | `/admin/users/:id/reset-password`  | `adminResetPasswordSchema` `{ temporaryPassword }`                                                         | `{}`                                                                   | Sets hash, `mustChangePassword=true`, resolves pending request, revokes refresh tokens |
| POST   | `/admin/users/:id/revoke-sessions` | —                                                                                                          | `{}`                                                                   | Revokes all refresh tokens of the user ("Cerrar todas las sesiones")                   |
| GET    | `/admin/password-requests`         | `status=pending\|resolved`, pagination                                                                     | `Paginated<{ _id, user: adminUser, status, requestedAt, resolvedAt }>` |                                                                                        |
| GET    | `/admin/users/:id/exchanges`       | `campaign?`, `direction?`, pagination                                                                      | `Paginated<exchangeSummary>`                                           |                                                                                        |
| GET    | `/admin/users/:id/control-list`    | `campaign?`, `format=json\|csv`                                                                            | `ControlList` / CSV                                                    |                                                                                        |
| GET    | `/admin/exchanges/:id`             | —                                                                                                          | `exchangeDetail`                                                       | Admin may `PUT`/`DELETE` through `/exchanges/:id` (authorize bypass)                   |
| GET    | `/admin/campaigns`                 | —                                                                                                          | `campaign[]`                                                           |                                                                                        |
| POST   | `/admin/campaigns`                 | 👑 `createCampaignSchema`                                                                                  | `campaign` — 201                                                       |                                                                                        |
| PATCH  | `/admin/campaigns/:id`             | 👑 `updateCampaignSchema` (incl. `isActive`)                                                               | `campaign`                                                             | Activating deactivates others                                                          |
| PATCH  | `/admin/users/:id/role`            | 👑 `{ role: 'user' \| 'admin' }`                                                                           | `adminUser`                                                            | Cannot change the superadmin                                                           |

## Error code catalogue (`i18n`)

`auth.*`: `not_authenticated`, `forbidden`, `invalid_credentials`, `email_not_verified`, `blocked`, `email_taken`, `receptor_taken`, `token_invalid`, `token_expired`, `already_verified`, `refresh_invalid`, `wrong_password`, `weak_password`
`email.*`: `send_failed`, `daily_cap`
`user.*`: `not_found`
`campaign.*`: `none_active`, `closed`, `not_found`
`exchange.*`: `not_found`, `forbidden`, `not_owner`, `not_receiver`, `self`, `exists`, `duplicate_numero`, `no_rows`, `invalid_transition`
`lottery.*`: `not_found`, `import_too_large`
`validation.*`: `failed`, `invalid_id`
`db.*`: `duplicate`
`rate.*`: `limited`
`server.*`: `error`, `not_found_route`

Success codes follow the same pattern (`auth.login_success`, `exchange.created`, `exchange.sent`, `exchange.accepted`, …). All codes have an entry in `shared/src/messages/es.ts`; a unit test asserts every code used by the server exists in the map (export a `API_CODES` const array from shared and reference it from `AppError`).

## Rate-limit tiers (`express-rate-limit`, key = user id or hashed IP+UA as in reference)

| Tier    | Window | Limit | Applied to                                                   |
| ------- | ------ | ----- | ------------------------------------------------------------ |
| general | 1 min  | 120   | everything                                                   |
| auth    | 15 min | 10    | register, login, forgot-password, verify                     |
| resend  | 1 h    | 3     | resend-verification (per IP; plus 3/day per user in service) |
| refresh | 1 min  | 20    | refresh                                                      |
| import  | 10 min | 20    | lottery import                                               |
| admin   | 1 min  | 300   | `/admin/*`                                                   |

429 responses use `rate.limited`.

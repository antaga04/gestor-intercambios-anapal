# 08 — Roadmap

Ordered phases. Each phase ends with a working, committed state. "Done when" lists are the acceptance checks. Paths refer to 01 (layout), schemas to 02, rules to 03, endpoints to 04, pages to 05.

## Phase 0 — Bootstrap

Steps

1. `git init`, root `package.json` (private, UNLICENSED), `pnpm-workspace.yaml`, `.npmrc`, `.prettierrc`, `.prettierignore`, `.gitignore`, `LICENSE`, `README.md` (Spanish skeleton).
2. `shared/`: package.json, tsconfig, vitest, eslint; `src/index.ts`, `constants.ts`, `schemas/common.ts`, `types/api.ts`, empty `messages/es.ts`.
3. `client/`: `pnpm create vite` (react-ts), add Tailwind 4 (`@tailwindcss/vite`), copy `globals.css`, `shadcn init` (Tailwind 4 preset), add base components (button, input, card, form, dialog, sonner, sidebar, table, badge, select, checkbox, dropdown-menu, tabs, skeleton, tooltip, command, popover, alert, separator), alias `@`, eslint config from reference, `vercel.json`, `.env.dist`, assets into `public/`, manifest.
4. `server/`: package.json, tsconfig with `@/*`, tsup config (`noExternal: ['@anapal/shared']`), eslint, `.env.dist`, `api/index.ts`, `vercel.json`, `src/index.ts` + `app.ts` with health route `GET /api/health`.
5. Root scripts `dev/build/lint/typecheck/test/format`; verify `pnpm build` works for all three.

Done when

- [x] `pnpm install && pnpm typecheck && pnpm lint && pnpm test` pass.
- [x] `pnpm dev` serves client on :5173 with the orange theme and server on :8000 answering `/api/health`; client proxy `/api` works.
- [x] `pnpm build` produces `client/dist` and `server/dist/index.js` that bundles shared code.

## Phase 1 — Server core

Steps

1. `config/env.ts` (zod), `config/db.ts` (cached connect), `utils/response.ts`, `utils/AppError.ts`, `utils/asyncHandler.ts`, `middlewares/errorHandler.ts`, request id.
2. Models: `user`, `campaign`, `refreshToken`, `passwordResetRequest` (02).
3. `utils/{password,jwt,tokens,email}.ts`; `templates/verify-email.html`.
4. Shared schemas `auth.ts`, `user.ts`, `campaign.ts`; messages for all auth codes.
5. Middlewares `authenticate`, `authorize`, `validate`, `rateLimiters`, `activeCampaign`, `requireOpenCampaign`.
6. Routes/controllers/services: `auth` (register, verify, resend, login, refresh, logout, me, forgot-password), `users` (directory, profile, password), `campaigns` (active, list).
7. Seed script (superadmin + default campaign).

Done when

- [x] Register → email received (Resend sandbox) → verify → login sets two cookies → `GET /auth/me` works → wait 15 min (or set TTL 10s) → next call auto-refreshes → logout clears.
- [x] Refresh token reuse: replaying an old cookie revokes the family (manual test with curl).
- [x] Blocked / pending users cannot log in; rate limits return 429 with `rate.limited`.
- [x] `pnpm seed` creates superadmin; `GET /campaigns/active` returns the default campaign.

## Phase 2 — Client core

Steps

1. `lib/api.ts` (axios + refresh interceptor), `lib/queryClient.ts`, `lib/messages.ts`, `lib/format.ts`.
2. `features/auth`: `AuthProvider`, hooks, `LoginForm`, `RegisterForm`, verify/resend/forgot pages.
3. Guards `PrivateRoute`, `RoleRoute`; router; `PublicLayout`, `AppLayout` with `AppSidebar` + `AppHeader` + theme toggle.
4. Landing page (uses `GET /campaigns/active`), 404, aviso legal placeholder.
5. Profile page (`ProfileForm`, `ChangePasswordForm`, `mustChangePassword` alert).
6. Dashboard shell with `CampaignBanner` and placeholder cards.

Done when

- [x] Full auth journey works in the browser; refreshing the page keeps the session; expired access token is transparent; logout redirects.
- [x] Sidebar navigation works on desktop and mobile; dark mode toggles; all strings Spanish; dates `dd/MM/yyyy`.
- [x] Zod errors from the server appear under the right inputs.

## Phase 3 — Users directory, campaigns, dashboard data

Steps

1. `GET /users` search + `UserPicker` (Command popover) + `UserCard`.
2. `GET /dashboard` service (aggregations) and dashboard cards / quick actions / instructions.
3. Admin campaigns page (👑): list + create/edit dialog over the endpoints added in Phase 1.

> Implemented here too (needed by the dashboard aggregation): the `Exchange` and `LotteryNumber` models
> (docs/02), the `toExchangeSummary` mapper, `pairDirection` in shared, and demo exchanges in `pnpm seed --demo`.
> Their services/routes still belong to Phases 4–5.

Done when

- [x] Searching "28" or "Alcalá" finds admons; self and non-active users excluded.
- [x] Dashboard shows zeros correctly for a fresh user and the deadline banner states.

## Phase 4 — Mi lotería

Steps

1. Shared `schemas/lottery.ts`; (model `lotteryNumber` already exists from Phase 3); routes/services (`list`, `import` with upsert + series merge, `create`, `delete`, `clear`, `check`).
2. Shared `lottery/series.ts` (normalize/merge/format ranges) and `lottery/parseLotteryList.ts`, both unit-tested.
3. Client: `LotteryImportDialog` (file or paste, parsed preview, per-line errors, chunked upload, replace option), `LotteryTable` with search, `AddNumberForm`, `useLotteryCheck` (local lookup over the cached list).

Done when

- [x] Importing a CSV with `numero;desde;hasta` lines and a TXT with plain numbers produces the expected list; re-import merges series; `7` becomes `00007`.
- [x] `GET /lottery/check?numero=` and the local hook agree.

## Phase 5 — Exchanges

Steps

1. Shared: `lottery/amounts.ts`, `lottery/rows.ts` (`validateRow`, `mergeScanIntoRow` skeleton), `schemas/exchange.ts` (discriminated union + refinements), messages for `exchange.*`. Vitest for amounts and row validation (all rule rows in 03 §2).
2. (Model `exchange` already exists from Phase 3.) Add row-level zod validation on write paths.
3. Service: create (with counterpart linking), update (status effects), send, cancel, accept, reject, delete (unlink), get (mark seen), list (filters, populate public users, computed `direction`), inbox.
4. Routes/controllers with `activeCampaign` + `requireOpenCampaign`.
5. Client: `features/exchanges` — list page with tabs/filters (URL-synced), `ExchangeTable` + mobile cards, editor page (`UserPicker`, `RowTable`, `RowEditor` with type-specific fields, totals, sticky bar, autosave draft, unsaved guard), detail page with actions and accept/reject dialogs, inbox tab + sidebar badge.

Done when

- [x] Creating A→B as draft, sending, B sees it in Bandeja (unread dot), accepts → status accepted on both sides.
- [x] B creates B→A → both detail pages show "Ambos" and link each other; deleting one clears the link.
- [x] Row rules enforced: duplicate número, series count mismatch, items count mismatch, fracción 11 → rejected with field-level messages; totals show `2,4 billetes` for 24 décimos.
- [x] Editing an accepted exchange returns it to pending; deadline passed → user gets `campaign.closed`, admin does not.
- [x] Lottery warnings appear only when the user has a list.

## Phase 6 — Scanning

Steps

1. Shared `lottery/decodeDecimo.ts` (verbatim) + tests; finish `mergeScanIntoRow` with all events (03 §5.3) + tests.
2. `useBarcodeScanner` (keyboard wedge) + `ScannerStatus`.
3. `CameraScannerDialog` (`BarcodeDetector` → `@zxing/browser` fallback, continuous mode, debounce, beep/vibrate).
4. Wire both into `RowEditor`; campaign mismatch warning using `campaign.barcode`.

Done when

- [ ] With a USB/Bluetooth scanner: scanning two décimos of the same number in `billete` mode fills serie desde/hasta in either order and sets cantidad; in `decimos` mode each scan appends a chip and duplicates are rejected; scanning another number commits and opens a new row.
- [ ] Camera dialog reads a real décimo on a phone (iOS Safari + Android Chrome) and shows the decoded toast.
- [ ] Typing 20 digits by hand does not trigger the wedge listener.

## Phase 7 — Control list and PDFs

Steps

1. Shared `lottery/controlList.ts` + tests (direction cases, totals, sorting).
2. `GET /exchanges/control-list` (json/csv) and admin variant.
3. Client `features/pdf`: `envelopeLayout.ts` calibration (render, print on paper, adjust), `envelopePdf.ts`, `sheetPdf.ts`, `controlListPdf.ts`, `merge.ts`, `PdfPreviewDialog`, download helper.
4. `/lista-control` page with totals, table, CSV/PDF/all-envelopes buttons; PDF actions in list/detail pages.

Done when

- [ ] Printed envelope from the template lines up with the boxes (both blocks) on A4.
- [ ] "Descargar todos los sobres" yields one PDF, ordered by receptor number, only outgoing pending/accepted; "Solo sobres" skips sheets.
- [ ] CSV opens in Excel (Spanish locale) with correct accents and `;` separators.

## Phase 8 — Dashboard stats polish

Steps

1. Finalise `GET /dashboard` aggregation (single pipeline per direction) and cache 30 s client-side.
2. Last exchange card, quick actions, instructions block; empty states for new users.

Done when

- [ ] Numbers on dashboard match list/control-list totals for a seeded user.

## Phase 9 — Admin panel

Steps

1. Shared `schemas/admin.ts`; endpoints in 04 (`stats`, `users`, user detail/update/status/reset-password/revoke-sessions/role, password requests, user exchanges + control list, campaigns).
2. Client admin pages (07): panel with chart, users table + detail tabs, requests, campaigns (👑); sidebar admin group with pending-requests badge.
3. Email budget counters in stats.

Done when

- [ ] Admin can find a user, set a temporary password (request resolved, user forced to change), block/unblock (session cut), download their control list, and open any exchange.
- [ ] Superadmin can create next year's campaign and activate it; exchanges of the old campaign stay visible via the campaign selector.
- [ ] Non-admin hitting `/admin/*` gets redirected; API returns 403.

## Phase 10 — Deploy and hand-off

Steps

1. Mongo Atlas cluster + user; IP allowlist `0.0.0.0/0` (Vercel) or Atlas–Vercel integration.
2. Vercel project `server` (root `server`), env vars from `.env.dist`; verify `https://<server>.vercel.app/api/health`.
3. Vercel project `client` (root `client`), set the server URL in `vercel.json` rewrite (or via env-substituted build step), `VITE_API_URL=/api`.
4. Resend: verify sending domain, set `EMAIL_FROM`; run `pnpm seed` against production DB (superadmin only, no `--demo`).
5. README: description, stack, local setup, env tables, deploy steps, seeding, "cómo funciona el intercambio" summary, limits (emails).
6. Smoke test checklist in README: register/verify/login on prod, create+send+accept an exchange between two test admons, print an envelope, admin reset password, deadline behaviour.

Done when

- [ ] Production URLs work end-to-end with cookies (check `Set-Cookie` has `Secure; HttpOnly; SameSite=Lax` and requests go through the proxy).
- [ ] Cold-start latency acceptable (< 2 s) thanks to cached DB connection.
- [ ] `--demo` data absent in production; superadmin can log in.

## Later / nice-to-have (not in v1)

- In-app notifications for accepted/rejected exchanges (no emails).
- Service worker / offline camera scanning.
- Export of the whole campaign for ANAPAL (XLSX).
- API smoke tests with supertest + mongodb-memory-server.
- Server-side PDF generation if client-side proves slow on old phones.

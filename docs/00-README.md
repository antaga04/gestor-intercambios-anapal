# ANAPAL Intercambios — Specification

Web app for Spanish lottery administrations ("admons") to manage the yearly ANAPAL lottery exchange. Each admon sends envelopes ("sobres") with décimos to other admons and may receive envelopes back. The app tracks who exchanges with whom, what numbers go in each envelope, prints the envelopes, and keeps a control list.

This folder holds the specification that will be used to scaffold the project. `plan.md` is the original brief; the numbered files refine it into an implementable design.

| File                                                         | What it defines                                                                    |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| [01-architecture-and-stack.md](01-architecture-and-stack.md) | Monorepo layout, versions, tooling, configs, env vars, deploy to Vercel/Atlas      |
| [02-data-model.md](02-data-model.md)                         | Mongo collections, fields, indexes, invariants, zod schema names                   |
| [03-domain-logic.md](03-domain-logic.md)                     | Exchange lifecycle, row rules & lottery math, barcode scanning, control list, PDFs |
| [04-api.md](04-api.md)                                       | REST contract: endpoints, payloads, error codes, rate limits                       |
| [05-client.md](05-client.md)                                 | Routes, layouts, pages, components, state, forms, Spanish formats                  |
| [06-auth-security-email.md](06-auth-security-email.md)       | Access + refresh tokens, cookies, email verification, admin-driven password reset  |
| [07-admin-panel.md](07-admin-panel.md)                       | Admin / superadmin pages, endpoints, stats                                         |
| [08-roadmap.md](08-roadmap.md)                               | Phased implementation steps with "done when" checklists                            |

Conventions used across the docs: English prose, Spanish domain terms and UI strings (the app is Spanish-only), `camelCase` field names, amounts always stored as **integer décimos**.

## Glossary

| Term                   | Meaning                                                                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Admon**              | Administración de lotería. One registered user = one admon.                                                                                          |
| **Nº de receptor**     | Official number identifying an admon. Printed on the envelope. Unique per user (`receptorNumber`).                                                   |
| **Número**             | A lottery number, 5 digits `00000`–`99999`. 100 000 exist per draw.                                                                                  |
| **Serie**              | Each número is printed in 192 series (`1`–`192`). Serie = billete.                                                                                   |
| **Billete**            | 10 décimos of the same número and serie (fracciones 1–10). Unit of account: **1 billete = 10 décimos**.                                              |
| **Décimo**             | One ticket. Identified by número + serie + fracción. 1 décimo = 0,1 billete.                                                                         |
| **Fracción**           | Position of a décimo inside its serie, `1`–`10`.                                                                                                     |
| **Firmado / signed**   | A row flagged as "signed" (the admon signs the décimos it gives). Stored as a boolean per row.                                                       |
| **Intercambio**        | An `Exchange` document: one admon (`from`) gives a list of rows to another (`to`). One exchange = one physical envelope.                             |
| **Unidireccional**     | Only A→B exists for a pair in a campaign.                                                                                                            |
| **Bidireccional**      | Both A→B and B→A exist (and neither is rejected/cancelled). Computed, not stored as a type.                                                          |
| **Bandeja / inbox**    | Exchanges addressed to me that are `pending` my acceptance.                                                                                          |
| **Sobre**              | Envelope. Printed from `public/sobre-template.pdf` with DESTINATARIO and REMITENTE (Nº de receptor, Población, Provincia).                           |
| **Lista de control**   | Per-user summary: for each counterpart, what I give, what I receive, direction (Da / Recibe / Ambos), and totals of envelopes to send/receive.       |
| **Campaña / campaign** | One exchange season (e.g. "Navidad 2026"). All exchanges, imported numbers and stats belong to a campaign; exactly one is active.                    |
| **Mi lotería**         | The numbers an admon has in stock for the campaign (imported or added manually). Used to warn when a row references a number the admon doesn't have. |

## Roles

| Role         | Who                         | Can                                                                                                                            |
| ------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `user`       | Any registered admon        | Everything under the private area: dashboard, profile, exchanges, my lottery, control list, PDFs.                              |
| `admin`      | ANAPAL staff                | Everything a user can + admin panel: see all users/exchanges, download any control list, set temporary passwords, block users. |
| `superadmin` | The developer (seeded, one) | Everything an admin can + manage campaigns and promote/demote admins.                                                          |

## Decision log

| #   | Decision                                                                                                             | Why                                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | Modern baseline: React 19, Tailwind 4, latest shadcn, Vite 7, react-router 7, Express 5, Mongoose 8.                 | Matches the provided `globals.css` (Tailwind 4 syntax, oklch). Same shape as imprffctgames, current versions. |
| 2   | Add a `shared` workspace package (zod schemas, types, constants, lottery utils, Spanish messages).                   | Row/serie/fracción validation is non-trivial and must be identical on client and server.                      |
| 3   | TanStack Query + react-hook-form + zod on the client.                                                                | Lists with filters, inbox badges and a complex row editor benefit from proper server-state and form handling. |
| 4   | Amounts stored as integer décimos, displayed as billetes with one decimal (`1,3 billetes`).                          | Avoids floating point; "base billete" display as required by the brief.                                       |
| 5   | `Exchange` = one direction = one envelope. Bidirectional is computed from the reverse document (`counterpart` link). | Keeps lists, inbox and control list simple; matches the physical reality (one envelope each way).             |
| 6   | Campaign entity; one active campaign.                                                                                | App is reused every year; past data stays readable.                                                           |
| 7   | Access JWT (15 min) + rotating refresh token (30 days) in httpOnly cookies.                                          | Long sessions without emails (Resend budget: 3000/month, 100/day).                                            |
| 8   | Emails only for registration verification. Password reset is handled by admins setting a temporary password.         | Brief requirement; protects the email budget.                                                                 |
| 9   | Client Vercel project proxies `/api/*` to the server Vercel project (rewrite).                                       | Cookies are first-party → `sameSite: 'lax'` works without a custom domain and without CORS.                   |
| 10  | PDFs generated client-side with `pdf-lib` from `sobre-template.pdf`; bulk download = one merged PDF.                 | No heavy deps on Vercel serverless; a single PDF is what you actually print.                                  |
| 11  | Barcode format is known (20 digits, see 03). Hardware scanner = keyboard wedge; camera = `@zxing/browser`.           | Provided by the user.                                                                                         |
| 12  | Spanish-only UI, no i18n library; server error codes mapped via `shared/messages/es.ts`.                             | Keeps the imprffctgames `i18n` code convention without the i18next weight.                                    |
| 13  | No Docker/Makefile; Vercel for client and server, Mongo Atlas for the DB.                                            | Brief requirement.                                                                                            |
| 14  | Private repo: root `"license": "UNLICENSED"` + `LICENSE` ("All rights reserved"); prettier + eslint + pnpm.          | Brief requirement.                                                                                            |

## Assets already in this folder

| Path                                                                        | Use                                                                                                        |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `globals.css`                                                               | Tailwind 4 + shadcn theme. ANAPAL orange `#ff660d` as `--primary`. Becomes `client/src/globals.css`.       |
| `favicon.ico`                                                               | `client/public/favicon.ico`                                                                                |
| `public/logotipo.png`                                                       | Logo for landing, sidebar header, auth pages.                                                              |
| `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png` | PWA manifest icons / iOS icon.                                                                             |
| `public/sobre-template.pdf`                                                 | Envelope template. Fields: DESTINATARIO (Nº de Receptor, Población, Provincia) and REMITENTE (same three). |

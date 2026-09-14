# 01 — Architecture and stack

Mirrors the shape of `imprffctgames` (pnpm workspace, Vite/React client, Express/Mongoose server, Vercel deploys) with current versions and a `shared` package.

## Monorepo layout

```
anapal-intercambio/
├── package.json                 # private, UNLICENSED, root scripts, prettier
├── pnpm-workspace.yaml          # packages: client, server, shared
├── .npmrc                       # save-exact=true
├── .prettierrc / .prettierignore
├── .gitignore
├── LICENSE                      # "All rights reserved" (repo is private)
├── README.md                    # Spanish: qué es, cómo arrancar, variables de entorno, despliegue
├── shared/                      # @anapal/shared — zod schemas, types, constants, lottery utils, messages
├── client/                      # @anapal/client — Vite + React 19
└── server/                      # @anapal/server — Express 5 + Mongoose 8
```

### Root `package.json`

```json
{
    "name": "anapal-intercambio",
    "private": true,
    "license": "UNLICENSED",
    "packageManager": "pnpm@11.9.0",
    "scripts": {
        "dev": "pnpm -r --parallel dev",
        "build": "pnpm -r build",
        "lint": "pnpm -r lint",
        "typecheck": "pnpm -r typecheck",
        "test": "pnpm -r test",
        "format": "prettier --write ."
    },
    "devDependencies": { "prettier": "^3" }
}
```

`pnpm-workspace.yaml`: `packages: [shared, client, server]` plus `allowBuilds: { bcrypt: true, esbuild: true }` (same as reference).

`.prettierrc` (identical to reference):

```json
{ "printWidth": 120, "singleQuote": true, "trailingComma": "all", "tabWidth": 4 }
```

`.gitignore`: Vite template + `.env`, `.env.*.local`, `dist`, `node_modules`, `.vercel`, `TODO.md`, `NOTES.md`.

## `shared/` — `@anapal/shared`

Plain TypeScript source, no build step. Consumers compile it themselves.

```
shared/
├── package.json        # "name": "@anapal/shared", "type": "module", "exports": { ".": "./src/index.ts", "./*": "./src/*.ts" }
├── tsconfig.json       # strict, ESNext, moduleResolution bundler, noEmit
├── vitest.config.ts
└── src/
    ├── index.ts
    ├── constants.ts            # ROLES, USER_STATUS, EXCHANGE_STATUS, ROW_TYPES, LIMITS (series 1..192, fracción 1..10, max rows 500 …)
    ├── schemas/
    │   ├── auth.ts             # registerSchema, loginSchema, forgotPasswordSchema, changePasswordSchema
    │   ├── user.ts             # updateProfileSchema, publicUserSchema
    │   ├── campaign.ts         # campaignSchema, createCampaignSchema
    │   ├── exchange.ts         # exchangeRowSchema (discriminated by type), exchangeInputSchema, exchangeQuerySchema
    │   ├── lottery.ts          # lotteryNumberSchema, lotteryImportSchema
    │   ├── admin.ts            # adminResetPasswordSchema, adminUserQuerySchema, updateRoleSchema, updateStatusSchema
    │   └── common.ts           # objectIdSchema, paginationQuerySchema, numeroSchema, serieSchema, fraccionSchema
    ├── types/                  # z.infer exports + API envelope types (ApiSuccess, ApiError, Paginated<T>)
    ├── lottery/
    │   ├── decodeDecimo.ts     # user-provided decoder (see 03)
    │   ├── amounts.ts          # toBilletes, formatBilletes, rowAmountDecimos, exchangeTotalDecimos
    │   ├── direction.ts        # pairDirection(gives, receives)
    │   ├── series.ts           # normalizeSeries, mergeSeries, seriesContains, countSeries, formatSeries
    │   ├── parseLotteryList.ts # CSV/TXT/pasted list → rows + per-line issues
    │   ├── rows.ts             # validateRow, mergeScanIntoRow (pure scan-to-row logic)
    │   └── controlList.ts      # buildControlList(exchanges, meId)
    ├── messages/
    │   └── es.ts               # Record<ApiCode, string> — Spanish text for every server `i18n` code
    └── __tests__/              # vitest: decodeDecimo, amounts, rows, controlList
```

Scripts: `test` (vitest run), `typecheck` (tsc --noEmit), `lint` (eslint).

Dependencies: `zod@^3` (single copy for the workspace). Dev: `vitest`, `typescript`, eslint.

## `client/` — `@anapal/client`

| Concern        | Choice                                                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build          | Vite 7, `@vitejs/plugin-react`, `@tailwindcss/vite`, alias `@` → `src`                                                                                        |
| UI             | React 19, TypeScript 5, Tailwind 4, shadcn (Tailwind 4 preset, `components.json` baseColor neutral, cssVariables), `lucide-react`, `sonner`, `tw-animate-css` |
| Routing        | `react-router-dom@^7`, declarative `<BrowserRouter>/<Routes>` in JSX (reference pattern), `PrivateRoute` + `RoleRoute` outlet components                      |
| Server state   | `@tanstack/react-query@^5` (+ devtools in dev)                                                                                                                |
| Forms          | `react-hook-form` + `@hookform/resolvers` + zod schemas from `@anapal/shared`                                                                                 |
| HTTP           | `axios` instance (`lib/api.ts`) with `withCredentials`, base URL `import.meta.env.VITE_API_URL` (default `/api`), 401 → refresh interceptor (see 06)          |
| Dates/numbers  | `date-fns` + `date-fns/locale/es`, `Intl.NumberFormat('es-ES')`                                                                                               |
| PDFs           | `pdf-lib`                                                                                                                                                     |
| Barcode camera | `@zxing/browser` (+ native `BarcodeDetector` when present)                                                                                                    |
| CSV            | `papaparse`                                                                                                                                                   |
| Charts (admin) | shadcn `chart` (recharts)                                                                                                                                     |

`client/vercel.json`:

```json
{
    "rewrites": [
        { "source": "/api/(.*)", "destination": "https://<server-project>.vercel.app/api/$1" },
        { "source": "/(.*)", "destination": "/" }
    ]
}
```

The first rewrite proxies API calls through the client domain so cookies are first-party (see 06). In dev, `vite.config.ts` does the same with `server.proxy['/api'] → http://localhost:8000`.

Scripts: `dev` (vite --host), `build` (tsc -b && vite build), `preview`, `lint`, `typecheck` (tsc --noEmit).

`client/.env.dist`: `VITE_API_URL=/api`.

Assets: copy `favicon.ico`, `public/*` from this folder into `client/public/`; `globals.css` → `client/src/globals.css` imported from `main.tsx`. Add `client/public/manifest.webmanifest` (name "Intercambios ANAPAL", theme color `#ff660d`, icons 192/512).

## `server/` — `@anapal/server`

| Concern    | Choice                                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| Runtime    | Node 22, ESM, TypeScript 5. Dev `tsx watch src/index.ts`, build `tsup` → `dist/index.js`                               |
| Framework  | `express@^5`, `cookie-parser`, `cors` (only for non-proxied dev origins), `helmet`, `express-rate-limit`, `request-ip` |
| DB         | `mongoose@^8`, Mongo Atlas. Cached connection helper for serverless (`config/db.ts`)                                   |
| Auth       | `jsonwebtoken`, `bcrypt`, `crypto` (refresh token generation/hash)                                                     |
| Validation | zod schemas from `@anapal/shared` via `validate({ body?, query?, params? })` middleware                                |
| Email      | `resend`, HTML templates in `server/templates/` (copied to dist by tsup `onSuccess`)                                   |
| Env        | `dotenv`; `config/env.ts` parses `process.env` with zod and fails fast                                                 |

Folder structure:

```
server/
├── api/index.ts                 # Vercel entry: `import app from '../dist/index.js'; export default app;`
├── vercel.json                  # { "version": 2, "rewrites": [{ "source": "/(.*)", "destination": "/api" }] }
├── tsup.config.ts               # entry src/index.ts, esm, noExternal: ['@anapal/shared']
├── tsconfig.json                # paths @/* → src/*
├── .env.dist
└── src/
    ├── index.ts                 # app bootstrap; app.listen only if !process.env.VERCEL
    ├── app.ts                   # express app factory (middlewares, routes, error handler)
    ├── config/{env.ts,db.ts}
    ├── api/
    │   ├── routes/{index,auth,users,campaigns,exchanges,lottery,dashboard,admin}.ts
    │   ├── controllers/<same names>.ts     # parse req → call service → sendSuccess
    │   ├── services/<same names>.ts        # business rules, ownership checks, throws AppError
    │   └── models/{user,campaign,exchange,lotteryNumber,refreshToken,passwordResetRequest}.ts
    ├── middlewares/{authenticate,authorize,validate,rateLimiters,campaign,errorHandler,requestId}.ts
    ├── utils/{response,AppError,asyncHandler,jwt,password,tokens,cookies,email,pagination}.ts
    ├── templates/verifyEmail.ts
    ├── types/{express.d.ts,model.ts}
    └── seed/{index.ts,superadmin.ts,campaign.ts,demo.ts}
```

Scripts: `dev`, `build`, `start` (node dist/index.js), `seed` (tsx src/seed/index.ts), `lint`, `typecheck`.

### Serverless notes

- `src/index.ts`: `const app = createApp(); if (!process.env.VERCEL) app.listen(env.PORT)`; `export default app`.
- `config/db.ts`: memoised `mongoose.connect` promise on `globalThis` so warm lambdas reuse the connection; called lazily from a first middleware (`await connectToDatabase(); next()`).
- Vercel project settings: Root Directory `server`, Build Command `pnpm build`, Install Command `pnpm install --frozen-lockfile` (run from repo root — enable "Include source files outside of the Root Directory"). Same for `client` with Output Directory `dist`.

## Environment variables

### `server/.env.dist`

```
# Server
PORT=8000
IS_PRODUCTION=false
CLIENT_URL=http://localhost:5173        # used for email links and (dev only) CORS
COOKIE_DOMAIN=                          # empty locally; set only if using a custom apex domain

# Database
MONGO_URL=mongodb://localhost:27017/anapal-intercambio

# Auth
ACCESS_TOKEN_SECRET=change-me
REFRESH_TOKEN_SECRET=change-me           # HMAC key for hashing refresh tokens
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=30
EMAIL_CONFIRMATION_SECRET=change-me
EMAIL_CONFIRMATION_TTL=24h

# Email (Resend: 100/day, 3000/month on the free tier)
RESEND_API_KEY=
EMAIL_FROM="Intercambios ANAPAL <noreply@example.com>"

# Seed
SUPERADMIN_EMAIL=
SUPERADMIN_PASSWORD=
SUPERADMIN_RECEPTOR_NUMBER=00000
```

### `client/.env.dist`

```
VITE_API_URL=/api
```

## Lint / format / TS

- ESLint 9 flat config per package: `client/eslint.config.js` = reference file (js recommended + tseslint recommended + react-hooks + react-refresh); `server/eslint.config.js` and `shared/eslint.config.js` = js + tseslint recommended, `globals.node`.
- `tsconfig` strictness as reference (`strict`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedSideEffectImports`).
- Tests: vitest in `shared` (pure domain logic). Optional later: `supertest` + `mongodb-memory-server` for API smoke tests in `server`.

## Local development

```
pnpm install
cp server/.env.dist server/.env && cp client/.env.dist client/.env
pnpm --filter @anapal/server seed      # creates superadmin + demo campaign (+ demo admons with --demo)
pnpm dev                                # client :5173 (proxies /api → :8000), server :8000
```

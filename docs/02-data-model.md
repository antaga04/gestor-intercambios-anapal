# 02 — Data model

MongoDB (Atlas) via Mongoose 8. All collections use `{ timestamps: true }` (`createdAt`, `updatedAt`). All quantities of lottery are stored as **integer décimos** (`amountDecimos`, `totalDecimos`). Never store billetes as floats.

Every model has a matching zod schema in `@anapal/shared` (`shared/src/schemas/*`) used for request validation on the server and form validation on the client. Server-side mongoose validators are a second line of defence, not the primary one.

## Collections

### `users`

| Field                     | Type                                 | Rules                                                                                |
| ------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------ |
| `email`                   | string, unique, lowercase, trimmed   | Login identifier. Verified via email.                                                |
| `passwordHash`            | string                               | bcrypt, cost 10. Never returned.                                                     |
| `role`                    | `'user' \| 'admin' \| 'superadmin'`  | default `user`. Only superadmin can change it. Exactly one superadmin (seeded).      |
| `status`                  | `'pending' \| 'active' \| 'blocked'` | `pending` until email verified. `blocked` set by admin; login refused.               |
| `receptorNumber`          | string, unique, digits `^\d{1,6}$`   | Nº de receptor. Printed on envelopes. Immutable after registration (admin can fix).  |
| `name`                    | string 2–80                          | Nombre de la administración (e.g. "Admón. nº 12 – La Bruja de Oro").                 |
| `poblacion`               | string 2–80                          | Printed on envelopes.                                                                |
| `provincia`               | string 2–60                          | Printed on envelopes. UI offers a select with the 52 provinces + free text fallback. |
| `address`                 | string ≤ 160, optional               | Not printed (envelope template has no address field) but shown in public profile.    |
| `phone`                   | string ≤ 20, optional                | Public.                                                                              |
| `contactName`             | string ≤ 80, optional                | Public.                                                                              |
| `mustChangePassword`      | boolean, default false               | Set when an admin assigns a temporary password. Cleared when the user changes it.    |
| `lastLoginAt`             | Date, optional                       | Updated on successful `POST /auth/login`.                                            |
| `lastSeenAt`              | Date, optional                       | Updated on `POST /auth/refresh`, throttled to once per 5 min.                        |
| `verificationEmailsSent`  | number, default 0                    | Lifetime count; used to cap resends.                                                 |
| `lastVerificationEmailAt` | Date, optional                       | Used for the 3-per-day resend cap.                                                   |

Indexes: `{ email: 1 }` unique, `{ receptorNumber: 1 }` unique, text index `{ name: 'text', poblacion: 'text' }` + `{ receptorNumber: 1 }` for directory search.

Projections:

- `publicUser`: `_id, receptorNumber, name, poblacion, provincia, address, phone, contactName` — what other users see.
- `meUser`: `publicUser` + `email, role, status, mustChangePassword, createdAt`.
- `adminUser`: `meUser` + `lastLoginAt, lastSeenAt, verificationEmailsSent`.

zod: `registerSchema`, `updateProfileSchema`, `publicUserSchema`, `changePasswordSchema` (`shared/src/schemas/{auth,user}.ts`).

### `campaigns`

| Field              | Type                                                  | Rules                                                                                                   |
| ------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `name`             | string, unique                                        | "Navidad 2026"                                                                                          |
| `drawDate`         | Date                                                  | Fecha del sorteo (shown on landing).                                                                    |
| `exchangeDeadline` | Date                                                  | Fecha límite para intercambiar. After it, exchanges become read-only for users (admins can still edit). |
| `isActive`         | boolean                                               | Exactly one campaign has `isActive: true`. Service enforces it (activating one deactivates the rest).   |
| `barcode`          | `{ dayDigit: '5' \| '6', jornada: string }`, optional | Expected values decoded from a scanned décimo (see 03). Mismatch → warning, not error.                  |
| `landingText`      | string ≤ 4000, optional                               | Markdown-ish free text shown on the landing page (instrucciones del intercambio).                       |
| `createdBy`        | ObjectId → users                                      |                                                                                                         |

Index: `{ isActive: 1 }` partial unique (`partialFilterExpression: { isActive: true }`).

zod: `campaignSchema`, `createCampaignSchema`, `updateCampaignSchema`.

### `exchanges`

One document = one direction = one physical envelope. "Bidirectional" is derived: the reverse document exists and is linked through `counterpart`.

| Field              | Type                                                              | Rules                                                                                                       |
| ------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `campaign`         | ObjectId → campaigns                                              | Required.                                                                                                   |
| `from`             | ObjectId → users                                                  | The admon that gives (creator/owner).                                                                       |
| `to`               | ObjectId → users                                                  | The admon that receives. `from !== to`.                                                                     |
| `status`           | `'draft' \| 'pending' \| 'accepted' \| 'rejected' \| 'cancelled'` | See lifecycle in 03. Default `draft`.                                                                       |
| `rows`             | `ExchangeRow[]` (embedded)                                        | 1–500 rows once sent (draft may be empty). `numero` unique inside the array.                                |
| `totalDecimos`     | number (int)                                                      | Denormalised `sum(rows.amountDecimos)`; recomputed in a `pre('validate')` hook.                             |
| `counterpart`      | ObjectId → exchanges, optional                                    | The reverse exchange (`to → from`, same campaign) if it exists. Maintained by the service on create/delete. |
| `sentAt`           | Date, optional                                                    | When status first became `pending`.                                                                         |
| `seenByReceiverAt` | Date, optional                                                    | First time the receiver opened it. Drives the "nuevo" badge.                                                |
| `respondedAt`      | Date, optional                                                    | When accepted/rejected.                                                                                     |
| `rejectReason`     | string ≤ 500, optional                                            |                                                                                                             |
| `note`             | string ≤ 1000, optional                                           | Free text from the giver, shown to the receiver and printed on the hoja.                                    |

Indexes:

- `{ campaign: 1, from: 1, to: 1 }` **unique** — one envelope per direction per campaign.
- `{ campaign: 1, to: 1, status: 1 }` — inbox and "Recibidos" lists.
- `{ campaign: 1, from: 1, status: 1 }` — "Enviados" list and control list.
- `{ 'rows.numero': 1, campaign: 1 }` — admin lookups by number (optional, low priority).

#### `ExchangeRow` (subdocument)

| Field           | Type                                 | Rules                                                                                                          |
| --------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `_id`           | ObjectId                             | Stable id for client-side editing keys.                                                                        |
| `numero`        | string `^\d{5}$`                     | Unique within the exchange.                                                                                    |
| `type`          | `'billete' \| 'decimo' \| 'decimos'` | Determines what `quantity` and `details` mean.                                                                 |
| `quantity`      | int ≥ 1                              | `billete`: nº de billetes (1–192). `decimo`: always `1`. `decimos`: nº de décimos, 2–1919.                     |
| `amountDecimos` | int                                  | Derived: `billete` → `quantity * 10`; otherwise `quantity`. Recomputed on save, never trusted from the client. |
| `details`       | object, optional                     | Shape depends on `type` (below).                                                                               |
| `signed`        | boolean, default false               | "Sellado".                                                                                                     |
| `note`          | string ≤ 200, optional               |                                                                                                                |

`details` by type:

| `type`    | `details`                                                | Validation                                                                                                             |
| --------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `billete` | `{ serieFrom?: int 1–192, serieTo?: int 1–192 }`         | Both or neither. `serieFrom <= serieTo`. `serieTo - serieFrom + 1 === quantity`. No fracciones (a billete has all 10). |
| `decimo`  | `{ serie?: int 1–192, fraccion?: int 1–10 }`             | Both or neither.                                                                                                       |
| `decimos` | `{ items?: { serie: int 1–192, fraccion: int 1–10 }[] }` | If present: unique `(serie, fraccion)` pairs and `items.length === quantity`.                                          |

zod: `exchangeRowSchema` is a `z.discriminatedUnion('type', [...])` with `superRefine` for the cross-field rules; `exchangeInputSchema = { to, note?, rows }`; `exchangeQuerySchema` for list filters (`shared/src/schemas/exchange.ts`).

### `lotterynumbers` ("Mi lotería")

| Field      | Type                                             | Rules                                                                                                  |
| ---------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `user`     | ObjectId → users                                 |                                                                                                        |
| `campaign` | ObjectId → campaigns                             |                                                                                                        |
| `numero`   | string `^\d{5}$`                                 |                                                                                                        |
| `series`   | `{ from: int 1–192, to: int 1–192 }[]`, optional | Ranges of series the admon holds for that número. Empty/absent = "I have this number, unknown series". |
| `source`   | `'import' \| 'manual'`                           |                                                                                                        |

Index: `{ user: 1, campaign: 1, numero: 1 }` unique. Import upserts on that key (merging `series`).

zod: `lotteryNumberSchema`, `lotteryImportSchema` (`{ rows: lotteryNumberInput[] }`, max 5000 per request).

### `refreshtokens`

| Field                 | Type             | Rules                                                                                       |
| --------------------- | ---------------- | ------------------------------------------------------------------------------------------- |
| `user`                | ObjectId → users |                                                                                             |
| `tokenHash`           | string, unique   | HMAC-SHA256(`REFRESH_TOKEN_SECRET`, rawToken). Raw token only lives in the cookie.          |
| `family`              | string (uuid)    | Same value across rotations of one login session; reuse detection revokes the whole family. |
| `expiresAt`           | Date             | TTL index `{ expiresAt: 1 }, { expireAfterSeconds: 0 }`.                                    |
| `createdByIp`         | string           |                                                                                             |
| `userAgent`           | string ≤ 300     |                                                                                             |
| `revokedAt`           | Date, optional   |                                                                                             |
| `replacedByTokenHash` | string, optional |                                                                                             |

### `passwordresetrequests`

| Field         | Type                       | Rules                                     |
| ------------- | -------------------------- | ----------------------------------------- |
| `user`        | ObjectId → users           |                                           |
| `status`      | `'pending' \| 'resolved'`  |                                           |
| `requestedAt` | Date                       |                                           |
| `resolvedBy`  | ObjectId → users, optional | The admin who set the temporary password. |
| `resolvedAt`  | Date, optional             |                                           |

Index: `{ status: 1, requestedAt: -1 }`. Creating a request while one is `pending` for the same user just bumps `requestedAt` (no duplicates).

### `legacyexchanges` — history of the previous app

Filled once by `pnpm import-legacy` (see "Migración" below). Read-only: nothing in the app writes here afterwards.

| Field           | Type                                                                                                         | Rules                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `legacyId`      | string, unique                                                                                               | `intercambios.id` (uuid) of the old database.                                                                                        |
| `user`          | ObjectId → users                                                                                             | The owner of the record (`intercambios.user_id`).                                                                                    |
| `campaign`      | ObjectId → campaigns                                                                                         | The campaign active when the import ran.                                                                                             |
| `counterpart`   | `{ name, receptorNumber, poblacion?, provincia?, user? }`                                                    | As typed by hand in the old app; `user` set when the receptor number belongs to an imported user.                                    |
| `estado`        | `'En edición' \| 'Pendiente de ensobrado' \| 'Ensobrado'`                                                    | Verbatim.                                                                                                                            |
| `observaciones` | string, optional                                                                                             | Private notes of the owner; never copied to `exchanges.note`.                                                                        |
| `fecha`         | Date                                                                                                         |                                                                                                                                      |
| `envelope`      | `{ delivered, received, checked }`                                                                           | `sobre_entregado` / `sobre_recibido` / `recepcionado` — physical checks with no equivalent here.                                     |
| `lines`         | `{ legacyId, tipo: 'Entrego' \| 'Recibo', numero?, serie?, fraccion?, billetes, sellado, modo, migrated }[]` | `numero` is the raw text (may be "SALP"); `billetes` may be fractional (0,1 = one décimo); `migrated` = became a row of an exchange. |
| `migrated`      | `{ out?: ObjectId, in?: ObjectId }`                                                                          | The exchanges built for this relationship: what I give / what I receive.                                                             |

Index: `{ user: 1, fecha: -1 }`. Related fields elsewhere: `users.legacyId` (old `auth.users.id`, unique sparse) and `exchanges.legacy { id, skippedLines }` (old `intercambios.id` the exchange was built from, and how many of its lines could not be converted).

## Migración desde la app anterior

The previous app (Next.js + Supabase) had a different model: every user kept **their own** records (`intercambios`) about a counterpart typed by hand (name, receptor number, city, province), each with `Entrego` and `Recibo` lines (`operaciones`), and nothing was shared between users. `server/src/scripts/importLegacy.ts` reads a `pg_dumpall` backup and:

1. **Users** — `auth.users` + `profiles` + `remitente` → `users`, keeping the bcrypt hash (people log in with the same password), `role` (`admin` stays admin), `lastLoginAt` and timestamps. Accounts without a `remitente` get placeholder `name/poblacion/provincia` and a 6-digit receptor number (`900001`…); so does the loser when two accounts claim the same receptor number (most recently updated `remitente` wins) or when the number already exists. The report lists them so an admin can fix them from Admin › Usuarios.
2. **History** — every `intercambios` record → `legacyexchanges`, verbatim, with its lines. 100 % of the data survives here.
3. **Exchanges** — only when the counterpart's receptor number belongs to an imported user, and never pointing to oneself. For each ordered pair (giver → receiver) the giver's own record (`Entrego` lines) is the source; the receiver's record (`Recibo` lines) is used only when the giver has none. Lines are converted by `legacyLinesToRows` (shared, unit-tested): `billete` → `billete` (summing lines of the same número), `decimo` 0,1 → `decimo` with serie/fracción when in range (otherwise kept in the row `note`), `decimos` → `decimos` with `quantity = billetes × 10`, mixed groups → `decimos` with a descriptive note. Lines without a valid 5-digit número (`null`, "SALP", "5+5"…) cannot become rows and stay only in the history; `exchanges.legacy.skippedLines` counts them and the detail page says so. Status: `Ensobrado` / `Pendiente de ensobrado` → `accepted` (`sentAt` = created, `respondedAt` = `seenByReceiverAt` = updated); `En edición` (the old default) → `draft` when built from the giver's record, `pending` when built from the receiver's (so the receiver, who recorded it, still sees it). Both directions are linked through `counterpart`. `observaciones` are **not** copied to `note` (they were private).

Idempotent: users match by `legacyId`/email, history by `legacyId`, exchanges by `(campaign, from, to)`; nothing existing is overwritten. `--dry-run` prints the report only.

### Email verification — no collection

Verification links carry a JWT `{ sub: userId, purpose: 'verify-email' }` signed with `EMAIL_CONFIRMATION_SECRET`, TTL 24 h (reference approach). Resend caps use `users.verificationEmailsSent` / `lastVerificationEmailAt`.

## Invariants (enforced in services, tested in shared where pure)

1. `exchange.from !== exchange.to`.
2. At most one exchange per `(campaign, from, to)`.
3. `rows[].numero` unique within an exchange.
4. `amountDecimos` and `totalDecimos` are always recomputed server-side from `type`/`quantity`.
5. `counterpart` is symmetric: if A→B has `counterpart = B→A` then B→A has `counterpart = A→B`; cleared on delete.
6. Exactly one `campaigns.isActive === true`.
7. Users with `status !== 'active'` cannot log in or be chosen as `to`.
8. After `campaign.exchangeDeadline`, users cannot create/edit/send/accept exchanges (admins can).

## Sample documents

```jsonc
// users
{
  "_id": "66f0…a1", "email": "admon12@example.com", "role": "user", "status": "active",
  "receptorNumber": "28012", "name": "Administración nº 12", "poblacion": "Alcalá de Henares",
  "provincia": "Madrid", "phone": "918 000 000", "contactName": "María", "mustChangePassword": false,
  "lastLoginAt": "2026-10-02T09:12:00Z", "lastSeenAt": "2026-10-02T09:40:00Z"
}

// exchanges  (A gives to B: 2 billetes of 12345 series 40–41, 1 décimo of 00007, 3 décimos of 54321)
{
  "_id": "66f1…c3", "campaign": "66e0…01", "from": "66f0…a1", "to": "66f0…b2", "status": "pending",
  "rows": [
    { "numero": "12345", "type": "billete", "quantity": 2, "amountDecimos": 20,
      "details": { "serieFrom": 40, "serieTo": 41 }, "signed": true },
    { "numero": "00007", "type": "decimo", "quantity": 1, "amountDecimos": 1,
      "details": { "serie": 3, "fraccion": 7 }, "signed": false },
    { "numero": "54321", "type": "decimos", "quantity": 3, "amountDecimos": 3,
      "details": { "items": [ { "serie": 10, "fraccion": 1 }, { "serie": 10, "fraccion": 2 }, { "serie": 12, "fraccion": 9 } ] },
      "signed": false }
  ],
  "totalDecimos": 24,            // → "2,4 billetes"
  "counterpart": "66f1…c4", "sentAt": "2026-10-02T10:00:00Z"
}
```

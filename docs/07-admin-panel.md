# 07 — Admin panel

Available to `admin` and `superadmin` under `/admin/*` (client) and `/api/admin/*` (server). Superadmin-only parts are marked 👑. Admins are also normal users (they have their own admon and exchanges).

## Pages

### `/admin` — Panel

Stat cards + charts from `GET /admin/stats?campaign=`:

```ts
AdminStats = {
    campaign: { _id, name, exchangeDeadline },
    users: { total, active, pending, blocked, admins, activeLast7Days, activeLast30Days },
    exchanges: { total, draft, pending, accepted, rejected, cancelled, bidirectionalPairs },
    decimos: { total, accepted },                       // sum of totalDecimos (live / accepted)
    envelopes: { toSend: number },                       // pending + accepted
    emails: { today, thisMonth, dailyCap: 100, monthlyCap: 3000 },
    lottery: { usersWithList, numbers },
    exchangesPerDay: { date: 'yyyy-MM-dd', created: number, accepted: number }[],   // last 60 days
    topGivers: { user: publicUser, decimos: number, envelopes: number }[],          // top 10
    topReceivers: { user: publicUser, decimos: number, envelopes: number }[],
    pendingPasswordRequests: number,
}
```

Layout: 4 stat cards per row (users, exchanges, billetes, sobres), a line chart (exchanges per day — an inline SVG component rather than the recharts-based shadcn chart, to keep the bundle small), two small tables (top givers / receivers), alert with pending password requests and a card with email budget usage (progress bars) plus activity counters.

`emails.today` sums the users' rolling-24 h verification counters; `emails.thisMonth` sums lifetime `verificationEmailsSent` of users emailed this month (docs/06: "exact enough"). `exchanges.bidirectionalPairs` counts live exchanges whose counterpart is also live, halved.

Campaign selector (top-right) lets admins look at past campaigns.

### `/admin/usuarios` — Usuarios

`DataTable` from `GET /admin/users`: Nº receptor, Administración, Población / Provincia, Email, Estado (badge), Rol, Intercambios (out/in), Última conexión (`formatRelative(lastSeenAt)` with tooltip exact time; `lastLoginAt` in the detail), Alta (`createdAt`). Filters: búsqueda, estado, rol; sort. Row actions: Ver, Activar/Bloquear (confirm), Establecer contraseña temporal, 👑 Hacer admin / Quitar admin.

### `/admin/usuarios/:id` — Detalle de usuario

- Header card: all `adminUser` fields, editable form (`PATCH /admin/users/:id`) to fix receptor number / name / población / provincia typos.
- Sessions: last login, last seen, "Cerrar todas las sesiones" (`POST /admin/users/:id/revoke-sessions`).
- Tabs: **Intercambios** (table of all their exchanges both directions, `GET /admin/users/:id/exchanges`, with status/direction, link to `/intercambios/:id` which admins can open thanks to the authorize bypass), **Lista de control** (same `ControlListTable` component as the user sees, with Descargar PDF / CSV using the admin endpoint), **Lotería** (count only; no need to list).
- Actions: Establecer contraseña temporal (dialog: generated password with copy button, or custom; shows "Comunícasela al usuario por teléfono"), Activar / Bloquear, 👑 cambiar rol.

### `/admin/solicitudes` — Solicitudes de contraseña

Table of `GET /admin/password-requests?status=pending` (default) with tabs Pendientes / Resueltas: usuario (receptor nº, nombre, email, teléfono), solicitado (`formatRelative`), acción "Establecer contraseña" (same dialog; resolves the request). Sidebar badge with pending count (from `/admin/stats` or a light `HEAD`-style count included in `GET /dashboard` for admins: `adminPendingRequests`).

### `/admin/campanas` 👑 — Campañas

List of campaigns (name, sorteo, deadline, active badge, exchange count). Create/edit dialog: nombre, fecha del sorteo, fecha límite, texto de la landing (textarea), código de barras esperado (día: Jueves/Sábado, jornada), activar (confirm: "Se desactivará la campaña actual; los intercambios existentes no se modifican"). Deactivating without activating another is blocked (there must always be one active once one exists).

## Endpoints

All listed in 04 under `/admin`.

Authorization matrix:

| Action                             | admin |         superadmin         |
| ---------------------------------- | :---: | :------------------------: |
| View stats / users / exchanges     |  ✅   |             ✅             |
| Edit user public data              |  ✅   |             ✅             |
| Activate / block user              |  ✅   |             ✅             |
| Set temporary password             |  ✅   |             ✅             |
| Edit / delete any exchange         |  ✅   |             ✅             |
| Download any control list          |  ✅   |             ✅             |
| Change roles (user ↔ admin)        |  ❌   |             ✅             |
| Create / edit / activate campaigns |  ❌   |             ✅             |
| Act on the superadmin account      |  ❌   | ❌ (self only via profile) |

## Superadmin bootstrap

`pnpm --filter @anapal/server seed`:

- Reads `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD`, `SUPERADMIN_RECEPTOR_NUMBER`; creates or updates the superadmin user (`status: 'active'`, `role: 'superadmin'`, name "ANAPAL").
- Creates a default campaign if none exists (name "Navidad <year>", `isActive: true`, deadline = Dec 1, draw = Dec 22) — editable later.
- `--demo` flag: adds 10 fake active admons (`receptorNumber` 10001–10010, real-looking provinces), a "Mi lotería" list of 12 numbers each (disjoint pools from a seeded PRNG, so the data is identical on every run) and 21 exchanges covering every status and pair situation for `admon10001`. Rows are always numbers from the sender's own list, so no envelope carries a number its receiver already has and no pair sends the same number both ways — the warnings of 03 §2 only appear when you add such a number yourself. Re-running wipes and recreates the demo exchanges and lists. Never run `--demo` against production.

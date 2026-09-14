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

Layout: 4 stat cards per row (users, exchanges, billetes, sobres), a line chart (exchanges per day, shadcn chart), two small tables (top givers / receivers), alert card with pending password requests and email budget usage (progress bar).

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

| Action                                   | admin | superadmin |
| ---------------------------------------- | :---: | :--------: |
| View stats / users / exchanges           |  ✅   |     ✅     |
| Edit user public data                    |  ✅   |     ✅     |
| Activate / block user                    |  ✅   |     ✅     |
| Set temporary password                   |  ✅   |     ✅     |
| Edit / delete any exchange               |  ✅   |     ✅     |
| Download any control list                |  ✅   |     ✅     |
| Change roles (user ↔ admin)              |  ❌   |     ✅     |
| Create / edit / activate campaigns       |  ❌   |     ✅     |
| Act on the superadmin account            |  ❌   |     ❌ (self only via profile) |

## Superadmin bootstrap

`pnpm --filter @anapal/server seed`:
- Reads `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD`, `SUPERADMIN_RECEPTOR_NUMBER`; creates or updates the superadmin user (`status: 'active'`, `role: 'superadmin'`, name "ANAPAL").
- Creates a default campaign if none exists (name "Navidad <year>", `isActive: true`, deadline = Dec 1, draw = Dec 22) — editable later.
- `--demo` flag: adds 10 fake active admons (`receptorNumber` 10001–10010, real-looking provinces) and a handful of exchanges in every status, plus lottery lists, to exercise the UI. Never run `--demo` against production.

# 05 — Client

Vite + React 19 + TypeScript. Spanish-only UI. shadcn components, lucide icons, sonner toasts, TanStack Query for server state, react-hook-form + zod (from `@anapal/shared`) for forms. Theme from `globals.css` (ANAPAL orange primary, light/dark via `.dark` class).

## Routes (`src/app/router.tsx`, declarative JSX like imprffctgames)

```tsx
<BrowserRouter>
    <Routes>
        <Route element={<PublicLayout />}>
            {' '}
            {/* header with logo + Entrar/Registro, footer */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegisterPage />} />
            <Route path="/verificar-email" element={<VerifyEmailPage />} /> {/* ?token= */}
            <Route path="/reenviar-verificacion" element={<ResendVerificationPage />} />
            <Route path="/olvide-contrasena" element={<ForgotPasswordPage />} />
            <Route path="/aviso-legal" element={<LegalPage />} />
        </Route>

        <Route element={<PrivateRoute />}>
            {' '}
            {/* redirects to /login with toast */}
            <Route element={<AppLayout />}>
                {' '}
                {/* shadcn Sidebar + header + <Outlet/> */}
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/perfil" element={<ProfilePage />} />
                <Route path="/intercambios" element={<ExchangesListPage />} />
                <Route path="/intercambios/nuevo" element={<ExchangeEditorPage mode="create" />} />
                <Route path="/intercambios/:id" element={<ExchangeDetailPage />} />
                <Route path="/intercambios/:id/editar" element={<ExchangeEditorPage mode="edit" />} />
                <Route path="/mi-loteria" element={<MyLotteryPage />} />
                <Route path="/lista-control" element={<ControlListPage />} />
                <Route element={<RoleRoute roles={['admin', 'superadmin']} />}>
                    <Route path="/admin" element={<AdminDashboardPage />} />
                    <Route path="/admin/usuarios" element={<AdminUsersPage />} />
                    <Route path="/admin/usuarios/:id" element={<AdminUserDetailPage />} />
                    <Route path="/admin/solicitudes" element={<AdminPasswordRequestsPage />} />
                    <Route element={<RoleRoute roles={['superadmin']} />}>
                        <Route path="/admin/campanas" element={<AdminCampaignsPage />} />
                    </Route>
                </Route>
            </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
    </Routes>
</BrowserRouter>
```

Logged-in users visiting `/login` or `/registro` are redirected to `/dashboard`.

## Folder structure

```
client/src/
├── main.tsx                      # createRoot, globals.css, QueryClientProvider, Toaster, App
├── app/
│   ├── App.tsx / router.tsx
│   ├── providers.tsx             # ThemeProvider (in-house, `components/theme-provider.tsx`), QueryClient, AuthProvider, Toaster
│   └── guards/{PrivateRoute,RoleRoute}.tsx
├── components/
│   ├── ui/                       # shadcn generated (button, input, card, dialog, sheet, sidebar, table, tabs, badge, select, checkbox, switch, dropdown-menu, form, sonner, skeleton, tooltip, command, popover, alert, separator, chart …)
│   ├── layout/{PublicLayout,AppLayout,AppSidebar,AppHeader,PageHeader,ThemeToggle}.tsx
│   └── common/{DataTable,EmptyState,ConfirmDialog,StatusBadge,DirectionBadge,UserCard,BilletesAmount,DateText,CopyButton}.tsx
├── features/
│   ├── auth/      {api.ts, hooks.ts, AuthProvider.tsx, components/LoginForm.tsx …}
│   ├── users/     {api.ts, hooks.ts, components/UserPicker.tsx, ProfileForm.tsx, ChangePasswordForm.tsx}
│   ├── campaigns/ {api.ts, hooks.ts, components/CampaignBanner.tsx}
│   ├── exchanges/ {api.ts, hooks.ts, components/ExchangeTable.tsx, ExchangeFilters.tsx, RowEditor.tsx, RowTable.tsx, RowTypeSelect.tsx, SeriesFields.tsx, DecimosItemsField.tsx, ExchangeTotals.tsx, InboxList.tsx, ExchangeActions.tsx}
│   ├── scanning/  {useBarcodeScanner.ts, CameraScannerDialog.tsx, ScannerStatus.tsx}
│   ├── lottery/   {api.ts, hooks.ts (incl. useLotteryCheck), components/{LotteryImportDialog,LotteryTable,AddNumberForm}.tsx}
│   ├── controlList/ {hooks.ts, components/ControlListTable.tsx, ControlListTotals.tsx}
│   ├── pdf/       {envelopePdf.ts, envelopeLayout.ts, sheetPdf.ts, controlListPdf.ts, merge.ts, PdfPreviewDialog.tsx, download.ts}
│   ├── dashboard/ {api.ts, hooks.ts, components/StatCard.tsx, LastExchangeCard.tsx, InstructionsCard.tsx}
│   └── admin/     {api.ts, hooks.ts, components/…}
├── hooks/{useDebounce,useMediaQuery,useDocumentTitle}.ts
├── lib/{api.ts (axios), queryClient.ts, format.ts (dates/numbers), messages.ts (re-export es map + resolve()), utils.ts (cn), constants.ts (provinces list, nav items)}
├── pages/                        # one file per route, thin: compose feature components
└── types/                        # client-only types (view models)
```

## Providers and auth state

- `AuthProvider` (`features/auth/AuthProvider.tsx`): on mount calls `GET /auth/me` (only if `localStorage.hasSession === 'true'`, as in reference); exposes `{ user, status: 'loading' | 'authenticated' | 'anonymous', login, logout, refetchMe }`. `login` → `POST /auth/login` → set `hasSession` → `navigate('/dashboard')`. `logout` → `POST /auth/logout` → clear query cache → `/login`.
- `lib/api.ts`: axios instance `baseURL = import.meta.env.VITE_API_URL ?? '/api'`, `withCredentials: true`. Response interceptor: on 401 (and not already a refresh/login/logout call) → single shared `refreshPromise = POST /auth/refresh` → retry original; if refresh fails → clear `hasSession`, `queryClient.clear()`, `window.location.assign('/login')`. Errors are normalised to `ApiClientError { status, code (i18n), message, errors }`.
- `lib/messages.ts`: `t(code)` → Spanish string from `@anapal/shared/messages/es`, falling back to "Ha ocurrido un error". Used in every toast.
- Query keys: `['me']`, `['campaign','active']`, `['users', params]`, `['exchanges', campaignId, params]`, `['exchanges', campaignId, 'inbox']`, `['exchange', id]`, `['control-list', campaignId]`, `['lottery', campaignId]`, `['dashboard', campaignId]`, `['admin', …]`. Mutations invalidate `['exchanges']`, `['exchange', id]`, `['dashboard']`, `['control-list']` together via a helper `invalidateExchangeData()`.

## Layout

- `AppLayout`: shadcn `SidebarProvider` + `AppSidebar` (collapsible to icons, `Sheet` on mobile) + `AppHeader` (breadcrumb/page title, campaign chip, theme toggle, user menu with Perfil / Cerrar sesión).
- Sidebar items (lucide icons): `LayoutDashboard` Inicio, `ArrowLeftRight` Intercambios (badge = pending inbox count), `Ticket` Mi lotería, `ClipboardList` Lista de control, `UserRound` Perfil; group "Administración" (admin+): `ShieldCheck` Panel, `Users` Usuarios, `KeyRound` Solicitudes, `CalendarRange` Campañas (superadmin). Footer: logo + version + campaign name.
- `PublicLayout`: minimal header (logo → `/`, Entrar, Registro) + footer (ANAPAL, aviso legal).
- `PageHeader`: title, description, right-side actions slot. Every private page uses it.

## Pages

### Landing `/`

Hero with `logotipo.png`, campaign name, `drawDate` and `exchangeDeadline` (`formatDate`), countdown to the deadline, `landingText` rendered as paragraphs, "Cómo funciona" 3-step cards (Registra tu administración → Crea intercambios → Imprime sobres y lista de control), CTA buttons Entrar / Registrarse. If no active campaign: "Próximamente".

### Login / Registro / Verificar email / Reenviar verificación / Olvidé mi contraseña

Card forms (RHF + zod). Registro fields: email, contraseña (+ confirmación), nº de receptor, nombre de la administración, población, provincia (`Select` with provinces + "Otra"), dirección, teléfono, persona de contacto. After registro: "Te hemos enviado un email para verificar tu cuenta" + link to reenviar. Verificar: reads `?token=`, calls API, shows result + "Ir a entrar". Olvidé contraseña: email input → always success message "Un administrador se pondrá en contacto contigo para asignarte una contraseña temporal".

### Dashboard `/dashboard`

- `CampaignBanner`: name, sorteo date, deadline (red when < 7 days, "Plazo cerrado" when past).
- `mustChangePassword` alert → link to `/perfil`.
- Stat cards (2×4 grid, stack on mobile): Sobres a enviar, Sobres a recibir, Billetes que doy (`formatBilletes(decimosOut)`), Billetes que recibo, Pendientes en bandeja (highlight when > 0), Intercambios aceptados, Borradores, Números en mi lotería.
- `LastExchangeCard`: counterpart, direction badge, status badge, total, "Ver".
- `QuickActions`: Nuevo intercambio, Ver bandeja, Importar lotería, Descargar sobres, Lista de control.
- "Instrucciones" collapsible with the same 3 steps as landing + scanning tips.

### Perfil `/perfil`

Two cards: Datos públicos (`ProfileForm`, note "Estos datos los verán otras administraciones y se imprimen en los sobres"; receptor number read-only with hint to contact an admin) and Cambiar contraseña (`ChangePasswordForm`, highlighted when `mustChangePassword`).

### Intercambios `/intercambios`

- Tabs: **Enviados** (`direction=out`), **Recibidos** (`direction=in`), **Bandeja** (inbox, pending only, unread dot).
- Filters row: search (`q`, debounced), status `Select`, sort. URL-synced via `useSearchParams`.
- `ExchangeTable` columns: Administración (receptor nº + name + población), Dirección (`DirectionBadge` Da/Recibe/Ambos), Estado (`StatusBadge`), Filas, Billetes, Firmados (count), Actualizado (`dd/MM/yyyy HH:mm`), Acciones (`DropdownMenu`: Ver, Editar, Enviar, PDF, Descargar, Eliminar / for received: Ver, Aceptar, Rechazar).
- Header actions: "Nuevo intercambio", "Descargar todos los sobres" (merged PDF, only outgoing pending/accepted).
- Mobile: cards instead of table (`useMediaQuery`).

### Nuevo / Editar `/intercambios/nuevo`, `/intercambios/:id/editar`

Single page, two sections:

1. **Destinatario** — `UserPicker` (`Command` popover: search by receptor nº / name / población via `GET /users?q=`), shows `UserCard` once picked; in edit mode read-only. Warning if an exchange with that user already exists (409 → link to it). Shows reverse-direction info: "Esta administración ya te envía un sobre (aceptado)" when `counterpart` exists.
2. **Lotería** — `RowTable` (editable rows) + `RowEditor` (inline form at the bottom or dialog on mobile):
    - `RowTypeSelect` (segmented: Billete / 1 décimo / Varios décimos). Type is sticky between rows.
    - Fields by type: número (5-digit masked input, auto-pad on blur), cantidad (hidden for `decimo`; auto for `billete` when series given; auto for `decimos` when items given), `SeriesFields` (serie desde / hasta) for billete, serie + fracción for decimo, `DecimosItemsField` (chips list of `serie/fracción` with add/remove) for decimos, `Checkbox` Firmado, nota.
    - Inline validation from `validateRow`; lottery warnings (amber) from `useLotteryCheck`.
    - `ScannerStatus`: "Escáner conectado — escanea un décimo" (keyboard wedge always listening while editor is open) + button "Cámara" opening `CameraScannerDialog`. Scans go through `mergeScanIntoRow`; events drive toasts ("Serie inicial 35", "Rango 35–74 · 40 billetes", "Décimo añadido (3)", "Ya escaneado", "Nuevo número detectado").
    - `ExchangeTotals` footer: filas, décimos, **billetes** (bold, primary), firmados.
    - Sticky bottom bar: Guardar borrador · Guardar y enviar (create) / Guardar cambios (edit; warns "El destinatario tendrá que aceptar de nuevo" when status is accepted).

- Row state is local (`RowDraft[]` + the row being edited) rather than RHF `useFieldArray`: rows are added through a sub-editor and Phase 6's scanner pushes into the same state. `validateRow` from shared drives the inline errors, which appear as soon as the número has 5 digits so a disabled "Añadir fila" always explains itself.
- No `sessionStorage` autosave and no `useBlocker`: drafts live on the server ("Guardar borrador"), which is the real recovery mechanism, and `useBlocker` needs a data router.

### Detalle `/intercambios/:id`

Header: counterpart `UserCard`, direction + status badges, dates. Read-only rows table with totals. Note. Actions by role/status (from 03 §3): owner → Editar, Enviar, Cancelar, Eliminar, Vista previa PDF, Descargar PDF; receiver + pending → Aceptar / Rechazar (dialog with optional motivo). If a reverse exchange exists: card "Intercambio de vuelta" linking to it. Opening as receiver marks it seen.

### Mi lotería `/mi-loteria`

`PageHeader` actions: Importar (dialog with dropzone + textarea paste + preview table + "Importar N números"), Añadir número (inline form), Vaciar lista (confirm). `LotteryTable`: número, series (ranges as "35–74, 80"), origen, eliminar. Count + hint "Se usará para avisarte si añades un número que no tienes".

### Lista de control `/lista-control`

`ControlListTotals` cards (sobres a enviar / a recibir, billetes doy / recibo, borradores pendientes). `ControlListTable`: Nº receptor, Administración, Población, Provincia, Doy (billetes + estado), Recibo (billetes + estado), Dirección. Actions: Descargar PDF, Descargar CSV, Descargar todos los sobres (with "Solo sobres" switch).

### Admin pages — see 07.

### 404

Logo, "Página no encontrada", link to `/` or `/dashboard`.

## Forms and validation

- Every form: `useForm({ resolver: zodResolver(schema) })` with shadcn `Form` primitives; server 400 `validation.failed` issues are mapped back with `setError(path, ...)`; other errors → `toast.error(t(code))`.
- Mutations: `toast.promise` for save/send/accept; `ConfirmDialog` for destructive actions.
- Number inputs use `inputMode="numeric"`; número input pads to 5 digits on blur.

## Spanish formats (`lib/format.ts`)

```ts
export const formatDate = (d) => format(d, 'dd/MM/yyyy', { locale: es });
export const formatDateTime = (d) => format(d, 'dd/MM/yyyy HH:mm', { locale: es });
export const formatRelative = (d) => formatDistanceToNow(d, { locale: es, addSuffix: true }); // "hace 3 días"
export const formatInt = (n) => new Intl.NumberFormat('es-ES').format(n);
export { formatBilletes } from '@anapal/shared/lottery/amounts';
```

`<html lang="es">`, `document.title` = "<Página> · Intercambios ANAPAL".

## Scanning UX details

- `useBarcodeScanner` is mounted only by `RowEditor` (always enabled there); it skips bursts while a `[role="dialog"]` other than the camera one (`data-scanner-dialog`) is open, so the `UserPicker` popover and confirm dialogs are safe.
- Camera dialog (`CameraScannerDialog`, lazy-loaded) requests permission lazily; shows the error inside the preview if denied. Works on iOS Safari (uses `playsInline`). Camera `Select` appears only when more than one `videoinput` is enumerated; "Modo continuo" `Switch` keeps it open and shows a reads counter with the last decoded line.
- A decoded scan always shows a toast whose description is `numero · serie X · fracción Y` so the user can verify what was read; the title is the scan event ("Serie inicial 35…", "Rango 35–74 · 40 billetes", "Décimo añadido (3)", "Ya has escaneado este décimo", "Nuevo número detectado: 99999"). Campaign mismatch adds a separate warning toast.
- `RowEditor`'s `onCommit` returns a boolean so a scan of a different número never drops the current row silently.

## PWA / assets

- `client/public/`: `favicon.ico`, `logotipo.png`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `sobre-template.pdf`, `manifest.webmanifest`.
- `index.html`: `<link rel="manifest">`, `apple-touch-icon`, `theme-color #ff660d`. No service worker in v1 (avoid stale API caching); revisit later.

## Accessibility & responsiveness

- All tables have a card fallback under `md`. Sidebar collapses to a sheet. Row editor becomes a full-screen dialog on mobile with the camera button prominent.
- Buttons have `aria-label`s where icon-only. Focus rings from shadcn theme (`--ring` orange).

# Intercambios ANAPAL

Aplicación web para que las administraciones de lotería gestionen el intercambio anual de lotería de ANAPAL: quién intercambia con quién, qué números van en cada sobre, impresión de sobres y lista de control.

> Especificación completa en [`docs/`](docs/00-README.md). Estado por fases en [`docs/08-roadmap.md`](docs/08-roadmap.md).

## Cómo funciona el intercambio

1. **Cada administración se registra** con su nº de receptor, nombre y población, y verifica el email (único correo que envía la aplicación).
2. **Crea un intercambio** eligiendo la administración destinataria y añadiendo la lotería que le da: una fila por número, de tipo _billete_ (10 décimos por serie, con rango de series opcional), _1 décimo_ (serie y fracción) o _varios décimos_ del mismo número. Las filas se añaden a mano, con un **escáner de códigos de barras** (USB/Bluetooth) o con la **cámara del móvil**. Si la administración ha importado su lista de números ("Mi lotería"), la app avisa cuando añade un número que no tiene.
3. **Lo envía**; la otra administración lo ve en su bandeja y lo **acepta o rechaza**. Si esa administración crea a su vez un intercambio de vuelta, el par pasa a ser **bidireccional** ("Ambos").
4. **Imprime los sobres** (plantilla de ANAPAL con destinatario y remitente) y la **hoja de intercambio**, de uno en uno o todos en un solo PDF, y lleva la **lista de control** (sobres que envía, sobres que recibe, billetes que da y recibe) en pantalla, PDF o CSV.
5. Pasada la **fecha límite** de la campaña no se pueden crear ni modificar intercambios (los administradores sí). Los PDFs y la lista de control siguen disponibles.

Los administradores (ANAPAL) tienen un panel con estadísticas, la lista de usuarios, la gestión de contraseñas (no hay email de recuperación: el usuario la solicita y un administrador le asigna una temporal) y, el superadministrador, las campañas.

## Stack

- **Monorepo** pnpm workspaces:
    - [`shared`](shared): esquemas zod, tipos de la API, mensajes en español y toda la lógica pura de lotería (validación de filas, series, decodificador de códigos de barras, lista de control). Tests con vitest.
    - [`client`](client): Vite + React 19 + Tailwind 4 + shadcn/ui, TanStack Query, react-hook-form. PDFs generados en el navegador con `pdf-lib`; cámara con `BarcodeDetector` y `@zxing/browser`.
    - [`server`](server): Express 5 + Mongoose 8, JWT de acceso (15 min) + refresh tokens rotatorios en cookies `HttpOnly`, Resend para el email de verificación.
- Despliegue en **Vercel** (dos proyectos: client y server) y **MongoDB Atlas**.

## Desarrollo local

Requisitos: Node ≥ 22, pnpm 12 (`corepack enable`), MongoDB en `localhost:27017` (o una URL de Atlas).

```bash
pnpm install
cp server/.env.dist server/.env     # rellena SUPERADMIN_* y los secretos
cp client/.env.dist client/.env
pnpm --filter @anapal/server seed --demo   # superadmin + campaña + 10 admons de prueba (contraseña Demo1234)
pnpm dev                                    # client http://localhost:5173, API http://localhost:8000/api
```

Usuarios de prueba: `admon10001@example.com` … `admon10010@example.com` / `Demo1234`. Sin `RESEND_API_KEY` los emails se imprimen en la consola del servidor.

Scripts desde la raíz: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format`.

## Variables de entorno

### `server/.env`

| Variable                                              | Descripción                                                                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `PORT`                                                | Puerto local (Vercel lo ignora).                                                                                         |
| `IS_PRODUCTION`                                       | `true` en producción: cookies `Secure` (y `SameSite=None` sin `COOKIE_DOMAIN`), sin datos demo.                          |
| `CLIENT_URL`                                          | URL pública del cliente (sin `/` final); enlaces de los emails y origen CORS permitido.                                  |
| `COOKIE_DOMAIN`                                       | Solo si cliente y API comparten dominio propio (p. ej. `.anapal.es`; cookies `Lax`); vacío en local y en `*.vercel.app`. |
| `MONGO_URL`                                           | Cadena de conexión de MongoDB / Atlas.                                                                                   |
| `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`         | Secretos JWT / HMAC (mín. 32 caracteres aleatorios cada uno).                                                            |
| `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL_DAYS`          | Vida del token de acceso (`15m`) y del refresh (`30` días).                                                              |
| `EMAIL_CONFIRMATION_SECRET`, `…_TTL`                  | Firma y caducidad (`24h`) del enlace de verificación.                                                                    |
| `RESEND_API_KEY`, `EMAIL_FROM`                        | Resend. `EMAIL_FROM` debe ser de un dominio verificado en Resend.                                                        |
| `SUPERADMIN_EMAIL`, `…_PASSWORD`, `…_RECEPTOR_NUMBER` | Cuenta que crea `pnpm seed`.                                                                                             |

### `client/.env`

| Variable       | Descripción                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL` | URL completa de la API: `http://localhost:8000/api` en local, `https://<server>.vercel.app/api` en Vercel. |

## Despliegue

1. **MongoDB Atlas**: crea un clúster y un usuario de base de datos. En _Network Access_ permite `0.0.0.0/0` (las funciones de Vercel no tienen IP fija) o usa la integración Atlas–Vercel.
2. **Proyecto Vercel `server`**: importa el repositorio con _Root Directory_ `server`, _Install Command_ `pnpm install --frozen-lockfile` y _Build Command_ `pnpm build` (activa "Include source files outside of the Root Directory" para que compile `shared`). Añade todas las variables de `server/.env.dist` con `IS_PRODUCTION=true` y `CLIENT_URL` = URL del cliente. Comprueba `https://<server>.vercel.app/api/health`.
3. **Proyecto Vercel `client`**: _Root Directory_ `client`, _Output Directory_ `dist`. Variable `VITE_API_URL=https://<server>.vercel.app/api` (se incrusta en el build: tras cambiarla hay que redesplegar). El cliente llama a la API directamente; el servidor acepta CORS solo desde `CLIENT_URL`.
4. **Resend**: verifica el dominio de envío y pon ese remitente en `EMAIL_FROM`.
5. **Seed de producción**: con `MONGO_URL` apuntando a Atlas y las variables `SUPERADMIN_*` definidas, ejecuta `pnpm --filter @anapal/server seed` (**sin** `--demo`). Crea el superadministrador y una campaña "Navidad <año>" activa que puedes editar desde `/admin/campanas`.

### Migración de datos de la versión anterior

Los datos de la app antigua (Supabase) se importan una sola vez, **después** del seed y **antes** de abrir el registro:

```bash
pnpm --filter @anapal/server import-legacy -- ruta/al/db_cluster-....backup --dry-run   # solo informe
pnpm --filter @anapal/server import-legacy -- ruta/al/db_cluster-....backup             # importa
```

El script acepta el backup de Supabase (`.backup` o `.backup.gz`) y es idempotente. Importa los usuarios con su misma contraseña, guarda **todos** los registros antiguos en el histórico (visible en `/historico`) y convierte a intercambios de la nueva versión los que tienen a la otra administración registrada (detalles en [docs/02](docs/02-data-model.md#migración-desde-la-app-anterior)). Al terminar imprime un informe: revisa desde Admin › Usuarios las cuentas sin datos de remitente o con nº de receptor repetido (reciben un nº provisional `9xxxxx`).

Cada nueva campaña se crea desde el panel (👑 Campañas): al activarla se desactiva la anterior y sus intercambios quedan consultables con el selector de campaña.

### Límites a tener en cuenta

- **Emails**: plan gratuito de Resend, 100/día y 3000/mes. Solo se envía el email de verificación (máx. 3 por usuario cada 24 h; el servidor deja de enviar al llegar a 90 en un día). El panel muestra el consumo.
- **Cookies**: con cliente y API en dominios `*.vercel.app` distintos las cookies de sesión son de terceros (`SameSite=None; Secure`). Safari (y cualquier navegador que bloquee cookies de terceros) no las envía, así que la sesión no se mantiene ahí. Para evitarlo: dominio propio compartido (`app.` + `api.` con `COOKIE_DOMAIN`).
- **Arranque en frío**: la conexión a Mongo se cachea entre invocaciones; la primera petición tras un rato puede tardar 1–2 s.
- **PDFs** se generan en el navegador: para muchos sobres (> 100) en móviles antiguos puede tardar unos segundos.

## Comprobación tras desplegar

- [ ] `GET /api/health` responde y `Set-Cookie` del login lleva `HttpOnly; Secure; SameSite=None` (`Lax` si hay `COOKIE_DOMAIN`).
- [ ] Registro → email de verificación recibido → verificar → entrar. Recargar mantiene la sesión; tras 15 min sigue funcionando (refresh transparente); cerrar sesión redirige a `/login`.
- [ ] Con dos administraciones de prueba: A crea un intercambio con B y lo envía; B lo ve en su bandeja y lo acepta; B crea uno de vuelta y ambos ven "Ambos".
- [ ] Vista previa e impresión de un sobre: el texto cae en las casillas de la plantilla (imprimir sin "ajustar a la página").
- [ ] "Descargar todos los sobres" y la lista de control (PDF y CSV; el CSV abre bien en Excel).
- [ ] Un usuario pide "Olvidé mi contraseña" → aparece en `/admin/solicitudes` → el administrador establece una temporal → el usuario entra y debe cambiarla.
- [ ] Bloquear un usuario le cierra la sesión; desbloquearlo la restaura.
- [ ] Adelantar la fecha límite de la campaña bloquea crear/editar/enviar para usuarios (banner "El plazo de intercambio terminó") pero no para administradores.
- [ ] Un usuario sin rol de administrador que entra en `/admin` es redirigido y la API responde 403.
- [ ] No hay datos `--demo` en producción y el superadministrador puede entrar.

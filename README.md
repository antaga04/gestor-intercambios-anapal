# Intercambios ANAPAL

Aplicación web para que las administraciones de lotería gestionen el intercambio anual de lotería de ANAPAL: quién intercambia con quién, qué números van en cada sobre, impresión de sobres y lista de control.

> Especificación completa en [`docs/`](docs/00-README.md).

## Stack

- **Monorepo** pnpm workspaces: [`shared`](shared) (esquemas zod, tipos, lógica de lotería), [`client`](client) (Vite + React 19 + Tailwind 4 + shadcn), [`server`](server) (Express 5 + Mongoose 8).
- Despliegue en Vercel (client y server) y MongoDB Atlas.

## Desarrollo local

```bash
pnpm install
cp server/.env.dist server/.env
cp client/.env.dist client/.env
pnpm dev          # client http://localhost:5173 (proxy /api → :8000), server http://localhost:8000
```

Otros scripts (desde la raíz): `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format`.

## Variables de entorno

Ver `server/.env.dist` y `client/.env.dist`.

## Despliegue

Ver [`docs/01-architecture-and-stack.md`](docs/01-architecture-and-stack.md) y la fase 10 de [`docs/08-roadmap.md`](docs/08-roadmap.md).

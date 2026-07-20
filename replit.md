# AL Retention Dashboard

React dashboard for the retention pipeline. Proxies API calls to an external FastAPI backend via the Express api-server.

## Run & Operate

- `pnpm --filter @workspace/retention-dashboard run dev` — Vite dev server (port from `PORT` env)
- `pnpm --filter @workspace/api-server run dev` — Express proxy server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- Required env (set by Replit artifacts): `PORT`, `BASE_PATH` for the dashboard; `DATABASE_URL` optional (no tables yet)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19, Vite 7, Tailwind 4, Recharts, TanStack Query
- API proxy: Express 5 (forwards `/api/fastapi-proxy/*` to upstream FastAPI)
- Backend: external FastAPI retention API (configure URL in Settings page)

## Deployment

1. Push to GitHub (`origin` → Replit syncs automatically)
2. Replit builds both artifacts: retention-dashboard (static) + api-server (Node)
3. In the dashboard **Config** page, set the FastAPI base URL (e.g. your Render deployment)

## Architecture

- Browser → Vite/static dashboard → `/api/fastapi-proxy/*` → Express → FastAPI
- FastAPI URL stored in `localStorage` (`retention_api_url`); passed as `X-Target-Url` header or `_target` query param
- Chart images use `_target` query param since `<img>` cannot set headers

## Gotchas

- `pnpm-workspace.yaml` has linux-x64 platform overrides for Replit — do not remove for deployment
- Vite config requires `PORT` and `BASE_PATH` env vars (Replit sets these via artifact.toml)
- post-merge runs `pnpm install --frozen-lockfile` then optional DB push

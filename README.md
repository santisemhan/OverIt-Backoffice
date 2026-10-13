# Over It · Back Office

Internal tool for the Over It team: **Trackeo** (downloads, onboarding, subscriptions, users, app usage),
**Moderación** (community, reports, Ninety, audit log) and **Contenido** (daily challenges, breathing exercises,
articles, phrases, facts). Talks to `OverIt-Backend` through its `/api/dashboard/*` and back office endpoints.

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · TanStack Query v5 · ESLint · Prettier.

## Setup

Requires Node.js 20.9+.

```bash
npm install
cp .env.example .env.local   # then adjust if needed
npm run dev                  # http://localhost:3000
```

| Script              | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Dev server on port 3000                         |
| `npm run build`     | Production build                                |
| `npm run start`     | Serve the production build                      |
| `npm run lint`      | ESLint (`eslint-config-next` + Prettier compat) |
| `npm run typecheck` | Generates route types and runs `tsc --noEmit`   |
| `npm run format`    | Prettier (with Tailwind class sorting)          |

## Environment

| Variable                   | Example                  | Notes                              |
| -------------------------- | ------------------------ | ---------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | `https://localhost:5000` | OverIt-Backend base URL, no slash. |

The backend's `launchSettings.json` exposes **https on 5000** and **http on 5001**. If the local dev certificate is
not trusted by your browser, either run `dotnet dev-certs https --trust` or point the app to
`http://localhost:5001`.

### Backend requirements

- **CORS:** the back office origin must be listed in `Dashboard:AllowedOrigins` of the backend configuration
  (`http://localhost:3000` locally, the Vercel domain in production). Otherwise every request fails in the browser.
- **Login:** `POST /api/dashboard/auth/admin/login` with `{ email, password }` returns
  `{ accessToken, expiresAtUtc, role, subjectId, displayName, email }`. Only `role: "Admin"` is accepted.

## Auth

- The session is stored in the `overit.backoffice.session` cookie (`SameSite=Lax`, `Secure` on https) and expires
  at `expiresAtUtc`. It is not `HttpOnly` because the client sends the token as a bearer header.
- Everything under `src/app/(app)` is guarded client-side (`useRequireAdmin`): without an Admin session you are sent
  to `/login?next=…`. Any API `401` clears the session, which sends you back to login. The API authorises every
  request on its own; the guard is a convenience, not the security boundary.

## Local test data (local only)

To try every screen against a throwaway database, the backend repo ships
`scripts/local-seed/seed-local-only.mjs`. It writes fake users (onboarding, subscriptions in every state, a
complimentary grant), community posts/comments/reports, feedback, Ninety message counts, assigned challenges, content in
the 5 collections and, optionally, RevenueCat charges in several currencies (plus a refund and a sandbox purchase).
**Never run it against a shared, staging or production database.**

```bash
# 1. Throwaway Postgres
docker run -d --name overit-local-pg -e POSTGRES_USER=overit -e POSTGRES_PASSWORD=local_only \
  -e POSTGRES_DB=OverItLocal -p 55432:5432 postgres:16

# 2. Backend (from OverIt-Backend): migrations apply on start
ConnectionStrings__DefaultConnection="Host=localhost;Port=55432;Database=OverItLocal;Username=overit;Password=local_only;" \
RevenueCat__WebhookSharedSecret=local-webhook-secret ASPNETCORE_ENVIRONMENT=Local \
dotnet run --project src/OverIt.API --no-launch-profile --urls http://localhost:5001

# 3. Seed (from OverIt-Backend, with the API running)
SEED_PG_CONTAINER=overit-local-pg SEED_PG_DB=OverItLocal SEED_API_URL=http://localhost:5001 \
SEED_WEBHOOK_SECRET=local-webhook-secret node scripts/local-seed/seed-local-only.mjs

# 4. Back office
NEXT_PUBLIC_API_BASE_URL=http://localhost:5001 npm run dev
```

Log in as `admin@local.test`. The admin password is generated on the first run and saved to
`scripts/local-seed/.admin-password.local` in the backend repo (gitignored), or set your own with
`SEED_ADMIN_PASSWORD`. The script expects an empty database: to start over, drop the container
(`docker rm -f overit-local-pg`) and repeat.

## Deploy (Vercel)

1. Import the repository in Vercel (framework preset **Next.js**, defaults for build and output).
2. Set `NEXT_PUBLIC_API_BASE_URL` for Production and Preview.
3. Add the deployment domain(s) to `Dashboard:AllowedOrigins` in the backend.

No `vercel.json` is needed. Pages are marked `noindex`.

## Structure

```
src/
  app/
    layout.tsx               Root: fonts (next/font/local), metadata, AuthProvider
    globals.css              Tailwind v4 + design tokens (@theme) + utilities (press, skeleton, tnum…)
    login/                   Admin login
    (app)/                   Authenticated area (AuthGate + AppShell)
      trackeo/ moderacion/ contenido/   One folder per section
  components/
    AuthProvider.tsx         Session (cookie) + QueryClient + toasts; useAuth, useRequireAdmin
    Logo.tsx                 Wordmark and the brand star pattern
    shell/                   Sidebar, mobile top bar/drawer, ⌘K palette, Trackeo filter bar
    ui/                      Design system primitives (see below)
  fonts/                     Satoshi, Isidora
  lib/
    api.ts                   Typed fetch, ApiError, describeError
    session.ts               Cookie session + external store for useSyncExternalStore
    queries.ts mutations.ts  React Query hooks (one per endpoint)
    nav.ts                   Areas → groups → sections (single source of navigation)
    filters.ts               Trackeo filters in the URL (periodo, pais, idioma)
    format.ts                es-AR numbers, percentages, dates
    tones.ts cx.ts a11y.ts prefs.ts
public/
  brand/                     App icon, logo, star pattern
  screens/                   App screenshots (393×852) used as thumbnails
```

### Adding a section

1. Add it to `AREAS` in `src/lib/nav.ts` (area, group, id, label, icon, hint, optional badge).
2. Create `src/app/(app)/<area>/<id>/page.tsx`.

The sidebar, the mobile bar, the ⌘K palette and the tab title pick it up automatically.

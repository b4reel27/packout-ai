# PackOut AI

Mobile-first restoration field estimator focused on **scan → review → quote**.

## What changed in this bundle
- mobile command-center home screen
- manual entry flow redesigned for phone use
- job list/detail/pricing/export pages rebuilt with larger tap targets
- new **Scan Room** page and API route for AI groundwork
- pricing profiles now seed from the default price-book automatically
- job creation normalizes item keys and can auto-run the estimate
- missing package scripts fixed for both web and api apps

## Current AI status
This build includes a **mock AI scan pipeline** so the field workflow is ready now:
- `POST /ai/scan-room`
- accepts room hint, notes, and photo file names
- returns estimate-ready items with normalized keys and a preview total

It is intentionally provider-agnostic right now. That means the flow is built without locking you into one model vendor yet.

## Start it up
At repo root:
```bash
npm install
```

API:
```bash
cd apps/api
npm install
npm run dev
```

Web:
```bash
cd apps/web
npm install
npm run dev
```

Create `apps/web/.env.local` with:
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Main routes
- `/` command center
- `/scan` scan room groundwork
- `/jobs` jobs list
- `/jobs/new` manual entry
- `/settings/pricing` pricing editor

## Main API flow
- `GET /health`
- `POST /companies`
- `POST /pricing-profiles`
- `POST /jobs`
- `POST /estimates/:jobId/run`
- `POST /ai/scan-room`
- `POST /exports/:jobId/:exporter`

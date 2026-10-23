# GeoTrace: Waypoint and Trip Logger PWA

Read the portfolio-root `CLAUDE.md` first for global rules. This file is the brief for this project.

## What it is
Record a trip with live GPS, watch the polyline draw on a map, drop waypoints with notes and photos, see an elevation profile and export to GPX or KML for other mapping tools.

## Stack
React, Vite, TypeScript strict, Tailwind CSS, Leaflet + react-leaflet with OpenStreetMap tiles, Geolocation API (`watchPosition`), IndexedDB (Dexie), Recharts, vite-plugin-pwa. No Mapbox. Hosted on Netlify. No Supabase, no Vercel, no Gemini/OpenAI.

## MVP (build first)
1. Start/pause/stop a trip: `watchPosition` points saved to IndexedDB, live polyline on the Leaflet map, distance and duration.
2. Waypoints: drop a pin at current location or on tap, with note and photo attachment.
3. Trip history with elevation chart and GPX/KML export (hand-built serialisers with tests).

## Phase 2
Offline map tile caching for a chosen area, Import GPX, Speed and pace stats, Optional Neon sync.

## Data model (put in `types/`)
```ts
export interface Trip { id: string; name: string; startedAt: string; endedAt: string | null; distanceM: number }
export interface TrackPoint { tripId: string; ts: number; lat: number; lng: number; altM: number | null; accuracyM: number }
export interface Waypoint { id: string; tripId: string; lat: number; lng: number; note: string; photo: Blob | null; createdAt: string }
```

## Rules specific to this project
- Browsers throttle background geolocation: be honest in the README that tracking works best with the screen on; use the Screen Wake Lock API while recording.
- Filter out low-accuracy points (e.g. accuracy over 50 m) and apply a minimum movement threshold.
- Map components are client-only and must handle resize/invalidateSize.
- Seed 2-3 realistic recorded trips (GPX-derived) so history is not empty.
- Haversine distance and GPX/KML output are pure functions with unit tests.
- Seed realistic demo data so the app looks alive on first load without sign-up.

## Start here
1. Scaffold Vite + Tailwind + Dexie + Leaflet + vite-plugin-pwa, commit.
2. Write geo maths and GPX/KML serialisers with tests first.
3. Work through `PLAN.md` from step 2.

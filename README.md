# GeoTrace

Trip logger PWA that records GPS routes, drops photo waypoints and exports GPX/KML.

## Planned features
- Start/pause/stop a trip: `watchPosition` points saved to IndexedDB, live polyline on the Leaflet map, distance and duration.
- Waypoints: drop a pin at current location or on tap, with note and photo attachment.
- Trip history with elevation chart and GPX/KML export (hand-built serialisers with tests).

### Phase 2
- Offline map tile caching for a chosen area
- Import GPX
- Speed and pace stats
- Optional Neon sync

## Stack
React, Vite, TypeScript strict, Tailwind CSS, Leaflet + react-leaflet with OpenStreetMap tiles, Geolocation API (`watchPosition`), IndexedDB (Dexie), Recharts, vite-plugin-pwa. No Mapbox, Netlify

## Live demo
Live demo: TBD

## Run locally
Run locally: TBD

## Status
Not started

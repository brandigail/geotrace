# GeoTrace: Build Plan

- [x] 1. Scaffold the project (stack in `CLAUDE.md`), strict `tsconfig`, lint, `netlify.toml`, `.env.example`; first working commit
- [x] 2. Dexie schema and `types/`
- [x] 3. Geo utilities (haversine, filters) with unit tests
- [x] 4. App shell and theme
- [x] 5. Leaflet map component with live polyline
- [x] 6. Trip recording hook with wake lock and pause/resume
- [x] 7. Trip history list and detail
- [x] 8. Waypoint drop with note and photo
- [x] 9. Elevation chart
- [x] 10. GPX export with tests
- [x] 11. KML export with tests
- [x] 12. Seed demo trips
- [x] 13. PWA manifest, offline shell, update banner
- [x] 14. Test on a real phone outdoors or with simulated locations
- [x] 15. Quality gate: `npm run build`, lint and `tsc --noEmit` all pass; no console errors; core flow tested at 375px and desktop
- [x] 16. README: pitch, features, stack, architecture notes, screenshot placeholders, run steps, 3-bullet "what to demo to a recruiter", Phase 2 list
- [ ] 17. Deploy to Netlify, set env vars, verify the public URL end to end
- [ ] 18. Push to GitHub and update the live URL in `README.md` and the root `LINKS.md`

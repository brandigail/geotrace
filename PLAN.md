# GeoTrace: Build Plan

- [ ] 1. Scaffold the project (stack in `CLAUDE.md`), strict `tsconfig`, lint, `netlify.toml`, `.env.example`; first working commit
- [ ] 2. Dexie schema and `types/`
- [ ] 3. Geo utilities (haversine, filters) with unit tests
- [ ] 4. App shell and theme
- [ ] 5. Leaflet map component with live polyline
- [ ] 6. Trip recording hook with wake lock and pause/resume
- [ ] 7. Trip history list and detail
- [ ] 8. Waypoint drop with note and photo
- [ ] 9. Elevation chart
- [ ] 10. GPX export with tests
- [ ] 11. KML export with tests
- [ ] 12. Seed demo trips
- [ ] 13. PWA manifest, offline shell, update banner
- [ ] 14. Test on a real phone outdoors or with simulated locations
- [ ] 15. Quality gate: `npm run build`, lint and `tsc --noEmit` all pass; no console errors; core flow tested at 375px and desktop
- [ ] 16. README: pitch, features, stack, architecture notes, screenshot placeholders, run steps, 3-bullet "what to demo to a recruiter", Phase 2 list
- [ ] 17. Deploy to Netlify, set env vars, verify the public URL end to end
- [ ] 18. Push to GitHub and update the live URL in `README.md` and the root `LINKS.md`

# Root Cleanup Report

Date: 2026-06-08

## Summary

The repository root was reorganized for portfolio readability.

## Moved Into Folders

- Phase and audit reports: `docs/reports/`
- Setup and infrastructure guides: `docs/guides/`
- Screenshots: `docs/assets/screenshots/`
- Startup/admin helper scripts: `scripts/`
- Manual test scripts: `tests/manual/`

## Left In Root Intentionally

- `README.md`
- `package.json`
- `package-lock.json`
- `vite.config.js`
- `docker-compose.yml`
- `Dockerfile`
- Firebase and Firestore config files
- frontend build config files

These remain in root because common tooling expects them there.

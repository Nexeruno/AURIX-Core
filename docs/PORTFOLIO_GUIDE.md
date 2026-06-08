# Portfolio Guide

## One-Minute Pitch

Evidence v Datech / AURIX Core is a full-stack finance and ML observability demo. It combines a React finance app, an Electron admin console, Firebase services, a Python ML runtime, and local runtime orchestration.

## What To Show In An Interview

1. Main finance dashboard and expense/income tracking.
2. AURIX Core desktop admin console.
3. ML predictions and L2 shadow prediction workflow.
4. Training data review and approval concept.
5. AI profiles and freshness/staleness status.
6. AI Observability runtime checks.
7. Python runtime endpoints in `ml-runtime/app.py`.
8. Backend proxy and container setup in `backend/server.js` and `docker-compose.yml`.

## Honest Technical Framing

- The ML runtime is deterministic and validation-focused right now.
- It is not yet a production-trained model.
- The strength of the project is integration: product UI, admin tooling, runtime checks, feedback flow, and infrastructure readiness.

## Demo Commands

```powershell
python ml-runtime/app.py
```

```powershell
cd backend
$env:ML_RUNTIME_HOST="localhost"
npm start
```

```powershell
cd desktop-app
npm run electron-dev
```

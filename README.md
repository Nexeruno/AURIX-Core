# Evidence v Datech / AURIX Core

Portfolio project: personal finance tracking with an admin desktop console, Firebase backend, and an experimental Python ML runtime for prediction observability.

The project demonstrates a full-stack product workflow: data entry, admin tooling, audit trails, role-aware management, ML pipeline monitoring, runtime health checks, and container orchestration with Podman/Docker Compose.

## Highlights

- React/Vite finance tracker for income and expense data
- Electron admin console called AURIX Core
- Firebase Authentication, Firestore, Cloud Functions, and audit logging
- ML control pages for predictions, training feedback, AI profiles, and L2 shadow pipeline monitoring
- Python Flask ML runtime with health, readiness, prediction, dataset validation, and evaluation endpoints
- Local backend proxy for runtime dependency checks
- Podman/Docker Compose stack for `backend` + `ml-runtime`
- Kubernetes manifests and CI/CD workflow examples
- Security cleanup: local secrets and env files are ignored and excluded from container build context

## Tech Stack

| Area | Technology |
| --- | --- |
| Web frontend | React 18, Vite, Tailwind CSS |
| Desktop app | Electron, React, TypeScript |
| Backend | Firebase Cloud Functions, Node.js proxy |
| Database/Auth | Firestore, Firebase Authentication |
| ML runtime | Python, Flask |
| Containers | Podman/Docker Compose |
| Infrastructure | Kubernetes manifests, GitHub Actions |
| Testing | Vitest, TypeScript checks, Python runtime tests |

## Repository Layout

```text
backend/              Local Node.js backend/proxy for ML runtime checks
desktop-app/          Electron admin and ML control center
docs/                 Guides, reports, screenshots, cleanup notes
functions/            Firebase Cloud Functions
k8s/                  Kubernetes manifests
ml-pipeline/          Experimental ML contract and validation utilities
ml-runtime/           Python Flask ML runtime
scripts/              Startup/admin/runtime helper scripts
src/                  Main web application
tests/                Manual test scripts
docker-compose.yml    Podman/Docker Compose stack
```

## Quick Start

### 1. Install dependencies

```powershell
npm install
cd desktop-app
npm install
cd ..
cd backend
npm install
cd ..
```

### 2. Configure Firebase

Copy the example env file and fill in your Firebase values:

```powershell
Copy-Item .env.example .env.local
```

Never commit local `.env*` files. They are ignored by Git.

### 3. Run the web app

```powershell
npm run dev
```

Default URL:

```text
http://localhost:5173
```

### 4. Run the desktop admin app

```powershell
cd desktop-app
npm run electron-dev
```

### 5. Run the Python ML runtime locally

```powershell
python ml-runtime/app.py
```

Health check:

```text
http://localhost:5000/health
```

Expected response includes:

```json
{
  "status": "healthy",
  "service": "ml-runtime"
}
```

### 6. Run the backend proxy locally

```powershell
cd backend
$env:ML_RUNTIME_HOST="localhost"
npm start
```

Dependency check:

```text
http://localhost:3000/status/dependencies
```

## Podman / Docker Compose

Create local compose config:

```powershell
Copy-Item .env.docker-compose.example .env.docker-compose
```

Start Podman machine if needed:

```powershell
podman machine start
podman ps
```

Start the stack:

```powershell
podman compose up -d --build
```

If port `5000` is already used by a manually started Python runtime, stop that process first.

## Verification

Useful checks before presenting the project:

```powershell
cd desktop-app
npm run type-check
```

```powershell
python ml-runtime/test_dataset_error_handling.py
```

```powershell
Invoke-WebRequest http://localhost:5000/health -UseBasicParsing
Invoke-WebRequest http://localhost:3000/status/dependencies -UseBasicParsing
```

## Demo Flow for Interviews

1. Show the main finance dashboard and explain income/expense tracking.
2. Open AURIX Core and show admin-focused navigation.
3. Show ML Predictions and explain L1 vs. L2 shadow prediction flow.
4. Show Training Data and explain approved feedback records.
5. Show AI Profiles and freshness/staleness concept.
6. Show AI Observability and runtime health checks.
7. Open `ml-runtime/app.py` and explain the Python service contract.
8. Show `docker-compose.yml` and explain backend + ML runtime orchestration.

## Security Notes

- Local `.env*` files are ignored.
- Local service-account JSON files are ignored.
- Docker build context excludes env files, credentials, docs, tests, and local cache folders.
- Example files such as `.env.example` and `.env.docker-compose.example` are safe templates.

Important: if a real service-account key was committed before cleanup, rotate that key in Firebase/GCP before sharing the repository publicly.

## Documentation

- Root cleanup report: `docs/ROOT_CLEANUP_REPORT.md`
- Secret ignore cleanup report: `docs/SECRET_IGNORE_CLEANUP_REPORT.md`
- Runtime reports: `docs/reports/runtime/`
- Phase and audit reports: `docs/reports/`
- Setup guides: `docs/guides/`

## Current Scope

This project is portfolio-ready as an engineering demo. The Python ML runtime currently focuses on deterministic prediction, validation, evaluation, observability, and runtime integration. A production-grade trained model can be added on top of this foundation.

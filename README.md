# AURIX Core

Full-stack personal finance platform with a React web app, an Electron desktop admin console, Firebase backend, Python ML runtime, and containerised services via Podman.

Built as a portfolio project to demonstrate end-to-end product thinking: user-facing data entry, role-based admin tooling, ML pipeline integration, runtime observability, and cloud deployment.

---

## What's in the repo

| App | Description | Where it runs |
|---|---|---|
| **Finance Web App** | React/Vite SPA — income and expense tracking, dashboard, Firebase auth | GitHub Pages (live) |
| **AURIX Core** | Electron desktop admin console — ML control, AI profiles, observability, audit trail | Locally (Electron) |
| **Python ML Runtime** | Flask service — health, readiness, prediction, and dataset validation endpoints | Local / Podman container |
| **Node.js Backend Proxy** | Express server — routes ML runtime calls, status checks | Local / Podman container |

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Web app | React 18, Vite, Tailwind CSS, Firebase |
| Desktop admin | Electron, React 18, TypeScript, Vite, Tailwind CSS |
| Auth & database | Firebase Authentication, Firestore |
| Cloud functions | Firebase Cloud Functions (Node.js) |
| ML runtime | Python 3.11, Flask |
| Backend proxy | Node.js, Express |
| Containers | Podman, Docker Compose |
| CI/CD | GitHub Actions — lint, test, build, deploy to GitHub Pages |
| Infrastructure | Kubernetes manifests (k8s/) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ GitHub Pages                                                    │
│   Finance Web App  (React/Vite)                                 │
│   ↕ Firebase Auth + Firestore                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Local — started via start-aurix-core.bat                        │
│                                                                 │
│   AURIX Core Electron ──→ Firebase Auth + Firestore             │
│                      ──→ Node.js Proxy :3000                    │
│                                 ──→ Python ML Runtime :5000     │
│                                                                 │
│   Podman: [ml-runtime container] + [node-backend container]     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Finance Web App

Live on GitHub Pages: [nexeruno.github.io/AURIX-Core](https://nexeruno.github.io/AURIX-Core/)

Features:
- Income and expense entry with categories
- Dashboard with totals and charts
- Repeating transactions
- Firebase Authentication (register, login, password reset)
- Dark mode

Local development:

```powershell
npm install
npm run dev
# Opens at http://localhost:5175
```

---

## AURIX Core — Desktop Admin Console

A standalone Electron app for admin and ML operations. Requires the Python ML runtime and Node.js backend running (handled automatically by the startup script).

### Start everything with one command

```powershell
.\scripts\startup\start-aurix-core.bat
```

The script:
1. Verifies Node.js and Podman are installed
2. Starts the Podman machine (WSL2 VM)
3. Builds container images on first run
4. Starts `ml-runtime` (port 5000) and `node-backend` (port 3000)
5. Waits for both health checks to pass
6. Launches AURIX Core (Vite dev server + Electron)
7. Stops containers when Electron closes

### Manual start (without Podman)

```powershell
# Terminal 1 — ML runtime
python ml-runtime/app.py

# Terminal 2 — Node backend
cd backend && npm start

# Terminal 3 — AURIX Core
cd desktop-app && npm run electron-dev
```

### AURIX Core sections

| Section | Description |
|---|---|
| Dashboard | System overview — users, ML run history, health status |
| ML Predictions | L1 / L2 prediction results per user |
| ML Model Control | Switch prediction levels, manage shadow mode |
| Training Data | Feedback records used to improve the ML model |
| AI Profiles | Per-user feature layer — confidence scores, correction factors |
| AI Observability | Python runtime health, run history, export |
| Audit Trail | Full admin action log with filters |
| Roles | User role management |

---

## Python ML Runtime

```powershell
python ml-runtime/app.py
```

Key endpoints:

| Endpoint | Description |
|---|---|
| `GET /health` | Liveness check |
| `GET /ready` | Readiness check |
| `POST /predict` | Run a prediction |
| `POST /validate-dataset` | Validate a training dataset |

---

## Podman Containers

Build and run individually (recommended on Windows):

```powershell
podman machine start
podman network create ml-network

podman build -t evidence-vydaju-ml-runtime ml-runtime/
podman build -t evidence-vydaju-backend -f backend/Containerfile .

podman run -d --name ml-runtime --network ml-network -p 5000:5000 evidence-vydaju-ml-runtime
podman run -d --name node-backend --network ml-network -p 3000:3000 `
  -e ML_RUNTIME_HOST=ml-runtime -e ML_RUNTIME_PORT=5000 `
  -e ML_RUNTIME_ENABLED=true -e PORT=3000 evidence-vydaju-backend
```

---

## Configuration

```powershell
# Web app / Firebase
Copy-Item .env.example .env.local

# Containers
Copy-Item .env.docker-compose.example .env.docker-compose
```

Fill in Firebase project credentials. All `.env*` files are git-ignored.

---

## CI/CD

GitHub Actions pipeline on every push to `main`:

1. ESLint
2. Vitest unit tests
3. Vite build
4. Smoke tests — verifies `dist/index.html` structure and assets
5. Deploy to GitHub Pages

---

## Repository Layout

```
backend/              Node.js Express backend proxy
desktop-app/          AURIX Core Electron admin app (TypeScript/React)
functions/            Firebase Cloud Functions
k8s/                  Kubernetes manifests
ml-pipeline/          ML contract validation utilities
ml-runtime/           Python Flask ML service + Containerfile
scripts/startup/      start-aurix-core.bat / .ps1 launcher
src/                  Finance web app (React/Vite)
docker-compose.yml    Podman/Docker Compose service definitions
firestore.rules       Firestore security rules
```

---

## About

Built by **Daniel Řezáč**. Architecture, product decisions, and direction by the author — Claude (Anthropic) used as implementation assistant throughout, writing code to the author's specifications.

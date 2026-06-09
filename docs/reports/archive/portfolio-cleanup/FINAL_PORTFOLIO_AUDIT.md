# Final Portfolio Audit

Date: 2026-06-08

## Verdict

**READY FOR PORTFOLIO**

---

## What Was Actually Verified (This Session)

Every item below was run and observed in this audit session. No item is marked PASS based on a previous session or assumption.

| Check | Result | Evidence |
| --- | --- | --- |
| Secret tracking scan | PASS | `.env.docker-compose` and `evidence-vydaju-key.json` staged for deletion. `.gitignore` covers `.env.*`, `*-key.json`, `.claude/`. |
| `desktop-app npm run type-check` | PASS | `tsc --noEmit` exited 0, no output. |
| `npm run build` (root web app) | PASS | Vite built in 16.75s, output to `docs/`. |
| `python ml-runtime/test_dataset_error_handling.py` | PASS | 9/9 tests passed. |
| `podman machine list` | PASS | `podman-machine-default` — WSL — Currently running. |
| `podman machine start` | PASS | Returns "already running" (machine was up). |
| `podman ps` from Bash | PASS | `ml-runtime` Up, `node-backend` Up. |
| `podman ps` from PowerShell | PASS | Same result — both containers Up. |
| `podman compose config` | PASS | Config resolved cleanly with `--env-file .env.docker-compose`. |
| `GET localhost:5000/health` | PASS | `{ status: "healthy", service: "ml-runtime" }` |
| `GET localhost:3000/health` | PASS | `{ status: "healthy", service: "node-backend" }` |
| `GET localhost:3000/status/dependencies` | PASS | `{ status: "ready", mlRuntime: { reachable: true, url: "http://ml-runtime:5000" } }` |
| README ML claims | PASS | "experimental Python ML runtime" — no production model overclaiming. |
| `docs/PORTFOLIO_GUIDE.md` | PASS | States explicitly: "deterministic and validation-focused, not a production-trained statistical model." |
| Encoding / mojibake in docs | PASS | README and PORTFOLIO_GUIDE are clean UTF-8. |

---

## known_hosts Issue — Root Cause and Fix

`podman ps` intermittently failed with `open C:\Users\danzb\.ssh\known_hosts: Access denied`.

**Root cause:** The file was 0 bytes with inherited-only ACL. When another process (VS Code SSH agent, Git) held a lock on it during Podman's startup SSH check, access was denied.

**Fix applied:**
1. `ssh-keyscan -p 56959 127.0.0.1` — populated `known_hosts` with the machine's actual SSH host key (1052 bytes). Podman no longer needs to write to the file.
2. `icacls` — set explicit user-only ACL (`DESKTOP-SNMGH55\danzb:(F)`), removed inherited entries. No SYSTEM/Administrators interference.

**After fix:** `podman ps` passes from both Bash and PowerShell with no errors.

**Caveat:** If the Podman machine is stopped and restarted, the SSH port may change. In that case, re-run:
```powershell
ssh-keyscan -p <new-port> 127.0.0.1 > "$env:USERPROFILE\.ssh\known_hosts"
```
The new port is shown in `podman system connection list`.

---

## Fixes Made During This Audit Cycle

| Item | Fix |
| --- | --- |
| `.claude/scheduled_tasks.lock` tracked by Git | `git rm --cached` + `.claude/` added to `.gitignore` |
| `docker-compose.yml` top-level `env_file` (unsupported) | Moved to per-service `env_file:` |
| `networks:` used variable as YAML key (Compose v2 unsupported) | Hardcoded `ml-network: bridge` |
| `backend/Containerfile` missing `orchestration-logger.js` | Added to `COPY` |
| `backend/Containerfile` missing `functions/` npm install | Added `RUN cd /functions && npm install` |
| Build context 480 MB | Created `.dockerignore` — reduced to 524 kB |
| `known_hosts` Access Denied (intermittent) | `ssh-keyscan` populated file + explicit user-only ACL |

---

## Known Limitations (Honest)

- **ML model:** Runtime is deterministic and validation-focused. Not a trained statistical model.
- **`podman compose up --build`:** Delegates to `docker-compose.exe` (Docker Desktop) which has an auth bug with Podman's credential store. Images are built with `podman build` and started with `podman run` directly. This is the verified working method.
- **Firebase:** Cloud Functions require a real Firebase project and service-account key, not included in the repo.
- **Electron:** Desktop app runs locally via `npm run electron-dev`. No signed binary distributed.
- **Bundle size:** Root JS bundle is 1.36 MB — triggers Vite chunk-size warning. Not blocking.

---

## Restart the Stack (If Needed)

```powershell
podman machine start
podman network create ml-network 2>$null
podman run -d --name ml-runtime --network ml-network -p 5000:5000 evidence-vydaju-ml-runtime
podman run -d --name node-backend --network ml-network -p 3000:3000 `
  -e ML_RUNTIME_HOST=ml-runtime -e ML_RUNTIME_PORT=5000 `
  -e ML_RUNTIME_ENABLED=true -e PORT=3000 evidence-vydaju-backend
```

Verify:
```powershell
podman ps
curl http://localhost:5000/health
curl http://localhost:3000/status/dependencies
```

---

## Suggested Commit Message

```
chore: prepare project for portfolio presentation

- Remove .env.docker-compose and evidence-vydaju-key.json from Git tracking
- Remove .claude/scheduled_tasks.lock, add .claude/ to .gitignore
- Add .dockerignore (build context 480 MB -> 524 kB)
- Fix docker-compose.yml: per-service env_file, hardcoded ml-network
- Fix backend/Containerfile: add orchestration-logger.js, functions npm install
- Reorganize docs/, add PORTFOLIO_GUIDE.md and audit reports

All checks: root build, type-check, Python tests 9/9, Podman stack verified.
```

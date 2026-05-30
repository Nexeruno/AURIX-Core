# 🔐 GitHub Actions Secrets Setup

## Quick Setup (2 minutes)

1. Go to: **Settings → Secrets and variables → Actions**

2. Click **New repository secret**

3. Add each of these secrets:

| Secret Name | Value |
|-------------|-------|
| `FIREBASE_API_KEY` | `AIzaSyA7lrVXLwJjMIYocOg4hWRSTIzBo7M3YtE` |
| `FIREBASE_AUTH_DOMAIN` | `evidence-vydaju.firebaseapp.com` |
| `FIREBASE_PROJECT_ID` | `evidence-vydaju` |
| `FIREBASE_STORAGE_BUCKET` | `evidence-vydaju.firebasestorage.app` |
| `FIREBASE_MESSAGING_SENDER_ID` | `153586307551` |
| `FIREBASE_APP_ID` | `1:153586307551:web:814a28a53285f377c8b46a` |
| `ADMIN_EMAIL` | `danzby@seznam.cz` |

4. Done! CI/CD will now work automatically.

## After Setup

- Push to `main` → CI/CD automatically builds, tests, and deploys
- No more manual deploys needed!
- Backups created automatically for each deployment
- One-click rollback available if needed

## Verify Setup

Check Actions tab:
1. Go to **Actions** tab
2. Click **🚀 Deploy & Backup** workflow
3. Verify recent runs are green (✅)
4. Site should be live at: https://nexeruno.github.io/Evidence-v-daj-/

## If Secrets Are Missing

You'll see:
- ❌ Workflow run fails
- ⚠️ "FIREBASE_API_KEY not defined"
- 🔄 Previous version stays live (no downtime!)

Just add the missing secrets and push again.

---

**Done!** Your CI/CD pipeline is ready. 🎉

# 🔐 GitHub Actions Secrets Setup

## Quick Setup (2 minutes)

1. Go to: **Settings → Secrets and variables → Actions**

2. Click **New repository secret**

3. Add each of these secrets:

| Secret Name | Value (from Firebase Console → Project settings) |
|-------------|-------|
| `FIREBASE_API_KEY` | `<your-firebase-web-api-key>` |
| `FIREBASE_AUTH_DOMAIN` | `<your-project>.firebaseapp.com` |
| `FIREBASE_PROJECT_ID` | `<your-project-id>` |
| `FIREBASE_STORAGE_BUCKET` | `<your-project>.firebasestorage.app` |
| `FIREBASE_MESSAGING_SENDER_ID` | `<your-sender-id>` |
| `FIREBASE_APP_ID` | `<your-app-id>` |
| `ADMIN_EMAIL` | `<your-admin-email>` |

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
4. Site should be live at: https://nexeruno.github.io/AURIX-Core/

## If Secrets Are Missing

You'll see:
- ❌ Workflow run fails
- ⚠️ "FIREBASE_API_KEY not defined"
- 🔄 Previous version stays live (no downtime!)

Just add the missing secrets and push again.

---

**Done!** Your CI/CD pipeline is ready. 🎉

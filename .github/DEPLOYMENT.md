# 🚀 CI/CD Deployment Guide

## Overview

This project uses GitHub Actions for automated CI/CD with rollback capabilities. Every push to `main` triggers an automatic build, test, and deployment to GitHub Pages.

## Workflows

### 1. 🧪 **test.yml** - Build & Test
- **Trigger**: Every pull request and push to `main`
- **What it does**:
  - Installs dependencies
  - Builds the application
  - Verifies build artifacts
  - Checks bundle size
  - Performs security checks

### 2. 🚀 **deploy.yml** - Deploy & Backup
- **Trigger**: Every push to `main`
- **What it does**:
  - Builds the application
  - Deploys to GitHub Pages (`gh-pages` branch)
  - Backs up the version to `gh-pages-backup` branch
  - Creates a git tag with timestamp
  - Creates release notes
  - **Automatic Rollback**: On failure, previous version stays live

### 3. 🏷️ **release.yml** - Semantic Release
- **Trigger**: Every push to `main` (when code changes)
- **What it does**:
  - Creates semantic version tag (format: `vYYYY.MM.DD.HHMMSS`)
  - Generates release notes
  - Updates changelog

### 4. 🔄 **rollback.yml** - Manual Rollback
- **Trigger**: Manual workflow dispatch from Actions tab
- **What it does**:
  - Restores any previous backup version
  - Pushes it to `gh-pages` (live site)
  - Notifies of the rollback

## 🔐 Required Secrets

Add these to GitHub repo settings → Secrets and variables → Actions:

```
FIREBASE_API_KEY=<your-firebase-web-api-key>
FIREBASE_AUTH_DOMAIN=<your-project>.firebaseapp.com
FIREBASE_PROJECT_ID=<your-project-id>
FIREBASE_STORAGE_BUCKET=<your-project>.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=<your-sender-id>
FIREBASE_APP_ID=<your-app-id>
ADMIN_EMAIL=<your-admin-email>
```

> Values come from the Firebase Console → Project settings → Your apps. The web API
> key is a public client identifier; access is controlled by Firestore security rules.

**NEVER commit `.env` or secrets to the repository!**

## 📋 Deployment Process

### Normal Deployment (Push to main)

```
Push to main
    ↓
test.yml (Build & Test)
    ↓
✅ Tests pass → deploy.yml (Deploy to gh-pages)
    ↓
✅ Creates backup (gh-pages-backup)
    ↓
✅ Creates git tag (vYYYY.MM.DD.HHMMSS)
    ↓
✅ Site LIVE at: https://nexeruno.github.io/AURIX-Core/
```

### Deployment Fails

```
❌ Deployment fails
    ↓
⚠️ Rollback triggered automatically
    ↓
🔄 Previous version restored to gh-pages
    ↓
✅ Site STILL LIVE (previous working version)
    ↓
📧 Developers notified of failure
```

## 🏷️ Version Tags

Each deployment creates a tag in format: `vYYYY.MM.DD.HHMMSS`

Example: `v2026.05.30.143000`

View all tags:
```bash
git tag -l
git show v2026.05.30.143000
```

## 📚 Branches

| Branch | Purpose |
|--------|---------|
| `main` | Production code, triggers CI/CD |
| `gh-pages` | Live site (auto-updated by CI/CD) |
| `gh-pages-backup` | Backup versions (one per deployment) |

## 🔄 Manual Rollback

If you need to rollback to a previous version:

1. Go to **Actions** tab on GitHub
2. Click **🔄 Rollback to Last Working Version**
3. (Optional) Enter backup number to restore
4. Click **Run workflow**
5. Wait for completion
6. Site is restored to previous version

Backup numbers are stored as `backup-{run_number}` in `gh-pages-backup` branch.

## 📊 Monitoring

### Check Deployment Status

```bash
# View recent tags
git tag -l --sort=-version:refname | head -5

# View recent deployments
gh run list --limit 10 --branch main

# View specific workflow run
gh run view {run-id}
```

### View Backups

```bash
# List all backups
git ls-tree -r gh-pages-backup | grep "backup-"

# View specific backup
git show gh-pages-backup:backup-{number}/index.html
```

## ⚙️ Configuration

### Bundle Size Warning

If bundle exceeds 2MB, CI/CD warns but still deploys.

To optimize:
- Use dynamic imports for large libraries
- Enable code splitting in vite.config.js
- Lazy-load routes

### Security Checks

Warnings for:
- `console.log` in source code
- Potential hardcoded secrets
- Missing environment variables

## 🚨 Troubleshooting

### Build fails locally but CI/CD passes

- Clear node_modules: `rm -rf node_modules && npm install`
- Clear cache: `npm cache clean --force`
- Rebuild: `npm run build`

### Site shows old version after push

- GitHub Pages takes 1-5 minutes to update
- Hard refresh: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
- Check Actions tab to see if deploy is in progress

### Need to rollback immediately

1. Go to Actions tab
2. Click "🔄 Rollback to Last Working Version"
3. Click "Run workflow"
4. Site restored in ~30 seconds

## 📞 Support

If deployment fails:

1. ✅ Check Actions tab for error message
2. ✅ Site is NOT down (previous version is live)
3. ✅ Fix the issue in your code
4. ✅ Push to main (CI/CD automatically redeploys)
5. ✅ Or manually rollback if you need immediate fix

## 🎯 Best Practices

1. **Always test locally first**
   ```bash
   npm run build
   npm run dev
   ```

2. **Keep commits clean**
   - One feature per commit
   - Clear commit messages
   - Don't commit build artifacts

3. **Monitor deployments**
   - Watch Actions tab after push
   - Check release notes for version info
   - Verify site is live after 2-3 minutes

4. **Use branches for work**
   - Create feature branch
   - Make changes
   - Push to PR
   - Merge to main (CI/CD handles deployment)

5. **Communicate deployments**
   - Tag releases with meaningful names
   - Update CHANGELOG.md
   - Document breaking changes

---

**Remember**: Deployments are automated. Just push clean code to main! 🚀

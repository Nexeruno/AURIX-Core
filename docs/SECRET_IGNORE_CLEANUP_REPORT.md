# Secret Ignore Cleanup Report

Date: 2026-06-08

## Summary

Local secrets, environment files, credentials, and cache files are now excluded from Git and Docker/Podman build context.

## Git Ignore Coverage

- `.env`
- `.env.*`
- `functions/.runtimeconfig.json`
- `k8s/secret.yaml`
- `*-key.json`
- `serviceAccount*.json`
- `credentials*.json`
- certificate/key/token file patterns
- Python cache folders

## Docker Ignore Coverage

The Docker build context excludes local env files, credentials, docs, scripts, tests, Git metadata, and cache folders.

## Files Removed From Git Tracking

These files remain available locally but should not be committed:

- `.env.docker-compose`
- `evidence-vydaju-key.json`

## Important Note

If a real service-account key was committed in the past, rotate that key before sharing or publishing the repository.

# AURIX Core

Portfolio full-stack prototyp zamereny na osobni finance, administraci a ML runtime vrstvu.

Projekt je postaveny jako learning project, na kterem jsem testoval navrh architektury, propojovani frontend/backend sluzeb, Firebase, observabilitu, kontejnerizaci a CI/CD.

---

## Co je AURIX Core

AURIX Core je portfolio prototyp s vice castmi:

- Finance Web App (React/Vite) pro evidenci prijmu a vydaju
- Electron admin aplikace pro role, audit a ML dohled
- Node.js backend proxy mezi desktop aplikaci a ML runtime
- Python ML runtime (Flask) s endpointy pro health/readiness/predict/validaci datasetu
- Integrace s Firebase Authentication a Firestore

Cilem nebylo dodat hotovy komercni produkt, ale ukazat schopnost navrhnout a propojit cele end-to-end reseni.

---

## Status projektu

Tento repozitar je portfolio full-stack prototyp, ne hotova produkcni aplikace.

Aktualne funkcni casti:

- Webova cast bezi na GitHub Pages
- Lokalne lze spustit Electron + backend + ML runtime
- Funguje CI/CD pipeline (lint, test, build, deploy)
- Je pripravena observabilita a zakladni ML workflow

Co zatim neni production-ready:

- ML cast je z casti simulovana (nejde o finalne natrenovany produkcni model)
- Chybi distribucni balicek Electron aplikace pro koncove uzivatele
- Cloud provoz backendu/runtime je pripraveny jen na urovni infra podkladu

---

## Screenshoty (portfolio ukazka)

### 1) Login / hlavni dashboard

![Login a dashboard](./img/00.png)

### 2) Uzivatele a role

![Uzivatele a role](./img/01.png)

### 3) ML dashboard / predikce

![ML dashboard](./img/02.png)

### 4) Admin panel a audit

![Admin panel](./img/03.png)

### 5) Nastaveni / provozni detail

![Nastaveni](./img/04.png)

### 6) Chybovy stav / observabilita

![Chybovy stav a observabilita](./img/05.png)

---

## Jak projekt spustit

### Rychly start (Windows)

```powershell
.\scripts\startup\start-aurix-core.bat
```

Skript automaticky:

1. overi Node.js a Podman
2. spusti Podman machine
3. postavi a spusti `ml-runtime` a `node-backend`
4. pocka na health check
5. spusti Electron aplikaci

### Manualni start (bez Podman)

```powershell
# Terminal 1 - ML runtime
python ml-runtime/app.py

# Terminal 2 - Node backend
cd backend
npm install
npm start

# Terminal 3 - Electron app
cd desktop-app
npm install
npm run electron-dev
```

### Dulezite k verejnemu spusteni

Bez vlastni konfigurace neni projekt plne spustitelny v "public" rezimu.

Duvod:

- je nutne doplnit vlastni Firebase projekt a `.env` hodnoty
- cast integraci pocita s lokalni konfiguraci sluzeb a tajnych udaju
- bez vlastnich credentials nebude autentizace/datova vrstva fungovat korektne

Zakladni konfigurace:

```powershell
Copy-Item .env.example .env.local
Copy-Item .env.docker-compose.example .env.docker-compose
```

---

## Co jsem se na projektu naucil

- Prakticky debugging komplexnich toku mezi frontendem, backendem a Python runtime
- Navrh rozhrani mezi sluzbami (kontrakty, health/readiness, error handling)
- Integraci Firebase Authentication + Firestore v realne aplikaci
- Praci s chybovymi stavy, observabilitou a logovanim
- Kontejnerizaci (Docker/Podman), lokalni orchestrace a startup skripty
- Nastaveni CI/CD pipeline od lintu po deploy
- Efektivni praci s AI asistentem pri vyvoji, refaktoringu a dokumentaci

---

## Tech stack

- Frontend: React 18, Vite, Tailwind CSS
- Desktop: Electron, React, TypeScript
- Backend: Node.js, Express
- ML runtime: Python 3.11, Flask
- Data/Auth: Firebase Auth, Firestore
- DevOps: Podman, Docker Compose, GitHub Actions

---

## Struktura repozitare (zkracene)

- `src/` - webova aplikace (finance)
- `desktop-app/` - Electron admin aplikace
- `backend/` - Node.js proxy API
- `ml-runtime/` - Python ML runtime
- `functions/` - Firebase Cloud Functions
- `scripts/startup/` - startup skripty (`.bat`, `.ps1`)
- `k8s/` - Kubernetes manifesty

---

Tento projekt slouzi jako dukaz schopnosti samostatne navrhnout a dotahnout slozitejsi full-stack reseni.

Ukazuje:

- analyticke mysleni a navrh architektury
- schopnost implementace napric technologiemi
- praci s realnymi omezenimi (konfigurace, chyby, nasazeni)
- orientaci na kvalitu (testy, lint, CI/CD, observabilita)

Autor: Daniel Rezac

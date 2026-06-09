# 🔥 Firebase Deployment Guide

Tento guide ti pomůže nasadit Firestore pravidla a aplikaci na Firebase Hosting.

## ✅ Požadavky

- **Node.js** (v16+)
- **Firebase CLI** - instalace:
  ```bash
  npm install -g firebase-tools
  ```

- **Firebase projekt** - `<your-project-id>` (viz `.firebaserc`)

---

## 🚀 Nasazení Firestore Rules

### 1. Login do Firebase
```bash
firebase login
```
- Otevře se okno v prohlížeči
- Přihlaš se Google účtem
- Schválí přístup

### 2. Nasaď Firestore Rules
```bash
firebase deploy --only firestore:rules
```

To vypublikuje pravidla z `firestore.rules` do Firebase.

### 3. Ověření
Jdi do [Firebase Console](https://console.firebase.google.com/) → Tvůj projekt → Firestore → Rules

Měly by tam být nová pravidla z `firestore.rules` souboru.

---

## 🌐 Nasazení Hosting (volitelně)

Pokud chceš aplikaci nasadit na Firebase Hosting (místo GitHub Pages):

```bash
# 1. Build
npm run build

# 2. Deploy
firebase deploy --only hosting
```

App bude live na: `https://<your-project-id>.web.app`

---

## 🔄 Úplné nasazení (Rules + Hosting)

```bash
firebase deploy
```

---

## ❓ Troubleshooting

### "Project not set"
```bash
firebase use <your-project-id>
firebase deploy --only firestore:rules
```

### "Permission denied"
- Ujisti se, že máš práva v Firebase projektu
- Jdi na Firebase Console → Settings → Members
- Měl bys být minimálně "Editor"

### "firestore.rules not found"
```bash
# Ujisti se, že jsi v správné složce (Evidence výdajů)
ls firestore.rules
```

---

## 📝 Co se nasazuje

| Soubor | Popis | Nasazení |
|--------|-------|----------|
| `firestore.rules` | Bezpečnostní pravidla | ✅ `firebase deploy --only firestore:rules` |
| `dist/` | Postavená React app | ✅ `firebase deploy --only hosting` |

---

## 🎯 Nejčastější příkazy

```bash
# Nasaď jen pravidla
firebase deploy --only firestore:rules

# Nasaď jen hosting
npm run build && firebase deploy --only hosting

# Nasaď vše
npm run build && firebase deploy

# Kontrola statusu
firebase status
```

---

## 🔐 Bezpečnost

`firestore.rules` povolují:
- ✅ Čtení/zápis vlastních dat (`users/{uid}/...`)
- ✅ `repeatingTransactions` - opakující se transakce
- ✅ `pendingTransactions` - čekající schválení
- ❌ Zápis cizích dat

Vše je chráněno ověřením přihlášeného uživatele.

---

**Hotovo!** 🎉 Teď můžeš vytvářet opakující se transakce! 🔄

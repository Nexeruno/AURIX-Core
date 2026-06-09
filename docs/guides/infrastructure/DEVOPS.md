# 📊 DevOps & Monitoring Guide

Tento projekt je připraven pro DevOps, monitoring a budoucí AI/MLOps.

## 🏗️ Architektura

```
┌─────────────────────────────────────────────┐
│         React Frontend (Vite)               │
│  - PendingTransactions (auto-refresh)       │
│  - Retry mechanism (exponential backoff)    │
│  - Real-time statistics                     │
└────────────────┬────────────────────────────┘
                 │ REST API
┌────────────────┴────────────────────────────┐
│    Google Cloud Functions (Node.js 20)      │
│  ┌──────────────────────────────────────┐  │
│  │ Admin Functions                      │  │
│  │ - posliResetHesla (password reset)   │  │
│  │ - smazUzivatele (delete user)        │  │
│  │ - zablokujUzivatele (block user)     │  │
│  │ - aktualizujUzivatele (update user)  │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ Recurring Transactions                │  │
│  │ - generateRecurringTransactions ⏲️    │  │
│  │   (Scheduled: daily 2:00 AM)         │  │
│  │ - testGenerateRecurring (manual)     │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ DevOps / Monitoring                  │  │
│  │ - healthCheck (Firebase status)      │  │
│  │ - metrics (system statistics)        │  │
│  │ - debugRecurring (diagnostics)       │  │
│  │ - hourlyHealthMonitor ⏲️ hourly      │  │
│  └──────────────────────────────────────┘  │
└────────────────┬────────────────────────────┘
                 │
┌────────────────┴────────────────────────────┐
│         Firebase Services                   │
│  - Firestore (data store)                  │
│  - Authentication (Firebase Auth)          │
│  - Cloud Scheduler (recurring jobs)        │
│  - Security Rules (RBAC)                   │
└─────────────────────────────────────────────┘
```

## 📈 Monitoring Endpoints

### Health Check
```bash
curl https://europe-west1-<your-project-id>.cloudfunctions.net/healthCheck
```

**Response:**
```json
{
  "healthy": true,
  "timestamp": "2026-05-30T14:30:00.000Z",
  "services": {
    "auth": { "status": "ok" },
    "firestore": { "status": "ok" }
  }
}
```

### Metrics (DevOps / AI-ready)
```bash
curl https://europe-west1-<your-project-id>.cloudfunctions.net/metrics
```

**Response:**
```json
{
  "timestamp": "2026-05-30T14:30:00.000Z",
  "version": "1.0.0",
  "metrics": {
    "users": { "total": 42 },
    "transactions": {
      "total": 1250,
      "pending": 15,
      "recurring": 28
    },
    "pending": {
      "count": 15,
      "byType": { "vydaj": 10, "prijem": 5 },
      "totalAmount": { "vydaj": 2500, "prijem": 1000 }
    },
    "recurring": {
      "count": 28,
      "byType": { "daily": 5, "weekly": 8, "monthly": 12, "yearly": 3 },
      "active": 26
    }
  },
  "performance": { "responseTimeMs": 245 }
}
```

## 🔐 Security

### Firestore Rules
- **Admin Access**: Admins mohou číst/psát všechny uživatele
- **User Access**: Uživatelé mohou pouze číst/psát své vlastní data
- **Helper Functions**: `isAdmin()`, `isOwner()` pro RBAC

### Cloud Functions
- ✅ **Token Verification**: Všechny funkce ověřují Firebase Auth token
- ✅ **Admin Check**: Admin operace ověřují admin roli
- ✅ **Error Handling**: Detailní error messages pro debugging
- ✅ **Retry Mechanism**: Exponential backoff (1s, 2s, 4s)
- ✅ **Rate Limiting**: Built-in do Cloud Functions

## 🚀 Deployment

### Deploy All
```bash
firebase deploy
```

### Deploy Only Rules
```bash
firebase deploy --only firestore:rules
```

### Deploy Only Functions
```bash
firebase deploy --only functions
```

### Deploy Only Hosting
```bash
firebase deploy --only hosting
```

## 📊 DevOps Practices

### 1. **Monitorování**
- Endpoint metrik pro systémové přehledy
- Kontrola stavu služby
- Endpoint ladění pro diagnostiku

### 2. **Auto-Refresh**
- Frontend auto-refreshuje pending transakce každých 30 sekund
- Togglable v UI pro control

### 3. **Quick Actions**
- Manuální spouštění testů a diagnostiky
- `testGenerateRecurring` - test vygenerování transakcí
- `debugRecurring` - diagnostika opakujících se transakcí

### 4. **Scheduled Jobs**
- `generateRecurringTransactions` běží daily v 2:00 AM (Prague timezone)
- Test endpoint pro ruční spuštění
- Detailed logging pro audit trail

## 🤖 AI/MLOps Readiness

Projekt je připraven na budoucí ML features:

### Sbírání dat
```javascript
// Endpoint metrik sbírá data pro trénování ML
- Vzory chování uživatelů
- Vzory transakcí
- Časové vzory (denní, týdenní, měsíční trendy)
- Distribuce kategorií
- Distribuce částek
```

### Škálovatelnost
- ✅ **Bezstavové funkce**: Snadno se škálují horizontálně
- ✅ **Firestore**: Automaticky se přizpůsobuje objemu dat
- ✅ **Cloud Scheduler**: Bezstavové plánování
- ✅ **Dávkové operace**: Efektivní zápisy do databáze

### Budoucí ML funkce
1. **Detekce anomálií**: Rozpoznání neobvyklých transakcí
2. **Předpověď výdajů**: Předpověď budoucích výdajů
3. **Doporučení kategorií**: Automatická kategorizace transakcí
4. **Optimalizace spořicích cílů**: Doporučení rozpočtu
5. **Detekce podvodů**: Rozpoznání podezřelých transakcí

## 📝 Protokolování a ladění

### Protokoly Cloud Functions
```bash
firebase functions:log
```

### Endpoint ladění
```bash
curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  https://europe-west1-<your-project-id>.cloudfunctions.net/debugRecurring
```


## 🔄 Tok opakujících se transakcí

```
1. Uživatel nastaví opakující se transakci
   ↓
2. `generateRecurringTransactions` (denně v 2:00 AM)
   - Iteruje všechny uživatele
   - Kontroluje pravidla opakování
   - Generuje čekající transakce
   - Protokoluje výsledky
   ↓
3. Komponenta čekajících transakcí
   - Auto-obnovuje každých 30 sekund
   - Zobrazuje statistiky
   - Umožňuje schválení/odmítnutí
   ↓
4. Uživatel schválí
   - Transakce se přesune do hlavního seznamu
   - Čekající záznam se smaže
   - Upozornění se statusem
```

## 📋 Doporučené postupy

### Zpracování chyb
- ✅ Try/catch ve všech asynchronních funkcích
- ✅ Podrobné chybové zprávy
- ✅ Elegantní degradace
- ✅ Přátelské upozornění uživateli

### Ověření dat
- ✅ Ověření na straně serveru v Cloud Functions
- ✅ Ověření na straně klienta v Reactu
- ✅ Kontrola typů (částka > 0, atd.)
- ✅ Kontrola prázdných řetězců

### Výkon
- ✅ Memoizace komponent
- ✅ Optimalizace callback funkcí
- ✅ Efektivní dotazy Firestore
- ✅ Sledování doby odezvy

## 📚 Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Google Cloud Functions](https://cloud.google.com/functions/docs)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Cloud Scheduler](https://cloud.google.com/scheduler/docs)

## 🎯 Next Steps for AI/MLOps

1. Setup **Cloud Logging** for centralized logs
2. Create **BigQuery dataset** for ML data warehouse
3. Setup **Cloud Storage** for model artifacts
4. Implement **Pub/Sub** for event streaming
5. Create **ML pipelines** for predictions
6. Setup **Vertex AI** for model training/serving
7. Create **dashboards** in Data Studio

---

**Last Updated**: 2026-05-31  
**Version**: 3.0.0 (Auto-Repair Removed)  
**Status**: Production Ready ✅

## 📝 Changelog

### v3.0.0 (2026-05-31)
- ❌ Removed safeAutoRepairSystem Cloud Function
- ❌ Removed auto-repair and duplicate detection functionality
- ❌ Removed systemRepairs Firestore collection references
- ✅ All user data now only modifiable by explicit user actions
- ✅ No automatic deletion or modification of income/expense data

### v2.0.0 (2026-05-31)
- ✅ Added Safe Auto-Repair System (safeAutoRepairSystem)
- ✅ Archives problematic data instead of deleting
- ✅ Runs every 6 hours automatically
- ✅ Detailed logging and email reports
- ✅ Removed dangerous cleanupDuplicates function
- ✅ Added repairHistory tracking for recurring transactions

### v1.0.0 (2026-05-30)
- Initial release with monitoring and metrics

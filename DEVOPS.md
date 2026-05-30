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
│  │ - cleanupDuplicates (data cleaning)  │  │
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
curl https://europe-west1-evidence-vydaju.cloudfunctions.net/healthCheck
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
curl https://europe-west1-evidence-vydaju.cloudfunctions.net/metrics
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

### 1. **Monitoring**
- Metrics endpoint pro systém-wide insights
- Health check pro service status
- Debug endpoint pro diagnostiku

### 2. **Auto-Refresh**
- Frontend auto-refreshuje pending transakce každých 30 sekund
- Togglable v UI pro control

### 3. **Data Cleanup**
- `cleanupDuplicates` - smaže duplikáty a opravuje data
- Manuálně spustitelné z UI
- Preventivní duplikát-check při generování

### 4. **Scheduled Jobs**
- `generateRecurringTransactions` běží daily v 2:00 AM (Prague timezone)
- Test endpoint pro ruční spuštění
- Detailed logging pro audit trail

## 🤖 AI/MLOps Readiness

Projekt je připraven na budoucí ML features:

### Data Collection
```javascript
// Metrics endpoint sbírá data pro ML training
- User behavior patterns
- Transaction patterns
- Timing patterns (daily, weekly, monthly trends)
- Category distributions
- Amount distributions
```

### Scalability
- ✅ **Stateless Functions**: Легко scalovat horizontálně
- ✅ **Firestore**: Automatically scales s datovým objemem
- ✅ **Cloud Scheduler**: Bezstav scheduling
- ✅ **Batch Operations**: Efficient database writes

### Future ML Features
1. **Anomaly Detection**: Detect unusual transactions
2. **Spending Prediction**: Predict future spending patterns
3. **Category Recommendation**: Auto-categorize transactions
4. **Savings Goal Optimization**: Recommend budget allocations
5. **Fraud Detection**: Detect suspicious transactions

## 📝 Logging & Debugging

### Cloud Functions Logs
```bash
firebase functions:log
```

### Debug Endpoint
```bash
curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  https://europe-west1-evidence-vydaju.cloudfunctions.net/debugRecurring
```

## 🔄 Recurring Transactions Flow

```
1. User nastaví opakující se transakci
   ↓
2. `generateRecurringTransactions` (daily 2:00 AM)
   - Iteruje všechny uživatele
   - Kontroluje recurrence rules
   - Generuje pending transactions
   - Loguje výsledky
   ↓
3. PendingTransactions komponenta
   - Auto-refreshuje každých 30 sekund
   - Zobrazuje statistiky
   - Umožňuje schvalování/odmítnutí
   ↓
4. User schválí
   - Transakce se přesune do hlavního seznamu
   - Pending záznam se smaže
   - Toast notifikace s výsledkem
```

## 📋 Best Practices

### Error Handling
- ✅ Try/catch ve všech async funkcích
- ✅ Detailed error messages
- ✅ Graceful degradation
- ✅ User-friendly toast notifications

### Data Validation
- ✅ Server-side validation v Cloud Functions
- ✅ Client-side validation v React
- ✅ Type checking (částka > 0, atd.)
- ✅ Empty string checks

### Performance
- ✅ Component memoization
- ✅ Callback optimization
- ✅ Efficient Firestore queries
- ✅ Response time tracking

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

**Last Updated**: 2026-05-30  
**Version**: 1.0.0  
**Status**: Production Ready ✅

# 🚀 ML Pipeline Deployment Checklist

## ✅ Status: DEPLOYED

Cloud Functions nasazeny úspěšně na Firebase!

```
✓ functions[runMlPipeline(europe-west1)] Successful update operation.
✓ Deploy complete!
```

---

## 🔍 Ověření nasazení

### 1. V Firebase Console
```
https://console.firebase.google.com/project/<your-project-id>/functions
```

Měl bys vidět:
- ✅ `runMlPipeline` (europe-west1) - **ACTIVE**
- ✅ Trigger: **Pub/Sub (Scheduled)**
- ✅ Schedule: `0 0 */3 * *` (každé 3 dny v 00:00 UTC)

### 2. Cloud Scheduler
```
https://console.cloud.google.com/cloudscheduler?project=<your-project-id>
```

Měl bys vidět:
- ✅ `firebase-schedule-runMlPipeline-europe-west1`
- ✅ Status: **ENABLED**
- ✅ Frequency: `0 0 */3 * *`
- ✅ Next execution: [čas v UTC]

### 3. Manuální test (Spustit nyní)

V Cloud Scheduler:
1. Klikni na job `firebase-schedule-runMlPipeline-*`
2. Klikni **"FORCE RUN"**
3. Čekej 30-60 sekund
4. Zkontroluj Logs v Firebase Console (Functions → Logs)

Měl bys vidět:
```
mlPipeline_started
mlPipeline_usersLoaded count: X
mlPipeline_predictionSaved ...
mlPipeline_completed
```

---

## 📊 Cron Výraz Vysvětlení

```
0 0 */3 * *
│ │ │   │ │
│ │ │   │ └─ Den v týdnu (0-7)
│ │ │   └─── Měsíc (1-12)
│ │ └─────── Den (1-31) — */3 = každý 3. den (1, 4, 7, 10, 13...)
│ └───────── Hodina (0-23) — 0 = 00:00 (půlnoc UTC)
└─────────── Minuta (0-59) — 0 = 00 minut
```

**Výsledek:** Spuštění v **00:00 UTC** na dnech **1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31** každého měsíce.

---

## 🔧 Monitorování

### Funkční logy
```bash
firebase functions:log --limit 50
```

### Ručně spustit pipeline (dev/test)
V Google Cloud Console:
1. Cloud Scheduler → Job → Force Run
2. Čekej 60 sekund
3. Zkontroluj Firestore (mlRuns collection)

### Ověřit, že se data ukládají
```
Firebase Console → Firestore Database
```

Měl bys vidět:
- ✅ `mlRuns/` - log z posledního běhu
- ✅ `users/{uid}/mlPredictions/` - predikce pro každého uživatele

---

## ⏰ Kdy se spustí poprvé?

Pipeline se spustí v příštím *3-denním intervalu* od `0 0 */3 * *`:

Pokud je dnes:
- **1. červen** → spuštění 1., 4., 7., 10., 13., 16., 19., 22., 25., 28., 31. v 00:00 UTC
- **2. červen** → spuštění 4., 7., 10., ... v 00:00 UTC (čekej do 4. dne)

**Pokud potřebuješ spustit TEĎ:**
→ Cloud Scheduler → Force Run

---

## ❓ FAQ

**Q: Paní, když se to nasadí, tak to hned běží?**
A: Ne. Běží automaticky v časy určené cron výrazem (`0 0 */3 * *`). Chcete-li spustit teď, použijte Force Run v Cloud Scheduleru.

**Q: Vidí všichni stejné predikce?**
A: Ne. Každý uživatel má SVOU predikci v `users/{uid}/mlPredictions`, vypočítanou z JEHO dat.

**Q: Kolik to stojí?**
A: Velmi málo (~$0.40/měsíc za 10 spuštění).

**Q: Jak vidím, jestli pipeline běží?**
A: Firebase Console → Functions → Logs + Firestore → mlRuns collection.

---

## 📝 Příští kroky

- [ ] Ověř nasazení v Firebase Console
- [ ] Manuálně spusť Force Run
- [ ] Zkontroluj, že se vytvořily dokumenty v mlRuns
- [ ] Zkontroluj, že se vytvořily predikce v users/{uid}/mlPredictions
- [ ] Přihlaš se do app → Admin Panel → 🤖 Predikce (měl by být vidět data)

---

**Deployment dokončen!** 🎉

*Generated: 2026-06-02*

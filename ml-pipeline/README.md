# Level 2 ML Pipeline – Shadow Mode

> **Aktuální Status**: Shadow Mode  
> Level 2 běží vedle Level 1, ale zatím není aktivní. Frontend stále používá Level 1 jako hlavní predikci.

## Co je Level 2?

**Level 1** (baseline average) – běží teď:
- Jednoduchá predikce podle průměrů
- Bez ML algoritmů
- Stabilní, spolehlivá
- Primární zdroj predikce pro uživatele

**Level 2** (ML pipeline) – nový, v shadow mode:
- RandomForestRegressor (scikit-learn)
- Feature engineering (trendy, historické údaje, kategorie)
- Vlastní metriky a predikce
- Porovnání s Level 1
- Zatím nenahrazuje Level 1 v UI

## Proč shadow mode?

Chceme:
- ✅ Spustit Level 2 vedle Level 1
- ✅ Sbírat metriky a data
- ✅ Porovnávat Level 1 vs Level 2
- ✅ Monitorovat kvalitu bez rizika
- ❌ Zatím neměnit UI pro běžné uživatele
- ❌ Zatím neovlivňovat produkční predikce

## Struktura projektu

```
ml-pipeline/
├── Dockerfile
├── requirements.txt
├── README.md
├── .env.example
└── src/
    ├── main.py                 # Hlavní entry point
    ├── config.py               # Konfigurace, konstanty
    ├── firestore_client.py     # Komunikace s Firestore
    ├── feature_engineering.py  # Příprava dat
    ├── train_model.py          # Trénování modelu
    ├── evaluate_model.py       # Evaluace modelu
    ├── baseline_model.py       # Fallback (jestli není dost dat)
    ├── compare_predictions.py  # Porovnání Level 1 vs Level 2
    └── save_predictions.py     # Uložení predikací do Firestore
```

## Jak spustit

### Ručně (lokálně)

```bash
cd ml-pipeline
python -m pip install -r requirements.txt
export GOOGLE_APPLICATION_CREDENTIALS="path/to/firebase-key.json"
python src/main.py
```

### Přes Docker

```bash
docker build -t ml-pipeline .
docker run --env-file .env ml-pipeline
```

### Bez credentials? Zkuste Firebase emulator

```bash
firebase emulators:start --only firestore
export FIREBASE_EMULATOR_HOST=localhost:8080
python src/main.py
```

## Co pipeline dělá?

1. **Načte transakce** ze Firestore (`users/{uid}/vydaje`)
2. **Připraví features** (kategorie, trendy, průměry, den v týdnu, apod.)
3. **Kontrola podmínek**:
   - Je dost dat (3+ měsíce, 30+ transakcí)?
   - Ano → Trénuje RandomForest
   - Ne → Používá baseline fallback
4. **Vytvoří predikci** na další měsíc
5. **Vypočítá metriky** (MAE, MAPE, apod.)
6. **Porovná s Level 1** – jak se liší?
7. **Uloží do Firestore**:
   - Predikci: `users/{uid}/mlPredictions/{id}`
   - Běh: `mlRuns/{id}`

## Výstup predikce (Level 2)

```json
{
  "month": "2026-07",
  "totalPredictedExpense": 16850,
  "categories": {
    "doprava": 2900,
    "jidlo": 7600,
    "bydleni": 4300,
    "zabava": 2050
  },
  "confidence": "medium",
  "pipelineLevel": 2,
  "modelType": "random-forest-regressor",
  "modelVersion": "expense-predictor-ml-v1",
  "active": false,
  "shadowMode": true,
  "createdAt": "server-timestamp",
  "metrics": {
    "mae": 680,
    "mape": 12.5,
    "trainingRows": 850,
    "testRows": 180
  }
}
```

## Výstup ML běhu

```json
{
  "status": "success",
  "pipelineLevel": 2,
  "mode": "shadow",
  "modelType": "random-forest-regressor",
  "modelVersion": "expense-predictor-ml-v1",
  "startedAt": "server-timestamp",
  "finishedAt": "server-timestamp",
  "usersProcessed": 12,
  "predictionsCreated": 12,
  "trainingRows": 850,
  "testRows": 180,
  "mae": 680,
  "mape": 12.5,
  "fallbackUsed": false,
  "level1ComparisonAvailable": true,
  "averageDifferenceFromLevel1": 550,
  "errorMessage": null
}
```

## Fallback (málo dat)

Pokud nemá uživatel dost dat pro ML model, pipeline automaticky vrátí baseline:

```json
{
  "status": "success_with_fallback",
  "pipelineLevel": 2,
  "mode": "shadow",
  "modelType": "baseline-fallback",
  "modelVersion": "expense-predictor-baseline-fallback-v1",
  "fallbackUsed": true,
  "fallbackReason": "not_enough_training_data",
  "shadowMode": true,
  "active": false,
  "totalPredictedExpense": 15000,
  "categories": { "doprava": 2800, "jidlo": 7200, ... }
}
```

## Minimální podmínky pro ML model

- ✅ Uživatel má 3+ měsíců dat
- ✅ 30+ výdajových transakcí
- ✅ Po feature engineeringu dost trénovacích řádků
- ✅ Model se úspěšně natrénuje

Pokud není splněno → fallback baseline

## Features, které model používá

```
- userId
- amount
- category
- type (prijem/vydaj)
- date
- year, month, dayOfWeek, isWeekend, monthIndex
- categoryMonthlyTotal (kolik v kategorii v měsíci)
- categoryTransactionCount (kolik transakcí v kategorii)
- categoryAverageTransaction (průměr transakcí v kategorii)
- totalMonthlyExpense (celkem za měsíc)
- previousMonthCategoryTotal (co v kategorii minulý měsíc)
- last3MonthsCategoryAverage (průměr za 3 měsíce)
- last6MonthsCategoryAverage (průměr za 6 měsíců)
- categoryShareOfTotal (jaký % z celkových výdajů)
- trendComparedToPreviousMonth (jestli roste/klesá)
```

## Porovnání Level 1 vs Level 2

Pipeline porovnává:
- Level 1 predikci
- Level 2 predikci
- Rozdíl v Kč a %

Výsledek se uloží do `mlRuns`:

```json
{
  "level1ComparisonAvailable": true,
  "level1PredictionAmount": 15000,
  "level2PredictionAmount": 16850,
  "differenceCzk": 1850,
  "differencePercent": 12.3,
  "averageDifferenceFromLevel1": 550
}
```

## Jak se Level 2 zobrazuje v UI?

Zatím **jen admin vidí**:
- V `MLPredictionPanel` → tabulka predikací
- Badge `[SHADOW MODE]` u Level 2 predikce
- Porovnání v `mlRuns` → tabulka běhů
- Metriky a chyby

Běžný uživatel:
- Vidí jen Level 1 (primární predikce)
- Level 2 je neviditelná v normálním UI

## Aktivace Level 2 (budoucnost)

Kdy se Level 2 stane primární predikcí?

Když budou splněny:
- ✅ Doběhne aspoň 5× bez chyby
- ✅ Fallback se nepoužívá > 20% času
- ✅ MAE < 10% z průměrného výdaje
- ✅ Métriky jsou stabilní
- ✅ Porovnání s Level 1 je konzistentní

Pak se v kódu změní:

```javascript
// appConfig/activePredictionLevel
{
  "activePredictionLevel": 2  // 1 → 2
}
```

Nebo:

```javascript
// Firestore flag v users/{uid}/
{
  "useLevel2Predictions": true
}
```

Frontend se automaticky přepne na Level 2 s fallbackem na Level 1.

## Technické detaily

### Struktura Firestore pro Level 2

```
users/{uid}/mlPredictions/
  ├── {predId-level1}/     (Level 1, active: true)
  ├── {predId-level2}/     (Level 2, active: false, shadowMode: true)
```

Obě jsou uloženy v **jedné kolekci**, ale se **různými příznaky**.

Admin může v MLPredictionPanel filtrovat:

```javascript
// Zobrazit jen aktivní (Level 1)
.where('active', '==', true)

// Zobrazit jen shadow (Level 2)
.where('shadowMode', '==', true)

// Porovnat oba
```

### Jak Level 2 čte data?

```python
# Stejná data jako Level 1
transactions = firestore_client.get_transactions(uid, months=12)

# Stejné kategorie
KATEGORIE_VYDAJ = ['doprava', 'jidlo', 'bydleni', 'sporeni', 'zabava', 'ostatni']

# Feature engineering
df = feature_engineering.prepare_features(transactions, uid)

# Trénování
model = RandomForestRegressor(...)
model.fit(X_train, y_train)

# Predikce
predictions = model.predict(X_test)

# Uložení
save_predictions.save_level2_prediction(uid, predictions, metrics)
```

## Monitoring a debugging

### Kontrola běhů

```bash
# Poslední běh
db.collection('mlRuns')
  .orderBy('startedAt', 'desc')
  .limit(1)
  .get()

# Status
- success
- success_with_fallback
- error
```

### Kontrola predikací

```bash
# Všechny Level 2 predikce
db.collection('users').doc(uid)
  .collection('mlPredictions')
  .where('pipelineLevel', '==', 2)
  .get()

# Porovnání
predictionLevel1 = {...}
predictionLevel2 = {...}
difference = predictionLevel2.total - predictionLevel1.total
```

## Bezpečnost

- ❌ Nešifrujeme hesla v logech
- ❌ Nešifrujeme Firebase tokeny
- ❌ Neshromažďujeme service account JSON v gitu
- ✅ Používáme `.env` pro credentials
- ✅ `.env` je v `.gitignore`
- ✅ `.env.example` je v repozitáři (bez tajemství)

## Troubleshooting

**"Not enough training data"**
- Uživatel má málo výdajů
- Pipeline použije fallback
- Zkontroluj `mlRuns` → fallbackReason

**"Model training failed"**
- Chyba v feature engineeringu?
- Zkontroluj `mlRuns` → errorMessage
- Zkontroluj logy pipeline

**"Firestore connection error"**
- Máš `GOOGLE_APPLICATION_CREDENTIALS`?
- Máš přístup k Firebase projektu?
- Zkontroluj `.env`

## Zdroje

- [scikit-learn RandomForest](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestRegressor.html)
- [Firebase Firestore Python SDK](https://cloud.google.com/python/docs/reference/firebase-admin/latest)
- [pandas documentation](https://pandas.pydata.org/)

---

**Aktuální verze**: v1.0 (Shadow Mode)  
**Poslední update**: 2026-06-03

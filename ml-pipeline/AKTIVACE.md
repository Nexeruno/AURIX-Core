# Aktivace Level 2 ML Pipeline

> Tento dokument popisuje, jak bezpečně aktivovat Level 2 jako primární predikční systém.

## Aktuální stav

- ✅ **Level 1**: Aktivní, produkční, zobrazuje se uživatelům
- 🔄 **Level 2**: Shadow mode, sbírá metriky, zatím neovlivňuje UI

## Kdy aktivovat Level 2?

Level 2 by měl být aktivován, když:

1. **Kvalita**: 
   - ✅ Doběhlo bez chyby minimálně 5×
   - ✅ MAE < 10% z průměrného měsíčního výdaje
   - ✅ MAPE < 15%
   - ✅ R² > 0.6

2. **Stabilita**:
   - ✅ Fallback se nepoužívá > 20% času
   - ✅ Chyby nejsou časté
   - ✅ Metriky jsou konzistentní

3. **Porovnání**:
   - ✅ Rozdíl od Level 1 < 20% u većiny uživatelů
   - ✅ Neexistují anomálie

4. **Plán zálohování**:
   - ✅ Fallback na Level 1 je implementován
   - ✅ Admin může okamžitě vypnout Level 2

## Jak aktivovat

### Krok 1: Zkontroluj metriky

V Firestore projektu:

```javascript
// Zkontroluj poslední běhy Level 2
db.collection('mlRuns')
  .where('pipelineLevel', '==', 2)
  .orderBy('startedAt', 'desc')
  .limit(5)
  .get()
```

Podívej se na:
- `status`: Měl by být "success"
- `mae`, `mape`: Měly by být pod mezemi
- `fallbackUsed`: Měl by být `false`

### Krok 2: Porovnání s Level 1

```javascript
// Zkontroluj porovnání
db.collection('mlRuns')
  .where('pipelineLevel', '==', 2)
  .where('level1ComparisonAvailable', '==', true)
  .orderBy('startedAt', 'desc')
  .limit(10)
  .get()
  .then(snapshot => {
    const differences = snapshot.docs.map(d => d.data().averageDifferenceFromLevel1);
    const avgDiff = differences.reduce((a, b) => a + b) / differences.length;
    console.log(`Average difference from Level 1: ${avgDiff.toFixed(0)} Kč`);
  });
```

Rozdíl by neměl překročit 20% průměrného výdaje.

### Krok 3: Zapni Level 2

Máte 2 možnosti:

#### Možnost A: Globální aktivace (všichni uživatelé)

V `appConfig` kolekci v Firestore vytvoř dokument:

```json
{
  "activePredictionLevel": 2,
  "activatedAt": "server-timestamp",
  "activatedBy": "admin@example.com",
  "fallbackLevel": 1
}
```

Nebo v kódu:

```javascript
// src/utils/firebase.js - přidej helper
export async function getActivePredictionLevel() {
  const doc = await getDoc(doc(db, 'appConfig', 'predictions'));
  return doc.data()?.activePredictionLevel || 1;
}

// Pak v komponentě
const activeLevel = await getActivePredictionLevel();
// Zobrazuj predikce podle activeLevel
```

#### Možnost B: Per-user aktivace

V `users/{uid}` dokumentu nastav:

```json
{
  "useLevel2Predictions": true,
  "level2ActivatedAt": "server-timestamp"
}
```

Pak v komponentě:

```javascript
const useLevel2 = userData?.useLevel2Predictions ? 2 : 1;
// Zobrazuj predikce podle useLevel2
```

### Krok 4: Aktualizuj frontend

V `MLPredictionPanel.jsx` nebo hlavní predikcích se zobrazují oba levely. Přidej fallback logiku:

```javascript
// Přihlas Level 2, ale s fallbackem na Level 1
async function getPredictionForDisplay(uid) {
  const activeLevel = await getActivePredictionLevel();
  
  // Pokus se načíst aktivní level
  let prediction = await loadPrediction(uid, activeLevel);
  
  // Pokud selže nebo je starší 3 dny, fallback na Level 1
  if (!prediction || isPredictionTooOld(prediction)) {
    logger.warn(`Fallback to Level 1 for ${uid}`);
    prediction = await loadPrediction(uid, 1);
  }
  
  return prediction;
}
```

### Krok 5: Monitoring

Po aktivaci kontroluj:

```javascript
// Kontrola error rate
db.collection('mlRuns')
  .where('pipelineLevel', '==', 2)
  .where('status', '!=', 'success')
  .get()
  .then(snap => console.log(`Errors: ${snap.size}`));

// Kontrola fallback rate
db.collection('mlPredictions')
  .where('fallbackUsed', '==', true)
  .where('pipelineLevel', '==', 2)
  .get()
  .then(snap => console.log(`Fallbacks: ${snap.size}`));
```

## Deaktivace (nouzové zastavení)

Pokud se objeví problémy, rychle vypni Level 2:

```javascript
// V admin panelu
await updateDoc(doc(db, 'appConfig', 'predictions'), {
  activePredictionLevel: 1,
  disabledAt: serverTimestamp(),
  disabledReason: "Anomálie v metriky detekována"
});
```

Nebo per-user:

```javascript
// Vypni pro jednoho uživatele
await updateDoc(doc(db, 'users', uid), {
  useLevel2Predictions: false
});
```

## Plán postupné aktivace

### Fáze 1: Beta (Shadow Mode - **Aktuální**)
- Level 2 běží v pozadí
- Sbírá metriky
- Admin vidí porovnání
- Běžní uživatelé nevidí Level 2

### Fáze 2: Opt-in
- Vybraní uživatelé vidí Level 2 v UI
- Per-user flag: `useLevel2Predictions: true`
- Kontroluj chyby na malé skupině

### Fáze 3: Výchozí (Gradual Rollout)
- Level 2 je výchozí pro nové uživatele
- Stávající uživatelé mohou zůstat u Level 1
- Monitoring fallbacků

### Fáze 4: Produkce (Full Rollout)
- Level 2 je primární pro všechny
- Level 1 je fallback
- Údržba, monitorování

## Kontrolní seznam před aktivací

- [ ] Poslední 5 běhů Level 2 były uspěšné
- [ ] Žádné kritické chyby v `mlRuns`
- [ ] MAE a MAPE pod přijatelnými meze
- [ ] Průměrný rozdíl od Level 1 < 20%
- [ ] Fallback se nepoužívá > 20%
- [ ] Frontend fallback logika je implementována
- [ ] Admin panel je připraven
- [ ] Monitoring je nastavený
- [ ] Máš plán pro deaktivaci v nouzi

## Monitoring po aktivaci

### Daily checks
```bash
# Počet běhů
db.collection('mlRuns').where('pipelineLevel', '==', 2).get().then(s => console.log(s.size))

# Počet chyb
db.collection('mlRuns').where('pipelineLevel', '==', 2).where('status', '!=', 'success').get()

# Průměr MAE za den
db.collection('mlRuns')
  .where('pipelineLevel', '==', 2)
  .where('status', '==', 'success')
  .orderBy('startedAt', 'desc')
  .limit(10)
  .get()
```

### Weekly checks
- Trend MAE/MAPE
- Fallback frequency
- Porovnání s Level 1
- Uživatelské feedback

## Zdroje

- [README.md](./README.md) - Technické detaily
- [config.py](./src/config.py) - Konfigurace
- [evaluate_model.py](./src/evaluate_model.py) - Metriky

---

**Poslední update**: 2026-06-03  
**Status**: Připraveno pro aktivaci (po ověření metrik)

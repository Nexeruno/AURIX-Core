# FÁZE 3.3B: Python Train-Ready Dataset Loader

## Status: ✅ HOTOVO

---

## Umístění

| Soubor | Řádky | Popis |
|--------|-------|-------|
| `ml-pipeline/src/dataset_loader.py` | 1–411 | Main loader module |
| `ml-pipeline/src/test_dataset_loader.py` | 1–304 | Test suite |

---

## Co Loader Dělá

Loader pro train-ready dataset exportovaný z Cloud Functions endpointu (`exportTrainReadyDataset`).

**Funkce:**
1. Načte JSON dataset
2. Validuje všechny rows (shape, fieldy, typy)
3. Vrací strukturované Python objekty (DatasetRow)
4. Konvertuje na pandas DataFrame
5. Generuje summary statistiky

---

## Vstup Loaderu

### Expected Input Format

```json
{
  "success": true,
  "metadata": {
    "exportedAt": "2026-06-07T14:30:00Z",
    "version": "1.0",
    "format": "json_array",
    "totalRecords": 150,
    "trainReadyRecords": 142,
    "excludedRecords": 8
  },
  "rows": [
    {
      "userId": "user123",
      "month": "2024-01",
      "features": {
        "avgExpense3m": 15200,
        ...12 more features...
      },
      "target": 14200,
      "metadata": {
        "feedbackType": "l2_manual_feedback",
        "recordId": "doc_abc123",
        "predictedTotal": 13800,
        "actualTotal": 14200
      }
    }
    ...more rows...
  ]
}
```

---

## Validace Logiky

### Required Row Fields
- ✅ `userId` - string, non-empty
- ✅ `month` - string, YYYY-MM format
- ✅ `features` - dict with 13 specific fields
- ✅ `target` - number, finite, >= 0
- ✅ `metadata` - dict (optional, defaults to {})

### Required Features (13 fields)
```
avgExpense3m, avgExpense6m, avgExpense12m
avgIncome3m, avgIncome6m, avgIncome12m
volatilityScore, regularityScore, feedbackCount
avgManualCorrectionFactor, avgAutoCorrectionFactor, avgFinalCorrectionFactor
```

**Každá feature musí být:**
- Finite number (ne NaN, ne Infinity)
- Konvertibilní na float

### Validace Workflow
1. Check all required fields present
2. Validate userId (non-empty string)
3. Validate month (YYYY-MM regex)
4. Validate target (non-null, finite, >= 0)
5. Validate features dict exists
6. Check all 13 required features present
7. Check all feature values are finite numbers

---

## Jak Používat Loader

### Basic Usage

```python
from dataset_loader import TrainReadyDatasetLoader

# Load from JSON dict
loader = TrainReadyDatasetLoader()
if loader.load_from_json(json_data):
    success, count = loader.validate()
    if success:
        rows = loader.get_validated_rows()
        df = loader.to_dataframe()
```

### Load from File

```python
loader = TrainReadyDatasetLoader()
if loader.load_from_file('dataset.json'):
    success, count = loader.validate()
```

### Convenience Function

```python
from dataset_loader import load_and_validate_dataset

success, loader = load_and_validate_dataset(json_data)
if success:
    df = loader.to_dataframe()
    loader.print_summary()
```

---

## DatasetRow struktura

```python
@dataclass
class DatasetRow:
    user_id: str                    # "user123"
    month: str                      # "2024-01"
    features: Dict[str, float]      # 13 feature values
    target: float                   # 14200.0
    metadata: Dict[str, Any]        # feedbackType, recordId, etc.
```

### to_dict() metoda

```python
row.to_dict()
# Returns:
# {
#   'user_id': 'user123',
#   'month': '2024-01',
#   'features': {...},
#   'target': 14200.0,
#   'metadata': {...}
# }
```

---

## Output Formáty

### 1. Validated Rows (Python Objects)

```python
loader.get_validated_rows()
# Returns: List[DatasetRow]
```

### 2. Pandas DataFrame

```python
df = loader.to_dataframe()
# Columns:
#   - user_id, month, target (identifiers + label)
#   - avgExpense3m, avgExpense6m, ..., avgFinalCorrectionFactor (features)
#   - metadata (as JSON string)
```

**Shape:** (N, 16) kde N je počet validních rows

### 3. Summary Statistics

```python
summary = loader.get_summary()
# {
#   'exportedAt': '2026-06-07T14:30:00Z',
#   'version': '1.0',
#   'format': 'json_array',
#   'totalRecords': 150,
#   'trainReadyRecords': 142,
#   'excludedRecords': 8,
#   'validatedRows': 142,
#   'validationErrors': 0,
#   'featureStats': {
#     'avgExpense3m': {'mean': ..., 'std': ..., 'min': ..., 'max': ...},
#     ...
#   }
# }
```

### 4. Human-Readable Summary

```python
loader.print_summary()
# Prints:
# ============================================================
# TRAIN-READY DATASET SUMMARY
# ============================================================
# Exported At:      2026-06-07T14:30:00Z
# Format:           json_array
# Version:          1.0
#
# Records:
#   Total:          150
#   Train-Ready:    142
#   Excluded:       8
#
# Validation:
#   Valid Rows:     142
#   Errors:         0
# ============================================================
```

---

## Ověřená Chování

### ✅ Akceptuje
- Valid dataset s 13 features
- Rows s metadata (i pokud je prázdné)
- Zero targets (actualTotal = 0 je legitimní)
- Missing metadata (defaults to empty dict)

### ❌ Odmítá
- Rows bez userId
- Rows bez month
- Rows bez features
- Rows s null/NaN target
- Rows s chybějícími features
- Rows s nevalidními feature valuesami (NaN, Infinity, non-numeric)
- Invalid month format (ne YYYY-MM)

### 🔍 Chyby Jsou Loggy

```
Row 5: missing field 'target'; 'features'
Row 12: target is not a number: ValueError
Row 23: missing features ['avgExpense3m', 'volatilityScore']
```

---

## Testování

### Test Suite (`test_dataset_loader.py`)

Zahrnuje 4 testy:

1. **Valid Dataset** - Načte a validuje korektní dataset
2. **Invalid Rows** - Správně identifikuje invalid rows
3. **Missing Fields** - Odmítne rows s chybějícími fieldy
4. **Invalid Month Format** - Odmítne neplatný formát měsíce

### Spuštění

```bash
cd ml-pipeline
python src/test_dataset_loader.py
```

**Poznámka:** Testy vyžadují pandas (v requirements.txt)

---

## Python Validation

✅ **Syntax check:** OK (py_compile)
✅ **Type hints:** Ano (Python 3.9+ compatible)
✅ **Imports:** pandas, numpy, logging, json, dataclass
✅ **Error handling:** Try-catch pro vše

---

## Integration do Pipeline

Loader je připravený na integraci do `main.py`:

```python
from dataset_loader import load_and_validate_dataset

# V Level2Pipeline.__init__() nebo run():
json_export = fetch_from_endpoint('/exportTrainReadyDataset')
success, loader = load_and_validate_dataset(json_export)

if success:
    df = loader.to_dataframe()
    # Pass df to model training
```

---

## Příklad Kódu

```python
from dataset_loader import TrainReadyDatasetLoader
import requests

# 1. Fetch dataset from Cloud Functions
response = requests.get('https://...exportTrainReadyDataset')
json_data = response.json()

# 2. Load and validate
loader = TrainReadyDatasetLoader()
loader.load_from_json(json_data)
success, count = loader.validate()

# 3. Get structured data
if success:
    # Option A: as Python objects
    rows = loader.get_validated_rows()
    for row in rows:
        print(f"{row.user_id} {row.month}: target={row.target}")
    
    # Option B: as DataFrame
    df = loader.to_dataframe()
    print(df.head())
    
    # Option C: with summary
    loader.print_summary()
```

---

## Příští Kroky (mimo 3.3B)

- ❌ Feature scaling/normalization
- ❌ Train/test split
- ❌ Model training
- ❌ Cross-validation
- ❌ Feature importance
- ❌ CSV export

**Tyto věci jsou mimo scope FÁZE 3.3B.**

---

## Stav

✅ **Dataset loader je PLNĚ FUNKČNÍ**
- Validuje všechny rows
- Jasně reportuje chyby
- Konvertuje na DataFrame
- Generuje summary

**Připraveno pro budoucí Python training pipeline.**

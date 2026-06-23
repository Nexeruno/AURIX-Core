# FÁZE 3.3C: Dataset Sanity Check Script

## Status: ✅ HOTOVO

---

## Umístění

| Soubor | Obsah |
|--------|-------|
| `ml-pipeline/src/sanity_check.py` | Main script (282 lines) |
| `ml-pipeline/sample_dataset.json` | Valid sample dataset for testing |
| `ml-pipeline/sample_invalid.json` | Invalid sample dataset for testing |

---

## Co Script Dělá

Offline rychlá ověření, že train-ready dataset vypadá rozumně pro ML training.

**Nedělá:**
- Model training
- Feature scaling
- Statistical analysis
- Grafy

**Dělá:**
- Načte JSON dataset
- Validuje shape všech rows
- Spočítá statistiky
- Hlásí problémy jasně

---

## Jak Se Spouští

### Default (hledá dataset_export.json v aktuálním adresáři)
```bash
cd ml-pipeline
python src/sanity_check.py
```

### S konkrétním souborem
```bash
python src/sanity_check.py path/to/dataset.json
```

### Příklady
```bash
# Test s validním datasetetem
python src/sanity_check.py sample_dataset.json

# Test s invalidním datasetetem
python src/sanity_check.py sample_invalid.json
```

---

## Co Script Ověřuje a Reportuje

### Počty
```
Total Rows:       150  (všechny rows v datasetu)
Valid Rows:       142  (rows které prošly validací)
Invalid Rows:     8    (rows které neprošly)
Invalid Percent:  5.3% (procento invalid rows)
Unique Users:     35   (počet unikátních userů)
Feature Columns:  12   (počet feature columns)
```

### Metadata
```
Exported At: 2026-06-07T14:30:00Z
Version:     1.0
```

### Quality Checks
```
OK: Has valid rows           (aspoň 1 valid row)
OK: Has multiple users       (aspoň 2 unikátní uživatelé)
OK: Valid rows >= 80%        (méně než 20% invalid)
OK: Has 12 features          (přesně 12 features)
```

### Verdikt
```
PASS: Dataset looks reasonable for training!
FAIL: Dataset has issues that should be reviewed.
FAIL: Dataset has critical errors. Cannot use.
```

---

## Validační Kritéria

### Row Je Validní Když Má
- ✅ `userId` - non-empty string
- ✅ `month` - YYYY-MM format
- ✅ `features` - dict se všemi 12 fields
- ✅ `target` - finite number (>= 0, ne null, ne NaN)
- ✅ Všechny feature values jsou finite numbers

### Row Je Invalidní Když
- ❌ Chybí userId
- ❌ Chybí month
- ❌ Invalid month format (ne YYYY-MM)
- ❌ Chybí features dict
- ❌ Chybí některý z 12 features
- ❌ Target je null nebo NaN
- ❌ Feature value je non-numeric

---

## Success Kritéria

Script vrací SUCCESS pokud:
- `validRows >= 80%` OF totalRows
  - NEBO -
- `validRows >= 10` AND `uniqueUsers >= 2`

Script vrací FAILURE pokud:
- Nedostatečně valid rows
- Příliš málo unikátních uživatelů
- Kritické chyby v datasetu

---

## Příklad Output (PASS)

```
======================================================================
 TRAIN-READY DATASET SANITY CHECK
======================================================================

Status: PASS
Exported: 2026-06-07T14:30:00Z
Version:  1.0

Dataset Shape:
  Total Rows:       150
  Valid Rows:       142
  Invalid Rows:     8
  Invalid Percent:  5.3%
  Unique Users:     35
  Feature Columns:  12

Quality Checks:
  OK: Has valid rows
  OK: Has multiple users
  OK: Valid rows >= 80%
  OK: Has 12 features

======================================================================

VERDICT: Dataset looks reasonable for training!
```

---

## Příklad Output (FAIL)

```
======================================================================
 TRAIN-READY DATASET SANITY CHECK
======================================================================

Status: FAIL
Exported: 2026-06-07T14:30:00Z
Version:  1.0

Dataset Shape:
  Total Rows:       5
  Valid Rows:       1
  Invalid Rows:     4
  Invalid Percent:  80.0%
  Unique Users:     1
  Feature Columns:  12

Warnings:
  ! High invalid row percentage: 80.0% (4/5)
  ! Low valid row count: 1 (recommended >= 10)
  ! Low user diversity: 1 user(s) (recommended >= 2)

Quality Checks:
  OK: Has valid rows
  FAIL: Has multiple users
  FAIL: Valid rows >= 80%
  OK: Has 12 features

======================================================================

VERDICT: Dataset has issues that should be reviewed.
```

---

## 12 Required Features

```
1. avgExpense3m            - Average expense 3 months
2. avgExpense6m            - Average expense 6 months
3. avgExpense12m           - Average expense 12 months
4. avgIncome3m             - Average income 3 months
5. avgIncome6m             - Average income 6 months
6. avgIncome12m            - Average income 12 months
7. volatilityScore         - Spending volatility (0-1)
8. regularityScore         - Income regularity (0-1)
9. feedbackCount           - Number of feedback records
10. avgManualCorrectionFactor    - Average manual correction
11. avgAutoCorrectionFactor      - Average auto correction
12. avgFinalCorrectionFactor     - Average final correction
```

---

## Warnings

Script vrací varování (ale ne failure) pokud:
- Invalid row percent > 10%
  ```
  ! High invalid row percentage: 15.0% (15/100)
  ```

- Valid row count < 10
  ```
  ! Low valid row count: 3 (recommended >= 10)
  ```

- Unique users < 2
  ```
  ! Low user diversity: 1 user(s) (recommended >= 2)
  ```

- Feature count mismatch
  ```
  ! Feature count mismatch: 11 vs expected 12
  ```

---

## Exit Codes

```
0 - Dataset PASSED sanity check
1 - Dataset FAILED sanity check or errors occurred
```

---

## Python Validation

✅ **Syntax:** OK (py_compile)
✅ **Runtime:** Tested with valid and invalid datasets
✅ **Error Handling:** Try-catch pro file operations
✅ **Logging:** logger.info pro progress, .error pro chyby

---

## Verwendungsbeispiele

### Check provided dataset
```python
python src/sanity_check.py exported_dataset.json
```

### Výsledek: PASS
```
Status: PASS
Total Rows: 150
Valid Rows: 142
VERDICT: Dataset looks reasonable for training!
```

### Výsledek: FAIL
```
Status: FAIL
Valid Rows: 2
Warnings: High invalid row percentage, Low user diversity
VERDICT: Dataset has issues that should be reviewed.
```

---

## Integration do Pipeline

```python
import subprocess
import sys

# Run sanity check
result = subprocess.run(
    [sys.executable, 'src/sanity_check.py', 'dataset.json'],
    capture_output=True
)

if result.returncode == 0:
    print("Dataset OK - can proceed to training")
else:
    print("Dataset has issues - review warnings")
```

---

## Příští Kroky (mimo 3.3C)

- ❌ Feature statistics
- ❌ Distribution analysis
- ❌ Outlier detection
- ❌ Data visualization
- ❌ Model training

**Tyto věci jsou mimo scope FÁZE 3.3C.**

---

## Stav

✅ **Sanity check script je PLNĚ FUNKČNÍ**
- Ověřuje dataset shape
- Hlásí problémy jasně
- Vrací exit code pro automation
- Pracuje offline bez Dependencies (pouze json, sys)

**Připraveno pro use v ML pipeline automation.**

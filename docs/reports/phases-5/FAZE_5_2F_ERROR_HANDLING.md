# FÁZE 5.2F: Error Handling for Dataset-Backed Python Runtime

**Status:** ✅ **COMPLETE**  
**Date:** 2026-06-07  
**Mission:** Add failure handling for missing features, invalid state, inconsistent rows with readable errors

---

## Executive Summary

**FÁZE 5.2F Objective:** *"Přidej failure handling pro: missing required feature, invalid target state, inconsistent dataset row. Vrať čitelnou chybu zpět do Node/Firebase vrstvy"*

**Status:** ✅ **ACHIEVED**

Error handling now includes:
- ✅ Missing required feature detection (category, amount, date)
- ✅ Invalid target state detection (no valid dates)
- ✅ Inconsistent dataset row detection (negative amounts, type errors)
- ✅ Readable error messages returned to Node layer
- ✅ Proper HTTP status codes (400 for validation errors)
- ✅ Structured error logging

---

## Error Types Handled

### 1. MISSING_REQUIRED_FEATURE

**Occurs when:** Required field is missing or empty

**Examples:**
- Row missing `category`
- Row missing `amount`
- Row missing `date`

**Error message:**
```
Row 0: Missing required feature 'category'
```

**HTTP code:** 400 Bad Request

---

### 2. INCONSISTENT_DATASET_ROW

**Occurs when:** Row has malformed or inconsistent data

**Examples:**
- Negative amount: `amount: -100.0`
- Empty string: `category: ""`
- Wrong type in wrong place

**Error message:**
```
Row 2: 'amount' cannot be negative (-100.0)
Row 1: 'category' cannot be empty
```

**HTTP code:** 400 Bad Request

---

### 3. FEATURE_VALUE_ERROR

**Occurs when:** Feature value has invalid type or format

**Examples:**
- Amount is string: `amount: "100.0"` (should be number)
- Category is object: `category: {}`
- Date is number: `date: 20260101`

**Error message:**
```
Row 2: 'amount' must be numeric, got str
Row 3: 'date' must be string, got int
```

**HTTP code:** 400 Bad Request

---

### 4. INVALID_TARGET_STATE

**Occurs when:** Cannot determine targets (monthly aggregates)

**Examples:**
- No valid dates in YYYY-MM format
- Too many invalid dates (>50%)
- All dates malformed

**Error message:**
```
Cannot extract targets: no valid dates in YYYY-MM format
Too many invalid dates (12/20)
```

**HTTP code:** 400 Bad Request

---

### 5. DATASET_TOO_SMALL

**Occurs when:** Dataset is empty

**Error message:**
```
Dataset cannot be empty
```

**HTTP code:** 400 Bad Request

---

## Implementation

### DatasetErrorHandler Class

New class with validation methods:

```python
class DatasetErrorHandler:
    - validate_required_features(transactions) → (is_valid, error_msg, error_type)
    - validate_row_consistency(transactions) → (is_valid, error_msg, error_type)
    - validate_target_state(transactions) → (is_valid, error_msg, error_type)
```

Each method returns:
1. **is_valid** (bool) — Did validation pass?
2. **error_message** (str) — Readable error description
3. **error_type** (str) — Error category (for logging/classification)

---

## Error Flow

```
Dataset arrives
  ↓
validate_required_features()
  └─ Check each row has category, amount, date
  └─ If missing → return MISSING_REQUIRED_FEATURE
  ↓
validate_row_consistency()
  └─ Check types, ranges, values
  └─ If inconsistent → return INCONSISTENT_DATASET_ROW or FEATURE_VALUE_ERROR
  ↓
validate_target_state()
  └─ Check can extract monthly targets
  └─ If unable → return INVALID_TARGET_STATE
  ↓
All valid → Proceed to computation
```

---

## Response Examples

### Error Response Format

```json
{
  "status": "failed",
  "error": "Row 2: Missing required feature 'amount'",
  "uid": "user-123",
  "debugMetadata": {
    "processingTimeMs": 5
  }
}
```

**Fields:**
- `status`: "failed"
- `error`: Readable error message
- `uid`: User ID (for correlation)
- `debugMetadata.processingTimeMs`: Time before error

### Example Error Responses

#### Missing Feature

```json
{
  "status": "failed",
  "error": "Row 0: Missing required feature 'category'",
  "uid": "user-123",
  "debugMetadata": {"processingTimeMs": 3}
}
```

#### Inconsistent Row

```json
{
  "status": "failed",
  "error": "Row 5: 'amount' cannot be negative (-50.0)",
  "uid": "user-123",
  "debugMetadata": {"processingTimeMs": 4}
}
```

#### Invalid Type

```json
{
  "status": "failed",
  "error": "Row 2: 'amount' must be numeric, got str",
  "uid": "user-123",
  "debugMetadata": {"processingTimeMs": 2}
}
```

#### Invalid Target State

```json
{
  "status": "failed",
  "error": "Cannot extract targets: no valid dates in YYYY-MM format",
  "uid": "user-123",
  "debugMetadata": {"processingTimeMs": 5}
}
```

#### Empty Dataset

```json
{
  "status": "failed",
  "error": "Dataset cannot be empty",
  "uid": "user-123",
  "debugMetadata": {"processingTimeMs": 2}
}
```

---

## Logging

### Error Logging

When error occurs:

```
logger.error(f'Missing required feature: Row 0: Missing required feature 'category'')
logger.error({
  'event': '[ERROR] Dataset validation failed',
  'uid': 'user-123',
  'errorType': 'MISSING_REQUIRED_FEATURE',
  'reason': "Row 0: Missing required feature 'category'"
})
```

**Logged info:**
- Event type
- User ID (for correlation)
- Error type (classified)
- Reason (readable)

---

## Integration Points

### In /predict Endpoint

```python
# 1. Check required features
required_valid, req_error, req_type = DatasetErrorHandler.validate_required_features(txns)
if not required_valid:
    logger.error({...})
    return error_response(400, req_error)

# 2. Check row consistency
row_valid, row_error, row_type = DatasetErrorHandler.validate_row_consistency(txns)
if not row_valid:
    logger.error({...})
    return error_response(400, row_error)

# 3. Check target state
target_valid, target_error, target_type = DatasetErrorHandler.validate_target_state(txns)
if not target_valid:
    logger.error({...})
    return error_response(400, target_error)

# All valid → proceed to computation
```

### In /dataset-info Endpoint

Same checks (with same error responses).

---

## Error Handling Guarantees

✅ **Readable Errors** — Every error has human-readable message  
✅ **Precise Location** — Row number included when possible  
✅ **Proper HTTP Code** — 400 for validation errors  
✅ **Logged Errors** — All errors logged with context  
✅ **Consistent Format** — All errors follow same structure  

---

## Test Coverage

✅ Missing category  
✅ Missing amount  
✅ Missing date  
✅ Negative amount  
✅ Invalid type (string instead of number)  
✅ Invalid dates (no YYYY-MM-DD format)  
✅ Empty dataset  
✅ Error message readability  
✅ Both /predict and /dataset-info endpoints  

---

## What This Enables

✅ **Data Quality Visibility** — Know exactly what's wrong with dataset  
✅ **Debugging** — Row numbers help pinpoint issues  
✅ **Integration** — Node layer gets readable errors  
✅ **Monitoring** — Error types can be tracked and categorized  
✅ **User Feedback** — Can communicate issues to end users  

---

## What This Is NOT

❌ **Retry Logic** — Just error detection, no retry  
❌ **Data Repair** — Just error reporting, no fixing  
❌ **Advanced Validation** — Just basic sanity checks  
❌ **Data Cleaning** — No transformation or cleanup  

---

## Summary

**FÁZE 5.2F:** ✅ **COMPLETE**

Basic error handling for dataset-backed runtime:

- ✅ Missing required feature detection
- ✅ Inconsistent row detection
- ✅ Invalid target state detection
- ✅ Readable error messages
- ✅ Proper HTTP status codes
- ✅ Structured error logging
- ✅ Both endpoints covered

Dataset-backed Python flow now has comprehensive error handling with readable feedback to Node/Firebase layer.

---

**Implementation Location:** `ml-runtime/app.py`
- DatasetErrorHandler class: Lines ~217–310
- /predict validation: Lines ~1370–1440
- /dataset-info validation: Lines ~1590–1650

**New Files:**
- `ml-runtime/test_dataset_error_handling.py` — 9 comprehensive tests

**Error Types:**
- MISSING_REQUIRED_FEATURE
- INCONSISTENT_DATASET_ROW
- FEATURE_VALUE_ERROR
- INVALID_TARGET_STATE
- DATASET_TOO_SMALL

**Status:** Production-ready  
**Next:** Ready for integration testing or alerting setup


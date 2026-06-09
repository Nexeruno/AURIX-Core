# FÁZE 5.1F: Failure Handling for Deterministic Python Computation

**Status:** ✅ **COMPLETE**  
**Date:** 2026-06-07  
**Mission:** Add basic failure handling for deterministic Python computation with readable errors

---

## Executive Summary

**FÁZE 5.1F Objective:** *"Přidej failure handling pro deterministic Python computation: invalid input, missing required field, computation failed. Vrať čitelnou chybu zpět do Node/Firebase vrstvy"*

**Status:** ✅ **ACHIEVED**

Deterministic Python computation now has comprehensive failure handling:
- ✅ Invalid input detection
- ✅ Missing required field detection
- ✅ Computation failure handling
- ✅ Readable error messages to Node layer
- ✅ Structured error logging

---

## Failure Types Handled

### 1. Invalid Input

**Scenario:** Input validation fails (enum, range, format)

**Detection:**
```python
RequestContract.validate() returns is_valid=False
```

**Error Response (400 Bad Request):**
```json
{
  "status": "failed",
  "error": "Field 'pipelineLevel' must be one of ['L1', 'L2', 'L3'], got 'L4'",
  "uid": "user-123",
  "debugMetadata": {"processingTimeMs": 0}
}
```

**Log:**
```json
{
  "event": "[ERROR] Deterministic computation failed",
  "uid": "user-123",
  "errorType": "INVALID_INPUT",
  "reason": "Field 'pipelineLevel' must be one of ['L1', 'L2', 'L3'], got 'L4'"
}
```

**Examples:**
- Invalid pipelineLevel (not L1, L2, L3)
- Invalid modelVersion format (not semantic version)
- Transaction amount < 0
- Income < 0

---

### 2. Missing Required Field

**Scenario:** Required field not provided

**Detection:**
```python
RequestContract.validate() detects missing field
```

**Error Response (400 Bad Request):**
```json
{
  "status": "failed",
  "error": "Missing required field: uid",
  "uid": null,
  "debugMetadata": {"processingTimeMs": 0}
}
```

**Log:**
```json
{
  "event": "[ERROR] Deterministic computation failed",
  "uid": null,
  "errorType": "MISSING_REQUIRED_FIELD",
  "reason": "Missing required field: uid"
}
```

**Examples:**
- Missing `uid`
- Missing `pipelineLevel`
- Missing `modelVersion`
- Missing `transactions` array

---

### 3. Computation Failed Unexpectedly

**Scenario:** Unexpected error during prediction calculation

**Detection:**
```python
calculate_baseline_prediction() throws Exception
```

**Error Response (500 Internal Server Error):**
```json
{
  "status": "failed",
  "error": "Prediction calculation failed: division by zero",
  "uid": "user-123",
  "debugMetadata": {"processingTimeMs": 12}
}
```

**Log:**
```json
{
  "event": "[ERROR] Deterministic computation failed",
  "uid": "user-123",
  "errorType": "COMPUTATION_FAILED",
  "reason": "Unexpected error during prediction calculation: division by zero"
}
```

**Examples:**
- Division by zero (if income normalization goes wrong)
- Type conversion error
- Array index out of bounds
- Unexpected data structure

---

## Error Classification

| Error Type | HTTP Status | Cause | User Action |
|-----------|------------|-------|------------|
| INVALID_INPUT | 400 | Enum/range/format validation fails | Fix input value |
| INVALID_ENUM_VALUE | 400 | Enum value not in allowed list | Use correct enum |
| MISSING_REQUIRED_FIELD | 400 | Required field not provided | Add required field |
| PARSE_ERROR | 400 | Input parsing failed | Check input format |
| COMPUTATION_FAILED | 500 | Unexpected error during calculation | Report as bug |

---

## Error Flow to Node/Firebase

```
Python /predict Endpoint
  ├─ Invalid input detected
  ├─ Log: [ERROR] Deterministic computation failed
  └─ Return: 400 + JSON error response
    ↓
mlRuntimeClient.callMlRuntime()
  ├─ Detect error response
  ├─ Create structured error
  └─ Throw with errorType
    ↓
functions/index.js catch block
  ├─ Check errorType
  ├─ Log specific error event
  ├─ Generate Node baseline fallback
  └─ Save to Firestore
    ↓
Firestore: Prediction with fallback source
```

---

## Readable Error Messages

### For Python Runtime

**Invalid Input Example:**
```
error: "Field 'pipelineLevel' must be one of ['L1', 'L2', 'L3'], got 'L4'"
```

**Missing Required Example:**
```
error: "Missing required field: uid"
```

**Computation Error Example:**
```
error: "Prediction calculation failed: division by zero"
```

### For Node/Firebase Layer

Error is caught by mlRuntimeClient and classified:

```javascript
{
  message: "ML Runtime HTTP error: HTTP 400",
  errorType: "HTTP_ERROR",
  originalError: "Field 'pipelineLevel' must be one of ['L1', 'L2', 'L3'], got 'L4'",
  elapsed: 8,
  uid: "user-123"
}
```

Node layer logs this error with context:

```json
{
  "event": "mlPipeline_pythonRuntime_failed",
  "uid": "user-123",
  "errorType": "HTTP_ERROR",
  "errorMessage": "ML Runtime HTTP error: HTTP 400",
  "originalError": "Field 'pipelineLevel' must be one of ['L1', 'L2', 'L3'], got 'L4'",
  "elapsed": 8,
  "fallback": "Using Node.js baseline prediction"
}
```

---

## Logging Examples

### Scenario 1: Invalid Enum Value

```
Python:
  [ERROR] Deterministic computation failed
  ├─ errorType: INVALID_ENUM_VALUE
  └─ reason: Field 'pipelineLevel' must be one of ['L1', 'L2', 'L3'], got 'L4'

Node:
  {
    "event": "mlPipeline_pythonRuntime_failed",
    "uid": "user-123",
    "errorType": "HTTP_ERROR",
    "originalError": "Field 'pipelineLevel' must be one of ['L1', 'L2', 'L3'], got 'L4'",
    "fallback": "Using Node.js baseline prediction"
  }

Firestore:
  {
    "sourceMethod": "Node.js (fallback)",
    "pythonMetadata": null
  }
```

### Scenario 2: Missing Required Field

```
Python:
  [ERROR] Deterministic computation failed
  ├─ errorType: MISSING_REQUIRED_FIELD
  └─ reason: Missing required field: uid

Node:
  {
    "event": "mlPipeline_pythonRuntime_failed",
    "uid": null,
    "errorType": "HTTP_ERROR",
    "originalError": "Missing required field: uid",
    "fallback": "Using Node.js baseline prediction"
  }

Firestore:
  {
    "sourceMethod": "Node.js (fallback)",
    "pythonMetadata": null
  }
```

### Scenario 3: Computation Failure

```
Python:
  [ERROR] Deterministic computation failed
  ├─ errorType: COMPUTATION_FAILED
  └─ reason: Unexpected error during prediction calculation: division by zero

Node:
  {
    "event": "mlPipeline_pythonRuntime_failed",
    "uid": "user-123",
    "errorType": "HTTP_ERROR",
    "originalError": "Prediction calculation failed: division by zero",
    "fallback": "Using Node.js baseline prediction"
  }

Firestore:
  {
    "sourceMethod": "Node.js (fallback)",
    "pythonMetadata": null
  }
```

---

## Error Handling Guarantees

✅ **Readable Errors:** All errors have human-readable messages  
✅ **Classified Errors:** Error type categorized (INVALID_INPUT, etc.)  
✅ **Logged Errors:** All failures logged in Python + Node  
✅ **No Data Loss:** Fallback to Node baseline on any error  
✅ **Traceable:** uid in every error log  

---

## What This Handles

### Input Validation Errors (400 Bad Request)
- Missing required fields
- Invalid enum values
- Invalid value ranges
- Invalid format (semantic version)
- Type mismatches

### Computation Errors (500 Internal Server Error)
- Unexpected calculation failures
- Math errors (division by zero)
- Type conversion failures
- Unexpected data structure errors

### Network/Format Errors (Already Handled in 5.0F)
- Python server unavailable
- Request timeout
- Malformed JSON response
- HTTP error responses

---

## What This Is NOT

❌ **Retry Logic** — Just detection + fallback  
❌ **Advanced Recovery** — Just fallback to Node baseline  
❌ **Custom Error Codes** — Generic HTTP 400/500  
❌ **Error Aggregation** — Individual error handling  

---

## Summary

**FÁZE 5.1F:** ✅ **COMPLETE**

Added **basic failure handling** for deterministic Python computation:

- ✅ Invalid input detection with readable messages
- ✅ Missing required field detection
- ✅ Computation failure detection
- ✅ Structured error logging
- ✅ Error propagation to Node layer
- ✅ Fallback strategy maintained

All failures result in:
1. Readable error message
2. Structured error log
3. Fallback to Node baseline
4. Prediction always created

---

**Implementation:**
- `ml-runtime/app.py` — Enhanced error logging for 3 failure scenarios

**Error Flow:** Python (detect) → Log (classify) → HTTP response (readable) → Node (catch) → Fallback

**Status:** Production-ready  
**Data Continuity:** Guaranteed via fallback  


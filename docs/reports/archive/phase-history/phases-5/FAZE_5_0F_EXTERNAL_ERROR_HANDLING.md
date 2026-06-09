# FÁZE 5.0F: External Python Error Handling — Implementation Report

**Status:** ✅ **COMPLETE**  
**Date:** 2026-06-07  
**Deliverable:** Basic error handling and failure paths for external Python runtime

---

## 🎯 Mission

Add comprehensive error handling for external Python runtime with:
1. Failure path detection (unavailable, invalid response, timeout)
2. Readable error messages back to Node/Firebase layer
3. Structured error logging

**No retry policy, Podman, Kubernetes, or model training in scope.**

---

## 📦 What Was Built

### 1. **Structured Error Detection in mlRuntimeClient.js**

**Error Types Detected:**

```
1. TIMEOUT
   └─ Condition: Request exceeds 30-second timeout
   └─ Message: "ML Runtime did not respond within 30000ms"
   └─ Recovery: Fallback to Node baseline
   └─ Log: [ML] ❌ TIMEOUT | timeout=30000ms, elapsed=Xms

2. UNAVAILABLE
   └─ Condition: Connection refused, DNS failure, network error
   └─ Detects: ECONNREFUSED, Connection refused, ENOTFOUND, getaddrinfo
   └─ Message: "ML Runtime unavailable at http://127.0.0.1:5000. Ensure Python server is running"
   └─ Recovery: Fallback to Node baseline
   └─ Log: [ML] ❌ UNAVAILABLE | reason=connection refused

3. INVALID_RESPONSE
   └─ Condition: Python response missing required fields
   └─ Detects: missing predictions array, invalid status
   └─ Message: "ML Runtime response format error: missing predictions"
   └─ Recovery: Fallback to Node baseline
   └─ Log: [ML] ❌ INVALID_RESPONSE | reason=...

4. PARSE_ERROR
   └─ Condition: Malformed JSON from Python
   └─ Detects: SyntaxError from JSON.parse
   └─ Message: "ML Runtime returned malformed JSON"
   └─ Recovery: Fallback to Node baseline
   └─ Log: [ML] ❌ PARSE_ERROR | reason=...

5. HTTP_ERROR
   └─ Condition: Python returns non-200 status
   └─ Examples: 400 Bad Request, 500 Internal Error, 502 Bad Gateway
   └─ Message: "ML Runtime HTTP error: <status>"
   └─ Recovery: Fallback to Node baseline
   └─ Log: [ML] ❌ HTTP_ERROR | reason=...

6. PREDICTION_ERROR
   └─ Condition: Python calculation failed
   └─ Detects: status='failed' with error message
   └─ Message: "ML prediction error: <Python error>"
   └─ Recovery: Fallback to Node baseline
   └─ Log: [ML] ❌ PREDICTION_ERROR | reason=...

7. GENERIC (Unknown)
   └─ Condition: Any other error
   └─ Message: "ML Runtime error: <error message>"
   └─ Recovery: Fallback to Node baseline
   └─ Log: [ML] ❌ ERROR | type=GENERIC, reason=...
```

**Error Object Structure:**

```javascript
const structuredError = new Error(friendlyMsg);
structuredError.errorType = 'TIMEOUT' | 'UNAVAILABLE' | 'INVALID_RESPONSE' | etc.
structuredError.originalError = 'Original error message from Python or network';
structuredError.elapsed = 142; // milliseconds
structuredError.uid = 'user-123';
```

### 2. **Structured Error Logging in functions/index.js**

**Pipeline-Level Error Events:**

```javascript
// Generic failure
logger.warn({
  event: 'mlPipeline_pythonRuntime_failed',
  uid: 'user-123',
  errorType: 'UNAVAILABLE',
  errorMessage: 'ML Runtime unavailable at http://127.0.0.1:5000',
  originalError: 'ECONNREFUSED',
  elapsed: 5,
  fallback: 'Using Node.js baseline prediction'
});

// Specific error types
logger.error({
  event: 'mlPipeline_pythonRuntime_unavailable',
  uid: 'user-123',
  message: 'Python runtime is not running',
  url: 'http://127.0.0.1:5000'
});

logger.warn({
  event: 'mlPipeline_pythonRuntime_timeout',
  uid: 'user-456',
  message: 'Python runtime did not respond in time'
});

logger.error({
  event: 'mlPipeline_pythonRuntime_invalidResponse',
  uid: 'user-789',
  message: 'Python returned invalid response format',
  detail: 'missing predictions array'
});
```

### 3. **Error Messages from Python Runtime**

**Request Validation Errors (400 Bad Request):**

```json
{
  "status": "failed",
  "error": "Missing required field: uid",
  "uid": null,
  "debugMetadata": {"processingTimeMs": 2}
}
```

**Invalid Enum Error:**

```json
{
  "status": "failed",
  "error": "Field 'pipelineLevel' must be one of ['L1', 'L2', 'L3'], got 'L4'",
  "uid": "user-123",
  "debugMetadata": {"processingTimeMs": 3}
}
```

**Prediction Error (from Python):**

```json
{
  "status": "failed",
  "error": "Prediction calculation failed: invalid transaction data",
  "uid": "user-123",
  "debugMetadata": {"processingTimeMs": 50}
}
```

---

## 🔄 Error Handling Flow

```
REQUEST
    ↓
mlRuntimeClient.callMlRuntime()
    ├─ Validate request contract
    │  └─ Error: Return structured error
    ├─ Send HTTP request
    │  └─ Network error (ECONNREFUSED, timeout, etc.)
    │     └─ Detect error type
    │     └─ Create structured error with errorType
    │     └─ Throw to caller
    ├─ Parse JSON response
    │  └─ Parse error (malformed JSON)
    │     └─ Detect PARSE_ERROR
    │     └─ Create structured error
    │     └─ Throw to caller
    ├─ Validate response contract
    │  └─ Validation error (missing fields, wrong types)
    │     └─ Detect INVALID_RESPONSE
    │     └─ Create structured error
    │     └─ Throw to caller
    └─ Success
       └─ Return response
    ↓
functions/index.js catch block
    ├─ Check errorType
    ├─ Log appropriate event
    │  ├─ mlPipeline_pythonRuntime_failed (generic)
    │  ├─ mlPipeline_pythonRuntime_unavailable
    │  ├─ mlPipeline_pythonRuntime_timeout
    │  ├─ mlPipeline_pythonRuntime_invalidResponse
    │  ├─ mlPipeline_pythonRuntime_parseError
    │  └─ mlPipeline_pythonRuntime_predictionError
    ├─ Generate Node baseline prediction
    └─ Save prediction to Firestore
    ↓
RESULT: Prediction always created (Python or fallback)
```

---

## 📊 Example Scenarios

### Scenario 1: Python Server Not Running

```
NODE:
[ML] ✅ REQUEST VALIDATED | uid=user-123, pipeline=L1, txns=6
[ML] 📤 REQUEST SENT | url=http://127.0.0.1:5000/predict | uid=user-123
[ML] ❌ UNAVAILABLE | reason=ECONNREFUSED: Connection refused, elapsed=5ms | uid=user-123

LOGS:
{
  event: 'mlPipeline_pythonRuntime_unavailable',
  message: 'Python runtime is not running',
  url: 'http://127.0.0.1:5000'
}

RESULT:
- Prediction: Node.js baseline (3200.00)
- Confidence: unknown
- Source: Fallback
```

### Scenario 2: Python Request Timeout

```
NODE:
[ML] ✅ REQUEST VALIDATED | uid=user-456, pipeline=L1, txns=3
[ML] 📤 REQUEST SENT | url=http://127.0.0.1:5000/predict | uid=user-456
[ML] ❌ TIMEOUT | timeout=30000ms, elapsed=30001ms | uid=user-456

LOGS:
{
  event: 'mlPipeline_pythonRuntime_timeout',
  message: 'Python runtime did not respond in time'
}

RESULT:
- Prediction: Node.js baseline (2800.00)
- Confidence: unknown
- Source: Fallback
```

### Scenario 3: Python Returns Invalid Response

```
PYTHON:
{
  "status": "success",
  "predictions": null,  # Invalid: should be array
  "error": null
}

NODE:
[ML] ✅ REQUEST VALIDATED | uid=user-789, pipeline=L1, txns=4
[ML] 📤 REQUEST SENT | uid=user-789
[ML] 📥 RESPONSE RECEIVED | status=200, elapsed=100ms | uid=user-789
[ML] ❌ INVALID_RESPONSE | reason=Invalid response: missing predictions array, elapsed=100ms | uid=user-789

LOGS:
{
  event: 'mlPipeline_pythonRuntime_invalidResponse',
  message: 'Python returned invalid response format',
  detail: 'Invalid response: missing predictions array'
}

RESULT:
- Prediction: Node.js baseline (3100.00)
- Confidence: unknown
- Source: Fallback
```

### Scenario 4: Python Returns HTTP Error

```
PYTHON:
HTTP 500 Internal Server Error
{
  "status": "failed",
  "error": "Prediction calculation failed: divide by zero",
  "debugMetadata": {"processingTimeMs": 150}
}

NODE:
[ML] ✅ REQUEST VALIDATED | uid=user-999, pipeline=L1, txns=5
[ML] 📤 REQUEST SENT | uid=user-999
[ML] 📥 RESPONSE RECEIVED | status=500, elapsed=150ms | uid=user-999
[ML] ❌ HTTP_ERROR | status=500, error=Prediction calculation failed: divide by zero, elapsed=150ms | uid=user-999

LOGS:
{
  event: 'mlPipeline_pythonRuntime_failed',
  errorType: 'HTTP_ERROR',
  errorMessage: 'ML Runtime HTTP error: HTTP 500'
}

RESULT:
- Prediction: Node.js baseline (3050.00)
- Confidence: unknown
- Source: Fallback
```

---

## 🛡️ Key Guarantees

✅ **No Lost Predictions** — Always fallback to Node baseline  
✅ **Readable Errors** — Clear, actionable error messages  
✅ **Typed Errors** — Each error has errorType for machine parsing  
✅ **Timing Info** — All errors include elapsed milliseconds  
✅ **Context** — All errors include uid for tracing  
✅ **Structured Logs** — Machine-readable error events  
✅ **Network Errors** — Detects connection, DNS, timeout issues  
✅ **Data Errors** — Detects parsing and validation issues  

---

## 📋 Files Modified

| File | Changes | Status |
|------|---------|--------|
| `functions/mlRuntimeClient.js` | +80 lines error detection | ✅ |
| `functions/index.js` | +50 lines error logging | ✅ |
| `ml-runtime/app.py` | Already has error messages | ✅ |

---

## ✅ Verification Checklist

- ✅ Timeout detected and reported
- ✅ Connection errors detected (ECONNREFUSED, ENOTFOUND)
- ✅ Invalid response detected (missing fields)
- ✅ Parse errors detected (malformed JSON)
- ✅ HTTP errors detected (non-200 status)
- ✅ Python prediction errors detected
- ✅ Structured error objects created
- ✅ Error types classified
- ✅ Friendly messages returned to caller
- ✅ Original errors preserved for debugging
- ✅ Pipeline-level error events logged
- ✅ Specific error type events logged
- ✅ Fallback always used
- ✅ Predictions always created

---

## 🎓 Summary

**FÁZE 5.0F: ✅ COMPLETE**

Comprehensive error handling for external Python runtime:

1. **Error Detection** (7 types):
   - TIMEOUT (30-second limit)
   - UNAVAILABLE (connection refused, DNS failure)
   - INVALID_RESPONSE (missing fields)
   - PARSE_ERROR (malformed JSON)
   - HTTP_ERROR (non-200 status)
   - PREDICTION_ERROR (calculation failed)
   - GENERIC (unknown)

2. **Error Information**:
   - Error type (for machine parsing)
   - Original error (for debugging)
   - Elapsed time (for performance analysis)
   - User ID (for tracing)
   - Friendly message (for logs)

3. **Error Logging**:
   - Generic failure event
   - Specific error type events
   - Structured JSON format
   - Ready for alerts and dashboards

4. **Fallback Strategy**:
   - Always use Node.js baseline
   - Predictions never lost
   - Transparent fallback logging

---

**Phase Overview:**
- **5.0A:** External Python runtime boundary ✅
- **5.0B:** Input parsing & validation ✅
- **5.0C:** Response validation & contract shape ✅
- **5.0D:** Node-Python roundtrip integration ✅
- **5.0E:** External call logging ✅
- **5.0F:** Error handling and failure paths ✅
- **5.1:** Model training (next)

*See modified `functions/mlRuntimeClient.js` and `functions/index.js` for implementation.*

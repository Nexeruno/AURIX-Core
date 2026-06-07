# FÁZE 5.0F: Shrnutí — External Error Handling

**Status:** ✅ **HOTOVO**  
**Datum:** 2026-06-07

---

## Co Bylo Vytvořeno

### 1. **Error Type Detection v mlRuntimeClient.js**

**7 Types of Errors Detected:**

```
1. TIMEOUT (30 sec limit)
   → "ML Runtime did not respond within 30000ms"
   
2. UNAVAILABLE (connection refused, DNS failure)
   → "ML Runtime unavailable at http://127.0.0.1:5000"
   
3. INVALID_RESPONSE (missing fields)
   → "ML Runtime response format error: missing predictions"
   
4. PARSE_ERROR (malformed JSON)
   → "ML Runtime returned malformed JSON"
   
5. HTTP_ERROR (non-200 status)
   → "ML Runtime HTTP error: HTTP 500"
   
6. PREDICTION_ERROR (calculation failed)
   → "ML prediction error: divide by zero"
   
7. GENERIC (unknown)
   → "ML Runtime error: <message>"
```

**Structured Error Object:**

```javascript
{
  message: "Friendly message for logs",
  errorType: "TIMEOUT" | "UNAVAILABLE" | etc.,
  originalError: "Original error from Python/network",
  elapsed: 142,  // milliseconds
  uid: "user-123"
}
```

### 2. **Error Logging v functions/index.js**

**Events:**

```javascript
// Generic failure (always logged)
mlPipeline_pythonRuntime_failed
  └─ uid, errorType, errorMessage, elapsed, fallback

// Specific error types
mlPipeline_pythonRuntime_unavailable
  └─ message: "Python runtime is not running"
  
mlPipeline_pythonRuntime_timeout
  └─ message: "Python runtime did not respond in time"
  
mlPipeline_pythonRuntime_invalidResponse
  └─ message: "Python returned invalid response format"
  
mlPipeline_pythonRuntime_parseError
  └─ message: "Failed to parse Python response JSON"
  
mlPipeline_pythonRuntime_httpError
  └─ message: "Python returned HTTP error"
  
mlPipeline_pythonRuntime_predictionError
  └─ message: "Python prediction calculation failed"
```

---

## Error Handling Flow

```
REQUEST
    ↓
mlRuntimeClient: Validate & send
    ├─ Network error (ECONNREFUSED, timeout)
    ├─ Parse error (malformed JSON)
    ├─ Validation error (missing fields)
    ├─ HTTP error (non-200 status)
    └─ Prediction error (calculation failed)
    ↓
Detect error type
    ↓
Create structured error
    ↓
functions/index.js catch:
    ├─ Check error.errorType
    ├─ Log specific event
    ├─ Use Node baseline
    └─ Save prediction
    ↓
RESULT: Prediction always created
```

---

## Error Scenarios

### Python Server Not Running ❌

```
[ML] ❌ UNAVAILABLE | reason=ECONNREFUSED | uid=user-123

→ Event: mlPipeline_pythonRuntime_unavailable
→ Message: "Python runtime is not running"
→ Fallback: Node baseline prediction
```

### Request Timeout ⏱️

```
[ML] ❌ TIMEOUT | timeout=30000ms, elapsed=30001ms | uid=user-456

→ Event: mlPipeline_pythonRuntime_timeout
→ Message: "Python runtime did not respond in time"
→ Fallback: Node baseline prediction
```

### Invalid Response 📦

```
[ML] ❌ INVALID_RESPONSE | reason=missing predictions | uid=user-789

→ Event: mlPipeline_pythonRuntime_invalidResponse
→ Message: "Python returned invalid response format"
→ Fallback: Node baseline prediction
```

### HTTP Error 🔴

```
PYTHON: HTTP 500 Internal Server Error
[ML] ❌ HTTP_ERROR | status=500, error=divide by zero | uid=user-999

→ Event: mlPipeline_pythonRuntime_failed
→ Type: HTTP_ERROR
→ Fallback: Node baseline prediction
```

### Malformed JSON 🔨

```
PYTHON: Returns {status: "success", predictions: null}
[ML] ❌ PARSE_ERROR | reason=invalid JSON | uid=user-111

→ Event: mlPipeline_pythonRuntime_parseError
→ Message: "Failed to parse Python response JSON"
→ Fallback: Node baseline prediction
```

---

## Error Information

**Každý error obsahuje:**

```
message: "Readable message for humans"
errorType: "Type for machine parsing"
originalError: "Original error message"
elapsed: 142  // milliseconds
uid: "user-123"
```

**Strukturovaný log:**

```json
{
  "event": "mlPipeline_pythonRuntime_failed",
  "uid": "user-123",
  "errorType": "UNAVAILABLE",
  "errorMessage": "ML Runtime unavailable at http://127.0.0.1:5000",
  "originalError": "ECONNREFUSED",
  "elapsed": 5,
  "fallback": "Using Node.js baseline prediction"
}
```

---

## Guarantees

✅ **No Lost Predictions** — Always fallback  
✅ **Readable Errors** — Clear messages  
✅ **Typed Errors** — errorType for parsing  
✅ **Timing Data** — elapsed milliseconds  
✅ **Context** — uid in every error  
✅ **Structured Logs** — JSON format  
✅ **Network Detection** — Connection/DNS/timeout  
✅ **Data Detection** — Parsing/validation  

---

## Co Není Zahrnuto (Podle Scope)

❌ Retry policy  
❌ Podman/Docker  
❌ Kubernetes  
❌ Model training  

---

## Souhrn

**FÁZE 5.0F: ✅ COMPLETE**

Komplexní error handling pro external Python runtime:

**7 Error Types Detected:**
1. Timeout (30 sec)
2. Unavailable (connection refused)
3. Invalid response (missing fields)
4. Parse error (malformed JSON)
5. HTTP error (non-200)
6. Prediction error (calc failed)
7. Generic (unknown)

**Error Information:**
- Type (for machine parsing)
- Original error (for debugging)
- Elapsed time (for performance)
- User ID (for tracing)
- Friendly message (for humans)

**Fallback Strategy:**
- Always use Node baseline
- Predictions never lost
- Transparent logging

Každý error je strukturovaný, čitelný a traceable.

---

**Průběh (5.0A→5.0F):**
- 5.0A: External runtime ✅
- 5.0B: Parsing ✅
- 5.0C: Response validation ✅
- 5.0D: Roundtrip ✅
- 5.0E: Call logging ✅
- 5.0F: Error handling ✅
- 5.1: Model training (next) →

---

**Plná dokumentace:** `FAZE_5_0F_EXTERNAL_ERROR_HANDLING.md`

# FÁZE 5.5A: Runtime Health Check

**Status:** ✅ **COMPLETE**  
**Date:** 2026-06-07  
**Mission:** Add simple runtime health check for Python runtime

---

## Executive Summary

**FÁZA 5.5A Objective:** *"Přidej jednoduchý runtime health check pro Python runtime. Health check má vrátit: available / unavailable, contract ready / not ready"*

**Status:** ✅ **ACHIEVED**

Runtime health check now provides:
- ✅ Availability status (available/unavailable)
- ✅ Contract readiness status (contract_ready/not_ready)
- ✅ Endpoint list
- ✅ Capabilities list
- ✅ Structured response

---

## What Was Implemented

### /health Endpoint Enhancement

**Purpose:** Check Python runtime health and API contract readiness

**Response:**
```json
{
  "status": "healthy",
  "service": "ml-runtime",
  "availability": "available",
  "contractReady": "contract_ready",
  "timestamp": "2026-06-07T15:30:00.000Z",
  "version": "5.0.0",
  "endpoints": [
    "/health",
    "/status",
    "/predict",
    "/dataset-info",
    "/evaluate",
    "/evaluate-summary"
  ],
  "capabilities": [
    "baseline-prediction",
    "dataset-validation",
    "feature-analysis",
    "target-detection",
    "offline-evaluation",
    "failure-analysis",
    "readiness-verdict"
  ]
}
```

---

## Health Check Fields

### availability
- **"available"** — Runtime is responding and operational
- **"unavailable"** — Runtime is not responding or crashed

**Check:** Simple runtime availability check

### contractReady
- **"contract_ready"** — All required endpoints and components are implemented
- **"not_ready"** — Missing endpoints or failed component verification

**Check:** Verifies:
- RequestContract class has validate() method
- RequestParser class has parse() method
- calculate_baseline_prediction() function exists and is callable

---

## Example Health Checks

### Healthy and Ready
```json
{
  "status": "healthy",
  "availability": "available",
  "contractReady": "contract_ready"
}
```
**Meaning:** Runtime is fully operational and contract-compliant

### Degraded (Available but Not Ready)
```json
{
  "status": "degraded",
  "availability": "available",
  "contractReady": "not_ready"
}
```
**Meaning:** Runtime responds but missing components or endpoints

### Unavailable
```json
{
  "status": "degraded",
  "availability": "unavailable",
  "contractReady": "not_ready"
}
```
**Meaning:** Runtime is not responding

---

## Integration with Node/Firebase Layer

### Usage in mlRuntimeClient.js

```typescript
const response = await fetch('http://127.0.0.1:5000/health')
const health = await response.json()

if (health.availability === 'available' && health.contractReady === 'contract_ready') {
  // Safe to use runtime
  callMlRuntime(...)
} else {
  // Runtime not ready
  throw new Error('ML Runtime not ready: ' + health.contractReady)
}
```

---

## Monitoring Use Cases

### 1. Startup Verification
```
App starts
  ↓
Check /health endpoint
  ↓
IF availability == "available" THEN
  Log "ML Runtime is ready"
ELSE
  Log "ML Runtime not available, check if service is running"
```

### 2. Health Monitoring
```
Periodic health check (every 30 seconds)
  ↓
IF status == "degraded" THEN
  Alert operator
  Stop sending requests to runtime
ELSE
  Continue normal operations
```

### 3. Readiness Probe
```
Before calling /predict endpoint:
  ↓
Check /health
  ↓
IF contractReady == "contract_ready" THEN
  Proceed with prediction
ELSE
  Return error to client
```

---

## Response Structure

**Top-level fields:**
- `status` — Overall health (healthy/degraded)
- `service` — Service identifier
- `availability` — Availability status
- `contractReady` — Contract readiness
- `timestamp` — Check timestamp (UTC)
- `version` — Runtime version
- `endpoints` — List of available endpoints
- `capabilities` — List of supported capabilities

**Combined Assessment:**
```
If availability == "available" AND contractReady == "contract_ready"
  → status = "healthy"
Else
  → status = "degraded"
```

---

## Endpoints Verified

| Endpoint | Purpose | Status |
|----------|---------|--------|
| **/health** | Health check | ✅ Always available |
| **/status** | Runtime status | ✅ Available |
| **/predict** | Main prediction | ✅ Available |
| **/dataset-info** | Dataset analysis | ✅ Available |
| **/evaluate** | Offline evaluation | ✅ Available |
| **/evaluate-summary** | Evaluation summary | ✅ Available |

---

## Capabilities Verified

| Capability | Description | Status |
|------------|-------------|--------|
| baseline-prediction | Deterministic baseline ML | ✅ |
| dataset-validation | Feature validation | ✅ |
| feature-analysis | Feature extraction & analysis | ✅ |
| target-detection | Target variable detection | ✅ |
| offline-evaluation | Train/test evaluation | ✅ |
| failure-analysis | Failure reason detection | ✅ |
| readiness-verdict | Dataset readiness verdict | ✅ |

---

## Component Checks

**Verified on health check:**

1. **RequestContract.validate()** — Contract validation available
2. **RequestParser.parse()** — Request parsing available
3. **calculate_baseline_prediction()** — Prediction function callable

**If any check fails:** contractReady = "not_ready"

---

## Monitoring Integration Points

### Option 1: Health Check Only
```python
# Simple check
GET /health
→ status: available/unavailable
```

### Option 2: Health + Readiness
```python
# Full check
GET /health
→ availability: available/unavailable
→ contractReady: contract_ready/not_ready
```

### Option 3: Status Details
```python
# Full information
GET /health
→ Returns: all endpoints, all capabilities, status
```

---

## Logging

**Health check logs:**
```
[INFO] Health check requested
[INFO] Health check result: availability=available, contract=contract_ready
```

**If issues detected:**
```
[WARN] Contract verification failed: [error message]
[INFO] Health check result: availability=available, contract=not_ready
```

---

## Use Cases

### 1. Kubernetes/Container Health Probe
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 5000
  initialDelaySeconds: 5
  periodSeconds: 10
```

### 2. Load Balancer Health Check
```
Check /health periodically
If status == "degraded":
  Remove from pool
  Alert on-call
```

### 3. Application Startup
```
On app start:
  Check /health
  If contractReady != "contract_ready":
    Exit with error (don't start app)
  Else:
    Continue initialization
```

### 4. Circuit Breaker Pattern
```
Before calling runtime:
  Check /health
  If availability != "available":
    Skip runtime call
    Use fallback
```

---

## What This Enables

✅ **Operational Monitoring** — Know if runtime is healthy  
✅ **Automated Recovery** — Detect and handle failures  
✅ **Deployment Validation** — Verify runtime after deployment  
✅ **Load Balancing** — Health-based routing  
✅ **Alerting** — Alert when status changes  

---

## What This Is NOT

❌ **Detailed Diagnostics** — Just health status, not troubleshooting info  
❌ **Performance Metrics** — Just availability, not latency  
❌ **Error Details** — Just status, not specific errors  
❌ **Auto-Recovery** — Just reporting, not fixing  

---

## Files Modified

**Backend:**
- `ml-runtime/app.py`
  - Enhanced /health endpoint
  - Added availability check
  - Added contract readiness check
  - Added capabilities list

---

## Summary

**FÁZA 5.5A:** ✅ **COMPLETE**

Runtime health check implemented:

- ✅ /health endpoint enhanced
- ✅ Availability status (available/unavailable)
- ✅ Contract readiness (contract_ready/not_ready)
- ✅ Endpoint list
- ✅ Capabilities list
- ✅ Component verification

Simple, effective health checking for Python runtime.

---

**Implementation Location:**
- `ml-runtime/app.py` (/health endpoint)

**Status:** Complete and production-ready  
**Monitoring:** Now with runtime health visibility


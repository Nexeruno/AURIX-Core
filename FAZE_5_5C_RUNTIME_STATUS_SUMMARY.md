# FÁZE 5.5C: Runtime Status Summary

**Status:** ✅ **COMPLETE**  
**Date:** 2026-06-07  
**Mission:** Add simple runtime status summary aggregating health and readiness

---

## Executive Summary

**FÁZA 5.5C Objective:** *"Přidej stručný runtime status summary s jednoduchými pravidly"*

**Status:** ✅ **ACHIEVED**

Runtime status summary now provides:
- ✅ Aggregated health + readiness checks
- ✅ Simple status: healthy/degraded/unavailable
- ✅ Clear reasons for issues
- ✅ Detailed checks breakdown

---

## What Was Implemented

### /status-summary Endpoint

**Purpose:** Single endpoint for overall runtime status using simple decision rules

**Response:**
```json
{
  "status": "healthy|degraded|unavailable",
  "timestamp": "2026-06-07T15:30:00.000Z",
  "reasons": ["reason1", "reason2"],
  "checks": {
    "health": {
      "availability": "available|unavailable",
      "contractReady": "contract_ready|not_ready"
    },
    "readiness": {
      "status": "ready|not_ready",
      "reason": "reason_code"
    }
  }
}
```

---

## Status Determination Rules

**Simple Decision Logic:**

1. **Rule 1:** If availability = unavailable → status = **unavailable**
2. **Rule 2:** Else if contractReady = not_ready → status = **degraded**
3. **Rule 3:** Else if readiness = not_ready → status = **degraded**
4. **Rule 4:** Else → status = **healthy**

---

## Status Types

### ✅ Status: "healthy"

```json
{
  "status": "healthy",
  "reasons": [],
  "checks": {
    "health": {
      "availability": "available",
      "contractReady": "contract_ready"
    },
    "readiness": {
      "status": "ready",
      "reason": "all_checks_passed"
    }
  }
}
```

**Meaning:**
- Runtime is responding
- All contract components implemented
- Runtime can handle requests
- Fully operational

### ⚠️ Status: "degraded"

```json
{
  "status": "degraded",
  "reasons": ["Readiness check failed: processing_failed"],
  "checks": {
    "health": {
      "availability": "available",
      "contractReady": "contract_ready"
    },
    "readiness": {
      "status": "not_ready",
      "reason": "processing_failed"
    }
  }
}
```

**Meaning:**
- Runtime is responding
- BUT contract or readiness has issues
- Should not be used for production traffic
- Investigate specific issue

**Possible Reasons:**
- "Contract not ready (missing endpoints or components)"
- "Readiness check failed: request_validation_failed"
- "Readiness check failed: processing_failed"
- "Readiness check failed: invalid_response"

### ❌ Status: "unavailable"

```json
{
  "status": "unavailable",
  "reasons": ["Runtime not responding"],
  "checks": {}
}
```

**Meaning:**
- Runtime is not responding
- Cannot even check contract/readiness
- Service is down or unreachable
- Immediate action needed

---

## Flow Comparison

### Previous: Three Separate Checks
```
GET /health → availability + contractReady
GET /readiness → ready/not_ready
GET /predict → actual prediction

Problem: Need to understand all 3 separately
```

### Now: Single Status Summary
```
GET /status-summary → healthy/degraded/unavailable
→ Single decision point
→ Clear action items
```

---

## Decision Tree

```
Start: Get /status-summary
  ↓
Check availability
  ├─ unavailable → Status = UNAVAILABLE ❌
  └─ available → Continue
      ↓
      Check contractReady
      ├─ not_ready → Status = DEGRADED ⚠️
      └─ contract_ready → Continue
          ↓
          Check readiness
          ├─ not_ready → Status = DEGRADED ⚠️
          └─ ready → Status = HEALTHY ✅
```

---

## Use Cases

### 1. Application Startup
```
On app start:
  1. GET /status-summary
  2. If status == "healthy":
       Continue initialization
     Else:
       Log error, alert operator
```

### 2. Continuous Monitoring
```
Every 30 seconds:
  GET /status-summary
  If status != "healthy":
    Alert monitoring system
    Log specific reason
```

### 3. Dashboard Display
```
Runtime Status Dashboard:
  [HEALTHY] ✅         (green)
  [DEGRADED] ⚠️       (orange)
  [UNAVAILABLE] ❌     (red)
  
Reason: ${reasons[0]}
```

### 4. Load Balancer
```
Load Balancer Health Check:
  GET /status-summary
  If status == "healthy":
    Send traffic
  Else:
    Remove from pool
```

### 5. Traffic Management
```
Progressive Deployment:
  1. Deploy new version
  2. Wait for /status-summary = "healthy"
  3. Gradually shift traffic
  4. Monitor for degradation
```

---

## Simple Rules Design

**Why Simple Rules?**
- ✅ Easy to understand
- ✅ Easy to debug
- ✅ No ML/heuristics needed
- ✅ Deterministic results
- ✅ Fast decision making

**Rule Priority:**
1. Availability (infrastructure)
2. Contract (implementation)
3. Readiness (functionality)
4. Default (healthy)

---

## Endpoint Relationship

| Endpoint | Purpose | Detail Level |
|----------|---------|--------------|
| **/health** (5.5A) | Infrastructure status | availability, contractReady |
| **/readiness** (5.5B) | Application capability | 4-step test results |
| **/status-summary** (5.5C) | **Overall status** | **Single healthy/degraded/unavailable** |

---

## Response Breakdown

```json
{
  "status": "healthy",                    ← Overall status
  "timestamp": "2026-06-07T...",         ← When checked
  "reasons": [],                          ← Why not healthy (empty if healthy)
  "checks": {                             ← Detailed breakdown
    "health": {...},                      ← From /health
    "readiness": {...}                    ← From /readiness
  }
}
```

---

## Example Scenarios

### Scenario 1: Fully Healthy
```
GET /status-summary
→ status: "healthy"
→ reasons: []
→ Action: Accept traffic, business as usual
```

### Scenario 2: Contract Issue
```
GET /status-summary
→ status: "degraded"
→ reason: "Contract not ready (missing endpoints or components)"
→ Action: Check if endpoints are implemented, restart if needed
```

### Scenario 3: Processing Issue
```
GET /status-summary
→ status: "degraded"
→ reason: "Readiness check failed: processing_failed"
→ Action: Check error logs, debug processing logic
```

### Scenario 4: Runtime Down
```
GET /status-summary
→ status: "unavailable"
→ reason: "Runtime not responding"
→ Action: Check if service is running, restart, verify connectivity
```

---

## Testing Strategy

**20+ tests covering:**
- Basic response structure (required fields)
- All three status values (healthy, degraded, unavailable)
- Rule application (rules work correctly)
- Consistency (status matches checks)
- Idempotency (multiple calls same result)
- Human readability (clear reasons)

---

## Files Modified

**Backend:**
- `ml-runtime/app.py`
  - Added /status-summary endpoint
  - Aggregates health + readiness
  - Applies simple decision rules

**Tests:**
- `ml-runtime/test_status_summary.py`
  - 20+ pytest tests
  - Covers all status types
  - Validates rule logic
  - Tests consistency and idempotency

---

## Logging

**Status summary logs:**
```
[INFO] Status summary requested
[INFO] Status summary: healthy
[INFO] Status summary: degraded
[INFO] Status summary: unavailable
```

---

## What This Enables

✅ **Single Status Point** — One endpoint for overall health  
✅ **Simple Decision Logic** — Clear rules, no guessing  
✅ **Traffic Management** — Easy health-based routing  
✅ **Monitoring Integration** — Simple alert conditions  
✅ **Dashboard Display** — Single status indicator  
✅ **Operational Clarity** — Know exactly what's wrong  

---

## What This Is NOT

❌ **Auto-Healing** — Just reporting, not fixing  
❌ **Detailed Diagnostics** — High-level status only  
❌ **Performance Metrics** — Just functional status  
❌ **Advanced Heuristics** — Simple rules only  

---

## Monitoring Integration

### Option 1: Simple Alert
```
GET /status-summary every 30s
If status != "healthy":
  Alert: "${reason}"
```

### Option 2: Prometheus Gauge
```
runtime_status_summary{status="healthy"} = 1
runtime_status_summary{status="degraded"} = 0
runtime_status_summary{status="unavailable"} = 0
```

### Option 3: Dashboard
```
Display:
  🟢 HEALTHY (green circle)
  🟠 DEGRADED (orange circle)
  🔴 UNAVAILABLE (red circle)

Show latest reason
Last check: 2s ago
```

---

## Operational Decisions

```
If status == "healthy":
  ✅ Accept user traffic
  ✅ Continue operations
  ✅ Normal monitoring

If status == "degraded":
  ⚠️ Reduce traffic
  ⚠️ Investigate reason
  ⚠️ Watch closely
  ⚠️ Prepare fallback

If status == "unavailable":
  ❌ Reject traffic
  ❌ Emergency response
  ❌ Check service status
  ❌ Restart if needed
```

---

## Summary

**FÁZA 5.5C:** ✅ **COMPLETE**

Runtime status summary implemented:

- ✅ /status-summary endpoint
- ✅ Aggregated health + readiness checks
- ✅ Simple decision rules (unavailable → degraded → healthy)
- ✅ Clear status values
- ✅ Detailed failure reasons
- ✅ Full test coverage
- ✅ Human-readable output

Simple, deterministic status aggregation.

---

**Implementation Location:**
- `ml-runtime/app.py` (/status-summary endpoint)
- `ml-runtime/test_status_summary.py` (20+ tests)

**Status:** Complete and production-ready  
**Deployment:** Now with unified runtime status summary


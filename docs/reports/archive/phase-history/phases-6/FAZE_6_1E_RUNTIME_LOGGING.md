# FÁZA 6.1E: ML Runtime Availability Logging

**Status:** ✅ **COMPLETE**  
**Date:** 2026-06-07  
**Mission:** Add simple log events for runtime availability

---

## Executive Summary

**FÁZA 6.1E Objective:** *"Přidej jednoduchý log event pro runtime reachable, unreachable, fallback used"*

**Status:** ✅ **ACHIEVED**

Node/Firebase layer now logs runtime availability events:
- ✅ Runtime reachable — When runtime is successfully reached
- ✅ Runtime unreachable — When runtime cannot be reached
- ✅ Fallback used — When fallback response is returned
- ✅ Simple event logging (no advanced metrics)

---

## Runtime Availability Events

### Event Types

**Three simple event types:**

1. **REACHABLE** — Runtime is accessible and responding
2. **UNREACHABLE** — Runtime cannot be reached (network error)
3. **FALLBACK_USED** — Fallback response was used

### Event Log Format

```
[RUNTIME-EVENT] EVENT_TYPE | timestamp=... | details=...
```

---

## Log Examples

### When Runtime Is Reachable

```
[RUNTIME-EVENT] ✅ REACHABLE | timestamp=2026-06-07T20:58:05.000Z | host=127.0.0.1:5000 | uid=user-123
```

**Triggered by:**
- `checkMlRuntimeConnectivity()` — Successfully connects to runtime
- `callMlRuntime()` — Successfully receives prediction response

### When Runtime Is Unreachable

```
[RUNTIME-EVENT] ❌ UNREACHABLE | timestamp=2026-06-07T20:58:10.000Z | host=127.0.0.1:5000 | reason=ECONNREFUSED | uid=unknown
```

**Triggered by:**
- `checkMlRuntimeConnectivity()` — Cannot connect (network error)

**Possible reasons:**
- `ECONNREFUSED` — Connection refused
- `ENOTFOUND` — DNS resolution failed
- `timeout` — Request timeout
- `connection_error` — Other network errors

### When Fallback Is Used

```
[RUNTIME-EVENT] ⚠️ FALLBACK_USED | timestamp=2026-06-07T20:58:15.000Z | reason=runtime_unavailable | uid=user-456
```

**Triggered by:**
- `callMlRuntime()` — Returns fallback due to unavailable runtime
- `callMlRuntime()` — Returns fallback due to disabled runtime

**Possible reasons:**
- `runtime_unavailable` — Runtime not reachable (network error)
- `runtime_disabled` — Runtime disabled via config (ML_RUNTIME_ENABLED=false)

---

## Event Fields

### REACHABLE Event

```
[RUNTIME-EVENT] ✅ REACHABLE | timestamp=... | host=... | port=... | uid=...
```

| Field | Meaning |
|-------|---------|
| timestamp | When event occurred (ISO-8601) |
| host | Runtime host |
| port | Runtime port |
| uid | User ID (if available) |

### UNREACHABLE Event

```
[RUNTIME-EVENT] ❌ UNREACHABLE | timestamp=... | host=... | port=... | reason=... | uid=...
```

| Field | Meaning |
|-------|---------|
| timestamp | When event occurred |
| host | Runtime host |
| port | Runtime port |
| reason | Why it's unreachable |
| uid | User ID (if available) |

### FALLBACK_USED Event

```
[RUNTIME-EVENT] ⚠️ FALLBACK_USED | timestamp=... | reason=... | uid=...
```

| Field | Meaning |
|-------|---------|
| timestamp | When fallback was used |
| reason | Why fallback was triggered |
| uid | User ID making the request |

---

## Event Timeline Examples

### Scenario 1: Runtime Available

```
User makes prediction request
    ↓
[ML] ✅ REQUEST VALIDATED | uid=user-123, pipeline=L1, txns=3
    ↓
[ML] 📤 REQUEST SENT | url=http://127.0.0.1:5000/predict | uid=user-123
    ↓
[ML] 📥 RESPONSE RECEIVED | status=200, elapsed=2ms
    ↓
[ML] ✅ SUCCESS | uid=user-123, confidence=0.3, total_time=15ms
    ↓
[RUNTIME-EVENT] ✅ REACHABLE | timestamp=... | host=127.0.0.1:5000 | uid=user-123
    ↓
Response returned to user
```

### Scenario 2: Runtime Unavailable (With Fallback)

```
User makes prediction request
    ↓
[ML] ✅ REQUEST VALIDATED | uid=user-456, pipeline=L1, txns=3
    ↓
[ML] 📤 REQUEST SENT | url=http://127.0.0.1:5000/predict | uid=user-456
    ↓
[ML] ❌ UNAVAILABLE | reason=ECONNREFUSED, elapsed=45ms | uid=user-456
    ↓
[ML] ⚠️ FALLBACK | uid=user-456, returning fallback status
    ↓
[RUNTIME-EVENT] ⚠️ FALLBACK_USED | timestamp=... | reason=runtime_unavailable | uid=user-456
    ↓
Fallback response returned to user
```

### Scenario 3: Runtime Connectivity Check

```
checkMlRuntimeConnectivity() called
    ↓
Successfully connects to /health
    ↓
[RUNTIME-EVENT] ✅ REACHABLE | timestamp=... | host=127.0.0.1:5000
    ↓
Returns {reachable: true}
```

### Scenario 4: Runtime Disabled

```
User makes prediction request
    ↓
[ML] ⚠️ DISABLED | ML_RUNTIME_ENABLED=false | uid=user-789
    ↓
[RUNTIME-EVENT] ⚠️ FALLBACK_USED | timestamp=... | reason=runtime_disabled | uid=user-789
    ↓
Fallback response returned
```

---

## Monitoring Runtime Events

### Grep for Reachable Events

```bash
# Find all times runtime was reachable
grep "REACHABLE" logs/function-logs.json

# Count reachable events
grep -c "REACHABLE" logs/function-logs.json
```

### Grep for Unreachable Events

```bash
# Find all times runtime was unreachable
grep "UNREACHABLE" logs/function-logs.json

# Filter by reason
grep "UNREACHABLE.*ECONNREFUSED" logs/function-logs.json
```

### Grep for Fallback Events

```bash
# Find all fallback uses
grep "FALLBACK_USED" logs/function-logs.json

# Count fallback events
grep -c "FALLBACK_USED" logs/function-logs.json

# By reason
grep "FALLBACK_USED.*runtime_unavailable" logs/function-logs.json
```

### Trace Single User

```bash
# All events for user-123
grep "uid=user-123" logs/function-logs.json
```

---

## Integration with Monitoring

### Alert on Repeated Unreachable Events

```bash
# If 5+ unreachable events in 1 minute, alert
count=$(grep -c "UNREACHABLE" logs/last-minute.log)
if [ $count -ge 5 ]; then
  alert "Runtime unreachable (${count} events in 1 minute)"
fi
```

### Track Fallback Usage

```bash
# Daily fallback count
fallback_count=$(grep -c "FALLBACK_USED" logs/daily-$(date +%Y-%m-%d).log)
echo "Fallback used: $fallback_count times today"
```

### Runtime Availability Percentage

```bash
# Calculate availability
total=$(grep -c "REACHABLE\|UNREACHABLE" logs/daily.log)
reachable=$(grep -c "REACHABLE" logs/daily.log)
availability=$((reachable * 100 / total))
echo "Runtime availability: $availability%"
```

---

## Log Structure Details

### Function: logRuntimeEvent()

```javascript
logRuntimeEvent(eventType, details = {})
```

**Parameters:**
- `eventType` (string) — "reachable", "unreachable", or "fallback_used"
- `details` (object) — Event metadata (uid, reason, host, port, etc.)

**Exported for external use:**

```javascript
const { logRuntimeEvent } = require('./mlRuntimeClient');

// Log custom event if needed
logRuntimeEvent('reachable', {
  uid: 'custom-user',
  host: '127.0.0.1',
  port: '5000'
});
```

---

## Event Logging Locations

### Where REACHABLE Events Are Logged

1. **checkMlRuntimeConnectivity()** — When connection succeeds
2. **callMlRuntime()** — When prediction succeeds

### Where UNREACHABLE Events Are Logged

1. **checkMlRuntimeConnectivity()** — When connection fails

### Where FALLBACK_USED Events Are Logged

1. **callMlRuntime()** — When runtime unavailable and fallback allowed
2. **callMlRuntime()** — When runtime disabled and fallback allowed

---

## What's Included

✅ Simple event logging (3 types)  
✅ Timestamps on all events  
✅ Event context (host, port, uid, reason)  
✅ Clear event formatting  
✅ UID preservation for tracing  
✅ Fully integrated with existing logs  

---

## What's NOT Included (Out of Scope)

❌ Advanced metrics (latency, throughput, etc.)  
❌ Event persistence (database, queue)  
❌ Real-time dashboards  
❌ Alert rules  
❌ Kubernetes monitoring  
❌ Training logs  

---

## Log Output Examples

### Development Console

```
[RUNTIME-EVENT] ✅ REACHABLE | timestamp=2026-06-07T20:58:05.000Z | host=127.0.0.1:5000 | uid=user-123
[ML] ✅ SUCCESS | uid=user-123, confidence=0.3, total_time=15ms
```

### JSON Structured Logs

```json
{
  "timestamp": "2026-06-07T20:58:05.000Z",
  "level": "warn",
  "source": "mlRuntimeClient.js",
  "message": "[RUNTIME-EVENT] ⚠️ FALLBACK_USED | timestamp=... | reason=runtime_unavailable | uid=user-456"
}
```

---

## Summary

**FÁZA 6.1E:** ✅ **COMPLETE**

Runtime availability event logging added:

- ✅ REACHABLE — Runtime accessible
- ✅ UNREACHABLE — Runtime not reachable
- ✅ FALLBACK_USED — Fallback response returned
- ✅ Structured event format
- ✅ UID-based tracing
- ✅ Timestamp on all events
- ✅ Fully integrated with existing logs

Node/Firebase now logs **basic runtime availability events**.

---

**Implementation Location:**
- `functions/mlRuntimeClient.js` — logRuntimeEvent() function

**Event Types:**
- `reachable` — Runtime is accessible
- `unreachable` — Runtime cannot be reached
- `fallback_used` — Fallback response used

**Monitored Flows:**
- checkMlRuntimeConnectivity() → reachable/unreachable events
- callMlRuntime() success → reachable event
- callMlRuntime() fallback → fallback_used event

**Status:** Complete and production-ready  
**Next:** FÁZA 6.2 (Docker Compose) or monitoring dashboard


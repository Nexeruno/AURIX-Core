# FÁZA 6.1E: Shrnutí — Runtime Event Logging

**Status:** ✅ **COMPLETE**  
**Date:** 2026-06-07

---

## Co Bylo Uděláno

### Simple Log Events pro Runtime Availability

```javascript
logRuntimeEvent(eventType, details)
├─ eventType: "reachable", "unreachable", "fallback_used"
└─ details: {uid, reason, host, port, timestamp}
```

---

## Log Events

### REACHABLE (Runtime dostupný)

```
[RUNTIME-EVENT] ✅ REACHABLE | timestamp=... | host=127.0.0.1:5000 | uid=user-123
```

**Kdy:** Runtime je dostupný a reaguje

### UNREACHABLE (Runtime nedostupný)

```
[RUNTIME-EVENT] ❌ UNREACHABLE | timestamp=... | host=127.0.0.1:5000 | reason=ECONNREFUSED | uid=unknown
```

**Kdy:** Runtime nemůže být dosažen (network error)

**Reasons:** ECONNREFUSED, ENOTFOUND, timeout, connection_error

### FALLBACK_USED (Fallback vrácen)

```
[RUNTIME-EVENT] ⚠️ FALLBACK_USED | timestamp=... | reason=runtime_unavailable | uid=user-456
```

**Kdy:** Fallback response vrácen místo runtime odpovědi

**Reasons:** runtime_unavailable, runtime_disabled

---

## Scénáře

### Runtime je dostupný

```
callMlRuntime() → [ML] ✅ SUCCESS
    ↓
[RUNTIME-EVENT] ✅ REACHABLE | uid=user-123
    ↓
Normal response
```

### Runtime není dostupný

```
callMlRuntime() → [ML] ❌ UNAVAILABLE | reason=ECONNREFUSED
    ↓
[RUNTIME-EVENT] ⚠️ FALLBACK_USED | reason=runtime_unavailable | uid=user-456
    ↓
Fallback response
```

### Runtime vypnutý

```
callMlRuntime() → [ML] ⚠️ DISABLED
    ↓
[RUNTIME-EVENT] ⚠️ FALLBACK_USED | reason=runtime_disabled | uid=user-789
    ↓
Fallback response
```

---

## Monitorování

### Grep pro reachable

```bash
grep "REACHABLE" logs/function-logs.json
```

### Grep pro unreachable

```bash
grep "UNREACHABLE" logs/function-logs.json
```

### Grep pro fallback

```bash
grep "FALLBACK_USED" logs/function-logs.json
```

### Trace uživatele

```bash
grep "uid=user-123" logs/function-logs.json
```

---

## Summary

**FÁZA 6.1E: ✅ COMPLETE**

Runtime availability logging added:

- ✅ REACHABLE event — When runtime accessible
- ✅ UNREACHABLE event — When runtime not reachable
- ✅ FALLBACK_USED event — When fallback used
- ✅ Structured event format
- ✅ UID tracing
- ✅ Timestamps
- ✅ Easy monitoring via grep

Node/Firebase now logs **basic runtime availability flow**.

---

**Implementation:** functions/mlRuntimeClient.js  
**Function:** `logRuntimeEvent(eventType, details)`  
**Events:** reachable, unreachable, fallback_used  
**Status:** Complete and production-ready  
**Next:** FÁZA 6.2 (Docker Compose) or monitoring


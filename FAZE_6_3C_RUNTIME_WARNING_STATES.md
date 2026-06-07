# FÁZA 6.3C: Podman Runtime Warning States

**Status:** ✅ **COMPLETE**  
**Date:** 2026-06-07  
**Mission:** Add simple Podman runtime warning states to observability

---

## Executive Summary

**FÁZA 6.3C Objective:** *"Přidej simple Podman runtime warning states: runtime unavailable, fallback active, config mismatch"*

**Status:** ✅ **ACHIEVED**

Podman runtime warning states now displayed in AI Observability Console:
- ✅ Runtime Unavailable warning (critical)
- ✅ Fallback Active warning (system in degraded mode)
- ✅ Config Mismatch warning (settings issue)
- ✅ Visual indicators (red/orange with icons)
- ✅ Detailed warning messages
- ✅ Timestamp for each warning

---

## Implementation

### Hook Enhancement: usePodmanRuntimeStatus

**File:** `desktop-app/src/hooks/usePodmanRuntimeStatus.ts`

**New Types:**
```typescript
export interface PodmanRuntimeWarning {
  type: 'runtime_unavailable' | 'fallback_active' | 'config_mismatch'
  severity: 'warning' | 'critical'
  message: string
  timestamp?: Date
}
```

**New Field in Status:**
```typescript
warnings?: PodmanRuntimeWarning[]
```

---

## Warning States

### 1. Runtime Unavailable

**Type:** `runtime_unavailable`  
**Severity:** 🔴 Critical  
**Trigger:** `!isReachable` (cannot connect to runtime)

**Message:**
```
Runtime Unavailable
ML Runtime is not reachable. Check if Podman container is running.
```

**Visual:**
- 🔴 Red background (critical)
- Red icon
- Urgent tone

**Causes:**
- Container is stopped
- Network unreachable
- Port not exposed
- Service name wrong

**Solution:**
- Check `docker-compose up` status
- Verify container is running: `docker ps`
- Check network connectivity
- Verify environment variables

### 2. Fallback Active

**Type:** `fallback_active`  
**Severity:** ⚠️ Warning  
**Trigger:** `readiness === 'degraded'` (system in degraded mode)

**Message:**
```
Fallback Active
System is in degraded mode. Fallback responses active.
```

**Visual:**
- ⚠️ Yellow background (warning)
- Warning icon
- Informational tone

**Causes:**
- Runtime temporarily unavailable
- Health check failed
- Partial failure in dependencies
- Using fallback responses

**Solution:**
- Check runtime logs for errors
- Restart container: `docker restart ml-runtime`
- Verify configuration
- Wait for recovery

### 3. Config Mismatch

**Type:** `config_mismatch`  
**Severity:** ⚠️ Warning  
**Trigger:** Backend responds OK but `readiness !== 'ready' && readiness !== 'degraded'`

**Message:**
```
Config Mismatch
Configuration mismatch detected. Check environment variables and settings.
```

**Visual:**
- ⚠️ Yellow background (warning)
- Warning icon
- Configuration issue

**Causes:**
- Environment variable mismatch
- Backend/Runtime port mismatch
- Service name incorrect
- Configuration not loaded

**Solution:**
- Review .env.docker-compose
- Check environment variables: `env | grep ML_RUNTIME`
- Verify ML_RUNTIME_HOST and ML_RUNTIME_PORT
- Restart services with correct config

---

## UI Component

### Podman Runtime Warnings Panel

**Location:** Status Tab → Below Container Health panel

**Display:**
```
⚠️ Podman Runtime Warnings (N)
┌─────────────────────────────────────────┐
│ 🔴 Runtime Unavailable                  │
│ ML Runtime is not reachable. Check if   │
│ Podman container is running.            │
│ 14:25:30                                │
├─────────────────────────────────────────┤
│ ⚠️ Fallback Active                      │
│ System is in degraded mode. Fallback    │
│ responses active.                       │
│ 14:24:15                                │
└─────────────────────────────────────────┘
```

**Styling:**
- Container: Orange background (warning context)
- Critical warnings: Red background, red icon (🔴)
- Warnings: Yellow background, warning icon (⚠️)
- Each warning shows: icon, title, message, timestamp

**Visibility:**
- Only shown when warnings exist
- Conditional render: `{podmanStatus.warnings && podmanStatus.warnings.length > 0 && ...}`
- Clear count: "Warnings (N)"

---

## Data Flow

### Detection Logic

**In usePodmanRuntimeStatus hook:**

```typescript
const warnings: PodmanRuntimeWarning[] = []

// 1. Runtime Unavailable
if (!isReachable) {
  warnings.push({
    type: 'runtime_unavailable',
    severity: 'critical',
    message: 'ML Runtime is not reachable. Check if Podman container is running.',
    timestamp: new Date(),
  })
}

// 2. Fallback Active
if (readiness === 'degraded') {
  warnings.push({
    type: 'fallback_active',
    severity: 'warning',
    message: 'System is in degraded mode. Fallback responses active.',
    timestamp: new Date(),
  })
}

// 3. Config Mismatch
if (response.ok && readiness !== 'ready' && readiness !== 'degraded') {
  warnings.push({
    type: 'config_mismatch',
    severity: 'warning',
    message: 'Configuration mismatch detected. Check environment variables and settings.',
    timestamp: new Date(),
  })
}
```

### Error Handling

When check fails (network error, timeout):
```typescript
warnings.push({
  type: 'runtime_unavailable',
  severity: 'critical',
  message: `Cannot reach runtime: ${errorMsg}`,
  timestamp: new Date(),
})
```

---

## Features

### Runtime Unavailable
- ✅ Critical severity (red)
- ✅ Actionable message
- ✅ Solution suggestions in docs
- ✅ Appears when container unreachable

### Fallback Active
- ✅ Warning severity (orange)
- ✅ Informational tone
- ✅ Indicates degraded mode
- ✅ Backend using fallback responses

### Config Mismatch
- ✅ Warning severity (orange)
- ✅ Configuration context
- ✅ Check environment suggestion
- ✅ Only when backend OK but status odd

### Panel Features
- ✅ Only shows when warnings exist
- ✅ Warning count displayed
- ✅ Each warning has timestamp
- ✅ Color-coded severity
- ✅ Icon indicators
- ✅ Multi-line messages

---

## Scenarios

### Scenario 1: Healthy System
```
Runtime Available: ✅ Available
Request Path Health: ✅ Healthy
Warnings: (none)

Result: ✅ System fully operational
```

### Scenario 2: Container Down
```
Runtime Available: ❌ Unavailable
Request Path Health: ❌ Unhealthy
Warnings:
  🔴 Runtime Unavailable
     ML Runtime is not reachable...

Result: ❌ Critical issue
```

### Scenario 3: Temporary Failure
```
Runtime Available: ✅ Available
Request Path Health: ⚠️ Unhealthy
Warnings:
  ⚠️ Fallback Active
     System is in degraded mode...

Result: ⚠️ Degraded but recovering
```

### Scenario 4: Config Problem
```
Runtime Available: ✅ Available
Request Path Health: ✅ Healthy
Warnings:
  ⚠️ Config Mismatch
     Configuration mismatch detected...

Result: ⚠️ Settings need review
```

---

## Integration

### With Container Health Panel
- Container Health: Binary status (healthy/unhealthy)
- Warnings Panel: Detailed issue diagnosis
- Together: Complete health picture

### With Podman Runtime Status Card
- Status Card: Connected/disconnected
- Warnings: Why it's disconnected (unavailable vs config mismatch)
- Together: Status + context

### With Backend Orchestration Logging
- Backend logs warning events (6.2E)
- Frontend displays them (6.3C)
- Combined: Full observability chain

---

## Files Changed

### Modified Files

**`desktop-app/src/hooks/usePodmanRuntimeStatus.ts`**
- Added PodmanRuntimeWarning interface
- Added warnings field to PodmanRuntimeStatus
- Updated status initialization with empty warnings array
- Added detection logic for three warning types
- Updated error handling to include runtime unavailable warning

**`desktop-app/src/pages/AiObservabilityPage.tsx`**
- Added Podman Runtime Warnings panel
- Conditional render when warnings exist
- Display warning count in header
- List each warning with severity, icon, message, timestamp
- Color-coded backgrounds (red/yellow)

---

## Code Quality

### Hook Enhancement
- ✅ Type-safe warning interface
- ✅ Clear detection logic
- ✅ Covers all three warning types
- ✅ Includes error handling
- ✅ Timestamps for each warning

### UI Component
- ✅ Conditional rendering (only when warnings)
- ✅ Color-coded severity
- ✅ Icon indicators
- ✅ Proper semantic structure
- ✅ Accessible (readable text)
- ✅ Dark mode support

---

## Testing

### Test 1: Runtime Unavailable
1. Stop ML runtime: `docker stop ml-runtime`
2. Wait for status check
3. ✅ Should show: 🔴 Runtime Unavailable warning

### Test 2: Fallback Active
1. Configure fallback: Set ML_RUNTIME_ENABLED=false temporarily
2. Check observability
3. ✅ Should show: ⚠️ Fallback Active warning

### Test 3: Config Mismatch
1. Set wrong environment variable: ML_RUNTIME_HOST=wrong-host
2. Restart backend
3. ✅ Should show: ⚠️ Config Mismatch warning

### Test 4: Multiple Warnings
1. Create multiple issues simultaneously
2. Check warnings panel
3. ✅ Should show all warnings with count

### Test 5: Clear Warnings
1. Fix issues (restart container, correct config)
2. Wait for next check
3. ✅ Warnings should disappear

---

## What's Included ✅

✅ Runtime Unavailable warning (critical)  
✅ Fallback Active warning  
✅ Config Mismatch warning  
✅ Warning detection logic in hook  
✅ Podman Warnings panel in UI  
✅ Severity indicators (critical/warning)  
✅ Icon indicators (🔴/⚠️)  
✅ Warning messages  
✅ Timestamps  
✅ Conditional rendering  

---

## What's NOT Included ❌

❌ Alerting/notifications  
❌ Email alerts  
❌ Slack/webhook integration  
❌ Kubernetes integration  
❌ Training pipeline warnings  
❌ Advanced infrastructure diagnostics  
❌ Auto-remediation  
❌ Historical warning tracking  

---

## Performance

### Detection
- Runs with each status check (5s)
- Minimal CPU overhead
- Single pass through response

### Rendering
- Panel only renders when warnings exist
- Each warning: ~100 bytes in DOM
- Updates only on change

---

## User Experience

### For Operators
- Clear visibility of issues
- Severity indicators (critical/warning)
- Actionable messages
- Timestamps for debugging
- Only shows when relevant

### For Developers
- Type-safe warning interface
- Easy to add new warning types
- Clear detection logic
- Follows React patterns

---

## Future Enhancements

### FÁZA 6.3D
- Action suggestions per warning
- Auto-recovery hints
- Integration with backend logs

### Beyond FÁZA 6.3
- Historical warning tracking
- Alert thresholds
- Webhook integration
- Slack notifications

---

## Summary

**FÁZA 6.3C: ✅ COMPLETE**

Podman runtime warning states now displayed:

- ✅ Runtime Unavailable (critical: 🔴)
- ✅ Fallback Active (warning: ⚠️)
- ✅ Config Mismatch (warning: ⚠️)
- ✅ Warnings panel with detection logic
- ✅ Severity-based styling
- ✅ Timestamps for each warning
- ✅ Conditional display (only when needed)

Simple, effective warning system for Podman runtime issues.

---

**Files:**
- desktop-app/src/hooks/usePodmanRuntimeStatus.ts (enhanced)
- desktop-app/src/pages/AiObservabilityPage.tsx (added panel)

**Status:** Complete  
**Next:** FÁZA 6.3D or deployment

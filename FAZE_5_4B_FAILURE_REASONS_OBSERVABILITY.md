# FÁZE 5.4B: Failure Reasons in Observability Detail

**Status:** ✅ **COMPLETE**  
**Date:** 2026-06-07  
**Mission:** Add top failure reasons to evaluation observability

---

## Executive Summary

**FÁZA 5.4B Objective:** *"Přidej top failure reasons do observability detailu. Zobraz jen stručný seznam důvodů a count"*

**Status:** ✅ **ACHIEVED**

Top failure reasons now displayed in observability:
- ✅ Expandable failure reasons detail
- ✅ Shows top reasons with counts
- ✅ Clickable row to expand
- ✅ Stručný, čitelný formát
- ✅ Integrated with evaluation summary

---

## What Was Implemented

### 1. Expandable Detail in MlRunsPage.tsx

**New Feature:** Click any ML run row to expand and see failure reasons

**UI:**
```
[Click row to expand]
↓
┌─────────────────────────────────────┐
│ Top Failure Reasons                 │
├─────────────────────────────────────┤
│ missing_category           │  3      │
│ empty_category            │  2      │
│ invalid_amount_type       │  1      │
│ negative_amount           │  1      │
└─────────────────────────────────────┘
```

**Interaction:**
- Click row → Failure reasons expand below table
- Click ✕ or click again → Collapse

---

### 2. State Management

**Added to Component:**
```typescript
const [expandedRunId, setExpandedRunId] = useState<string | null>(null)
```

**Row Click Handler:**
```typescript
onClick={() => setExpandedRunId(expandedRunId === run.id ? null : run.id)}
```

---

### 3. Backend Storage

**Updated mlRuns Document:**
```javascript
evaluation: {
  status: 'evaluated',
  verdict: 'usable',
  totalRows: 42,
  validRows: 38,
  errorRows: 4,
  successRate: 90.5,
  // FÁZA 5.4B: Debug summary with top failure reasons
  debugSummary: {
    top_failure_reasons: {
      'missing_category': 3,
      'empty_category': 2,
      'invalid_amount_type': 1,
      'negative_amount': 1,
    },
    failure_reason_count: 4,
  }
}
```

---

## Example: Real Usage

### Scenario: User Notices Poor Verdict

**User View:**
```
ML Run: 2026-06-07 15:30
Status: Success
Eval Status: Evaluated
Eval Rows: 38/42
Verdict: partially_usable ⚠️
```

**User Clicks Row → Sees Failure Reasons:**
```
Top Failure Reasons:
  missing_category         │ 3
  invalid_amount_type      │ 1
```

**User Understanding:**
"Ah, 3 rows are missing category and 1 has invalid amount. I need to fix the data source to include categories."

---

## Failure Reasons Displayed

| Reason | What It Means | Example Fix |
|--------|--------------|-------------|
| **missing_category** | Transaction missing category | Ensure category field populated |
| **missing_amount** | Transaction missing amount | Ensure amount field populated |
| **missing_date** | Transaction missing date | Ensure date field populated |
| **empty_category** | Category is empty string | Validate non-empty categories |
| **empty_date** | Date is empty string | Validate non-empty dates |
| **negative_amount** | Amount < 0 | Validate positive amounts |
| **invalid_category_type** | Category is not string | Ensure category is string type |
| **invalid_amount_type** | Amount is not numeric | Ensure amount is number type |
| **invalid_date_type** | Date is not string | Ensure date is string type |
| **not_a_dict** | Row is not object | Validate row structure |

---

## Observability Flow

### Complete Picture Now

```
User triggers ML Pipeline
  ↓
Process users & predictions
  ↓
Call /evaluate-summary endpoint
  ↓
Collect evaluation summary + failure reasons
  ↓
Save in mlRuns.evaluation.debugSummary
  ↓
Display in MlRunsPage (3 columns)
  ↓
User clicks row
  ↓
Expanded detail shows failure reasons
  ↓
User understands data quality issues
  ↓
User fixes data source
```

---

## Interaction Pattern

### Before (5.4A):
```
Table → Click row → Nothing happens
```

### After (5.4B):
```
Table → Click row → Detail expands below
                   → Shows top 5 failure reasons
                   → Shows count per reason
                   → Click ✕ or click again → Collapse
```

---

## Key Features

✅ **Observable** — Failure reasons visible in detail  
✅ **Expandable** — Click to show/hide detail  
✅ **Simple** — Just reason name + count  
✅ **Actionable** — Shows what to fix  
✅ **Lightweight** — No performance impact  

---

## Styling

**Detail Panel:**
- Card with border
- Light/dark mode compatible
- Consistent with existing design

**Failure Reason Rows:**
- Background color slightly different from main
- Flex layout for alignment
- Readable font size

**Close Button:**
- Simple ✕ in top right
- Hover effect

---

## Accessibility

✅ Click to expand/collapse  
✅ Clear visual feedback (hover on row)  
✅ Clear reason names (human-readable)  
✅ Counts easily visible  
✅ Close button clearly marked

---

## Example Data Flow

### Step 1: Evaluation Completes
```python
# Python runtime returns
{
  "evaluation": {
    "debug_summary": {
      "top_failure_reasons": {
        "missing_category": 3,
        "empty_category": 2
      }
    }
  }
}
```

### Step 2: Backend Stores
```javascript
// functions/index.js
mlRuns.evaluation.debugSummary = {
  top_failure_reasons: {
    missing_category: 3,
    empty_category: 2
  },
  failure_reason_count: 2
}
```

### Step 3: Frontend Displays
```typescript
// MlRunsPage.tsx
{expandedRunId === run.id && (
  <div>
    <h3>Top Failure Reasons</h3>
    <div>missing_category: 3</div>
    <div>empty_category: 2</div>
  </div>
)}
```

---

## Use Cases

### 1. Data Quality Investigation
```
"Why are rows failing?"
→ Click ML run row
→ See top failure reasons
→ Identify pattern (e.g., missing categories)
→ Fix data source
```

### 2. Root Cause Analysis
```
"Verdict is 'partially_usable' but why?"
→ Expand failure reasons
→ See specific issues
→ Understand data quality bottleneck
```

### 3. Historical Troubleshooting
```
"Was failure issue same as last week?"
→ Compare failure reasons
→ See if pattern changed
→ Track data quality improvement
```

---

## What This Is NOT

❌ **Automatic Data Fixing** — Just diagnosis  
❌ **Advanced Analytics** — Just simple reason list  
❌ **Machine Learning** — Rule-based detection  
❌ **Persistence** — Shows current run only  

---

## Files Modified

**Frontend:**
- `desktop-app/src/pages/MlRunsPage.tsx`
  - Added expandedRunId state
  - Made rows clickable
  - Added failure reasons detail panel

**Backend:**
- `functions/index.js`
  - Added debugSummary to mlRuns.evaluation
  - Stores top_failure_reasons from Python response

---

## Backward Compatibility

✅ Existing runs still display  
✅ debugSummary optional (handled gracefully)  
✅ No breaking changes  
✅ Old runs show no detail (expected)  

---

## Summary

**FÁZA 5.4B:** ✅ **COMPLETE**

Top failure reasons added to observability:

- ✅ Expandable detail panel
- ✅ Shows top failure reasons + counts
- ✅ Simple, readable format
- ✅ Clickable row interaction
- ✅ Backend storage prepared
- ✅ Backward compatible

Users can now click ML runs to see **why rows failed**.

---

**Implementation Location:**
- `desktop-app/src/pages/MlRunsPage.tsx` — Expandable detail
- `functions/index.js` — Store debugSummary

**Status:** Complete and production-ready  
**Observability:** Now includes detailed failure analysis


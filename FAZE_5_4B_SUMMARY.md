# FÁZE 5.4B: Shrnutí — Failure Reasons in Observability

**Status:** ✅ **HOTOVO**  
**Datum:** 2026-06-07

---

## Co Bylo Vytvořeno

### Expandable Failure Reasons Detail

Kliknutí na ML run řádek → Zobrazit top failure reasons

---

## Příklad

### Tabulka
```
[ML Run] [L1] [Success] [50 users] [Evaluated] [45/48] [✅ usable]
```

### Kliknutí na řádek ↓
```
┌──────────────────────────────────┐
│ Top Failure Reasons              │
├──────────────────────────────────┤
│ missing_category        │  3     │
│ empty_category          │  2     │
│ invalid_amount_type     │  1     │
└──────────────────────────────────┘
```

---

## Implementace

**Frontend (MlRunsPage.tsx):**
- Nový state: expandedRunId
- Rows jsou clickable
- Detail panel se failure reasons

**Backend (functions/index.js):**
- Uložit debugSummary do mlRuns.evaluation
- Obsahuje top_failure_reasons + counts

---

## Co Je Hotovo

✅ Expandable detail panel  
✅ Clickable row interaction  
✅ Top failure reasons zobrazeny  
✅ Counts per reason  
✅ Stručný formát  
✅ Backend storage  

---

## Use Cases

1. **Investigation** — "Proč rows selhaly?" → Klikni → Vidíš důvody
2. **Root Cause** — "Proč verdict je partial?" → Expande detail
3. **Trending** — Porovnáš failure reasons v čase

---

## Shrnutí

**FÁZA 5.4B: ✅ COMPLETE**

Top failure reasons jsou **viditelné** v detail:

- ✅ Expandable detail panel
- ✅ Shows reasons + counts
- ✅ Clickable row interaction
- ✅ Simple, stručný formát

Uživatelé teď vidí **proč rows selhaly** v expanded detail.

---

**Implementace:** desktop-app/ + functions/  
**Status:** Production-ready  
**Observability:** Nyní s failure reason detail


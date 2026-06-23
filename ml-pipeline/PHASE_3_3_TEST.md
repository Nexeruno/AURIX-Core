# FÁZE 3.3A–3.3C: KOMPLEXNÍ TEST

Datum: 2026-06-07
Status: IN PROGRESS

## Test Plan

### 1. FÁZE 3.3A: Export Layer
- Ověřit, že `exportTrainReadyDataset` HTTP endpoint existuje
- Ověřit strukturu exportu (metadata + rows)
- Ověřit filtrování jen trainReady rows

### 2. FÁZE 3.3B: Python Dataset Loader
- Ověřit syntaxi `dataset_loader.py`
- Ověřit, že loader umí načíst export
- Ověřit validaci dataset shape

### 3. FÁZE 3.3C: Sanity Check Script
- Ověřit syntaxi `sanity_check.py`
- Ověřit na valid datasetu (PASS)
- Ověřit na invalid datasetu (FAIL)
- Ověřit exit codes

### 4. End-to-End Workflow
- Loader → DataFrame → Sanity Check
- Verifikace chain-u všech komponent

---

## Test Results

### FÁZE 3.3A: Export Layer

# ML Runtime API Contracts v1.0

**Shared schema definitions for Firebase ↔ Python ML Runtime communication**

---

## 📋 Contents

This directory contains the **single source of truth** for all API contracts between Firebase (TypeScript) and Python ML Runtime.

```
ml_runtime_contracts.json
  ├─ ValidateDatasetRequest       (POST /api/ml/validate-dataset input)
  ├─ ValidateDatasetResponse      (POST /api/ml/validate-dataset output)
  ├─ EvaluateModelRequest         (POST /api/ml/evaluate input)
  └─ EvaluateModelResponse        (POST /api/ml/evaluate output)
```

---

## 🔄 How to Use

### TypeScript (Firebase)

**Generate types from schema:**
```bash
npm install -D json-schema-to-typescript
npx json-schema-to-typescript ml_runtime_contracts.json -o ../../functions/src/types/MLRuntimeContracts.ts
```

**Use in code:**
```typescript
import {
  ValidateDatasetRequest,
  ValidateDatasetResponse,
  EvaluateModelRequest,
  EvaluateModelResponse
} from './types/MLRuntimeContracts';

// Type-safe request
const request: ValidateDatasetRequest = {
  dataset_path: "gs://bucket/exports/dataset-20260607.json",
  validation_level: "full"  // Optional: defaults to "full"
};

// Type-safe response
const response: ValidateDatasetResponse = {
  run_id: "20260607-val-001",
  status: "PASS",
  dataset_stats: { ... },
  quality_gates: { ... }
};
```

### Python (ML Runtime)

**Generate dataclasses from schema:**
```bash
pip install pydantic dataclasses-json
# Manual: Copy schema to ml_pipeline/schemas.py and create Pydantic models
```

**Use in code:**
```python
from ml_pipeline.schemas import (
    ValidateDatasetRequest,
    ValidateDatasetResponse,
    EvaluateModelRequest,
    EvaluateModelResponse
)

# Type-safe request
request = ValidateDatasetRequest(
    dataset_path="gs://bucket/exports/dataset-20260607.json",
    validation_level="full"
)

# Type-safe response
response = ValidateDatasetResponse(
    run_id="20260607-val-001",
    status="PASS",
    dataset_stats={ ... },
    quality_gates={ ... }
)
```

---

## 📥 REQUEST SHAPES

### ValidateDatasetRequest

**Required fields:**
- `dataset_path` (string, GCS path)

**Optional fields:**
- `run_id` (string or null, auto-generate if missing)
- `validation_level` (enum: "quick" | "full", default: "full")
- `format` (enum: "json" | "csv", default: "json")
- `timeout_seconds` (integer 10-600, default: 30)

**Example:**
```json
{
  "dataset_path": "gs://bucket/exports/dataset-20260607.json",
  "run_id": "20260607-val-001",
  "validation_level": "full",
  "format": "json"
}
```

---

### EvaluateModelRequest

**Required fields:**
- `model_path` (string, GCS path to .pkl file)

**Optional fields:**
- `validation_data_path` (string or null, use default if null)
- `run_id` (string or null, auto-generate if missing)
- `timeout_seconds` (integer 10-600, default: 30)

**Example:**
```json
{
  "model_path": "gs://bucket/models/v3.3/model.pkl",
  "validation_data_path": "gs://bucket/data/validation-20260607.json"
}
```

---

## 📤 RESPONSE SHAPES

### ValidateDatasetResponse

**Required fields:**
- `run_id` (string)
- `status` (enum: "PASS" | "FAIL" | "WARNING")
- `dataset_stats` (object with total_rows, valid_rows, unique_users, etc.)

**Optional fields (included if validation passes):**
- `timestamp` (ISO-8601 string)
- `schema_validation` (object)
- `quality_metrics` (object)
- `quality_gates` (object with pass/fail per gate)
- `issues` (array of issues found)
- `recommendations` (array of actionable recommendations)

**Example (PASS):**
```json
{
  "run_id": "20260607-val-001",
  "status": "PASS",
  "timestamp": "2026-06-07T14:32:15Z",
  "dataset_stats": {
    "total_rows": 8247,
    "valid_rows": 8211,
    "unique_users": 1847,
    "valid_percentage": 99.56
  },
  "quality_gates": {
    "all_gates_passed": true
  },
  "recommendations": ["Dataset is ready for training"]
}
```

---

### EvaluateModelResponse

**Required fields:**
- `run_id` (string)
- `status` (enum: "PASS" | "FAIL")
- `accuracy` (number 0-1)
- `f1_score` (number 0-1)

**Optional fields:**
- `timestamp` (ISO-8601 string)

**Example (PASS):**
```json
{
  "run_id": "20260607-eval-001",
  "status": "PASS",
  "accuracy": 0.942,
  "f1_score": 0.931,
  "timestamp": "2026-06-07T14:35:22Z"
}
```

---

## 📏 Field Requirements Summary

| Endpoint | Request | Response | Purpose |
|----------|---------|----------|---------|
| **POST /api/ml/validate-dataset** | dataset_path (req) | status + stats | Validate training data |
| **POST /api/ml/evaluate** | model_path (req) | accuracy + F1 | Evaluate trained model |

---

## 🔀 Versioning

**Current version:** 1.0.0

**When to bump version:**
- `MAJOR`: Breaking changes (remove/rename required fields)
- `MINOR`: New optional fields, new response fields
- `PATCH`: Field descriptions, bug fixes

**Version history:**
- 1.0.0 (2026-06-07): Initial version with dataset validation + model evaluation

---

## 🛠️ Maintenance

**To add a new endpoint:**
1. Add new `RequestType` and `ResponseType` to `definitions` in `ml_runtime_contracts.json`
2. Regenerate TypeScript types: `npm run generate:types`
3. Regenerate Python dataclasses: `python scripts/generate_schemas.py`
4. Update `README.md` with new endpoint documentation
5. Bump schema version (MINOR bump for new optional endpoints)

**To modify existing endpoint:**
1. Edit schema in `ml_runtime_contracts.json`
2. Verify backward compatibility (don't remove required fields)
3. Regenerate types in both TypeScript and Python
4. Update `README.md` documentation

---

## ✅ Validation

Both Firebase and Python runtime **MUST validate** incoming requests against this schema:

**TypeScript (Firebase):**
```typescript
import Ajv from 'ajv';

const ajv = new Ajv();
const schema = require('./ml_runtime_contracts.json');
const validate = ajv.compile(schema.definitions.ValidateDatasetRequest);

if (!validate(request)) {
  throw new Error(`Invalid request: ${JSON.stringify(validate.errors)}`);
}
```

**Python (ML Runtime):**
```python
from jsonschema import validate, ValidationError
import json

schema = json.load(open('ml_runtime_contracts.json'))

try:
  validate(instance=request, schema=schema['definitions']['ValidateDatasetRequest'])
except ValidationError as e:
  raise ValueError(f"Invalid request: {e.message}")
```

---

## 📚 Related Files

- `ml_runtime_contracts.json` - This schema (source of truth)
- `../../functions/src/types/MLRuntimeContracts.ts` - Generated TypeScript types
- `../../src/schemas.py` - Generated Python dataclasses (or manual Pydantic models)
- `API_CONTRACT_4_1D.md` - Documentation for POST /api/ml/validate-dataset (KROK 2)
- `MINIMAL_EVAL_CONTRACT_4_1G.md` - Documentation for POST /api/ml/evaluate (KROK 3b)
- `INPUT_VALIDATION_4_1H.md` - Pre-flight validation rules

---

**Status:** ✅ v1.0.0 STABLE

This is the single source of truth. Both Firebase and Python runtime must use types generated from this schema.

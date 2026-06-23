/**
 * Contract Sanity Check: Mock Request/Response Validation Tests
 *
 * Tests that the validation layer correctly accepts valid samples
 * and rejects invalid samples against the ML Runtime API contracts.
 */

import { RequestValidator, ResponseValidator, ValidationError } from "./RequestValidator";


// ============================================================================
// MOCK VALID SAMPLES
// ============================================================================

const VALID_DATASET_REQUEST = {
  dataset_path: "gs://evidence-bucket/exports/dataset-20260607.json",
  run_id: "20260607-val-001",
  validation_level: "full",
  format: "json"
};

const VALID_DATASET_REQUEST_MINIMAL = {
  dataset_path: "gs://evidence-bucket/exports/dataset-20260607.json"
  // Optional fields omitted - should still pass
};

const VALID_DATASET_RESPONSE = {
  run_id: "20260607-val-001",
  status: "PASS",
  timestamp: "2026-06-07T14:32:15Z",
  dataset_stats: {
    total_rows: 8247,
    valid_rows: 8211,
    unique_users: 1847,
    valid_percentage: 99.56
  },
  quality_gates: {
    all_gates_passed: true
  },
  recommendations: [
    "Dataset is ready for training",
    "Consider removing 36 rows with predictedTotal ≤ 0"
  ]
};

const VALID_EVALUATE_REQUEST = {
  model_path: "gs://evidence-bucket/models/v3.3/model.pkl",
  validation_data_path: "gs://evidence-bucket/data/validation-20260607.json",
  run_id: "20260607-eval-001",
  timeout_seconds: 30
};

const VALID_EVALUATE_REQUEST_MINIMAL = {
  model_path: "gs://evidence-bucket/models/v3.3/model.pkl"
  // Optional fields omitted, validation_data_path will use default
};

const VALID_EVALUATE_RESPONSE = {
  run_id: "20260607-eval-001",
  status: "PASS",
  accuracy: 0.942,
  f1_score: 0.931,
  timestamp: "2026-06-07T14:35:22Z"
};

const VALID_EVALUATE_RESPONSE_MINIMAL = {
  run_id: "20260607-eval-001",
  status: "FAIL",
  accuracy: 0.75,
  f1_score: 0.72
  // timestamp is optional
};


// ============================================================================
// MOCK INVALID SAMPLES
// ============================================================================

const INVALID_DATASET_REQUEST_MISSING_REQUIRED = {
  run_id: "20260607-val-001",
  validation_level: "full"
  // Missing: dataset_path (REQUIRED)
};

const INVALID_DATASET_REQUEST_BAD_PATH = {
  dataset_path: "/local/path/dataset.json", // Not GCS path
  run_id: "20260607-val-001"
};

const INVALID_DATASET_REQUEST_BAD_VALIDATION_LEVEL = {
  dataset_path: "gs://bucket/exports/dataset.json",
  validation_level: "super" // Must be "quick" or "full"
};

const INVALID_DATASET_REQUEST_BAD_TIMEOUT = {
  dataset_path: "gs://bucket/exports/dataset.json",
  timeout_seconds: 5 // Must be 10-600
};

const INVALID_DATASET_RESPONSE_MISSING_REQUIRED = {
  run_id: "20260607-val-001"
  // Missing: status (REQUIRED)
  // Missing: dataset_stats (REQUIRED)
};

const INVALID_DATASET_RESPONSE_BAD_STATUS = {
  run_id: "20260607-val-001",
  status: "UNKNOWN", // Must be "PASS", "FAIL", or "WARNING"
  dataset_stats: {
    total_rows: 100,
    valid_rows: 80,
    unique_users: 10
  }
};

const INVALID_DATASET_RESPONSE_BAD_STATS = {
  run_id: "20260607-val-001",
  status: "PASS",
  dataset_stats: {
    total_rows: 100
    // Missing: valid_rows, unique_users
  }
};

const INVALID_EVALUATE_REQUEST_MISSING_REQUIRED = {
  validation_data_path: "gs://bucket/data/val.json",
  run_id: "20260607-eval-001"
  // Missing: model_path (REQUIRED)
};

const INVALID_EVALUATE_REQUEST_BAD_PATH = {
  model_path: "gs://bucket/model.xyz", // Wrong extension (.pkl required)
  validation_data_path: "gs://bucket/data/val.json"
};

const INVALID_EVALUATE_RESPONSE_MISSING_REQUIRED = {
  run_id: "20260607-eval-001"
  // Missing: status (REQUIRED)
  // Missing: accuracy (REQUIRED)
  // Missing: f1_score (REQUIRED)
};

const INVALID_EVALUATE_RESPONSE_BAD_ACCURACY = {
  run_id: "20260607-eval-001",
  status: "PASS",
  accuracy: 1.5, // Must be 0-1
  f1_score: 0.931
};

const INVALID_EVALUATE_RESPONSE_BAD_STATUS = {
  run_id: "20260607-eval-001",
  status: "MAYBE", // Must be "PASS" or "FAIL"
  accuracy: 0.942,
  f1_score: 0.931
};


// ============================================================================
// TEST RUNNER
// ============================================================================

function printTestHeader(title: string) {
  console.log("\n" + "=".repeat(70));
  console.log(`TEST: ${title}`);
  console.log("=".repeat(70));
}

function printResult(passed: boolean, message: string = "") {
  const status = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`${status}: ${message}`);
}

function testValidRequest(
  validatorFunc: (req: any) => [boolean, ValidationError[]],
  sample: any,
  name: string
): boolean {
  const [isValid, errors] = validatorFunc(sample);

  if (isValid) {
    printResult(true, `${name} accepted (expected)`);
    return true;
  } else {
    printResult(false, `${name} rejected (unexpected)`);
    errors.forEach((error) => {
      console.log(`  - ${error.field}: ${error.message}`);
    });
    return false;
  }
}

function testInvalidRequest(
  validatorFunc: (req: any) => [boolean, ValidationError[]],
  sample: any,
  name: string,
  expectedErrorField?: string
): boolean {
  const [isValid, errors] = validatorFunc(sample);

  if (!isValid) {
    printResult(true, `${name} rejected (expected)`);
    if (expectedErrorField) {
      const found = errors.some((e) => e.field === expectedErrorField);
      if (found) {
        console.log(`  ✓ Expected error in '${expectedErrorField}' found`);
      } else {
        console.log(`  ⚠ Expected error in '${expectedErrorField}' NOT found`);
      }
    }
    return true;
  } else {
    printResult(false, `${name} accepted (unexpected)`);
    return false;
  }
}


// ============================================================================
// RUN TESTS
// ============================================================================

function runAllTests(): boolean {
  interface TestResults {
    passed: number;
    failed: number;
    total: number;
  }

  const results: TestResults = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // ========================================================================
  // DATASET REQUEST TESTS
  // ========================================================================

  printTestHeader("DATASET REQUEST - VALID SAMPLES");

  results.total++;
  if (
    testValidRequest(
      RequestValidator.validateDatasetRequest,
      VALID_DATASET_REQUEST,
      "Full valid request"
    )
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  results.total++;
  if (
    testValidRequest(
      RequestValidator.validateDatasetRequest,
      VALID_DATASET_REQUEST_MINIMAL,
      "Minimal valid request"
    )
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  printTestHeader("DATASET REQUEST - INVALID SAMPLES");

  results.total++;
  if (
    testInvalidRequest(
      RequestValidator.validateDatasetRequest,
      INVALID_DATASET_REQUEST_MISSING_REQUIRED,
      "Missing required field",
      "dataset_path"
    )
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  results.total++;
  if (
    testInvalidRequest(
      RequestValidator.validateDatasetRequest,
      INVALID_DATASET_REQUEST_BAD_PATH,
      "Invalid GCS path",
      "dataset_path"
    )
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  results.total++;
  if (
    testInvalidRequest(
      RequestValidator.validateDatasetRequest,
      INVALID_DATASET_REQUEST_BAD_VALIDATION_LEVEL,
      "Invalid validation_level",
      "validation_level"
    )
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  results.total++;
  if (
    testInvalidRequest(
      RequestValidator.validateDatasetRequest,
      INVALID_DATASET_REQUEST_BAD_TIMEOUT,
      "Invalid timeout",
      "timeout_seconds"
    )
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  // ========================================================================
  // DATASET RESPONSE TESTS
  // ========================================================================

  printTestHeader("DATASET RESPONSE - VALID SAMPLES");

  results.total++;
  if (
    testValidRequest(
      ResponseValidator.validateDatasetResponse,
      VALID_DATASET_RESPONSE,
      "Full valid response"
    )
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  printTestHeader("DATASET RESPONSE - INVALID SAMPLES");

  results.total++;
  if (
    testInvalidRequest(
      ResponseValidator.validateDatasetResponse,
      INVALID_DATASET_RESPONSE_MISSING_REQUIRED,
      "Missing required fields",
      "status"
    )
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  results.total++;
  if (
    testInvalidRequest(
      ResponseValidator.validateDatasetResponse,
      INVALID_DATASET_RESPONSE_BAD_STATUS,
      "Invalid status enum",
      "status"
    )
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  results.total++;
  if (
    testInvalidRequest(
      ResponseValidator.validateDatasetResponse,
      INVALID_DATASET_RESPONSE_BAD_STATS,
      "Invalid dataset_stats",
      "dataset_stats.valid_rows"
    )
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  // ========================================================================
  // EVALUATE REQUEST TESTS
  // ========================================================================

  printTestHeader("EVALUATE REQUEST - VALID SAMPLES");

  results.total++;
  if (
    testValidRequest(
      RequestValidator.validateEvaluateRequest,
      VALID_EVALUATE_REQUEST,
      "Full valid request"
    )
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  results.total++;
  if (
    testValidRequest(
      RequestValidator.validateEvaluateRequest,
      VALID_EVALUATE_REQUEST_MINIMAL,
      "Minimal valid request"
    )
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  printTestHeader("EVALUATE REQUEST - INVALID SAMPLES");

  results.total++;
  if (
    testInvalidRequest(
      RequestValidator.validateEvaluateRequest,
      INVALID_EVALUATE_REQUEST_MISSING_REQUIRED,
      "Missing required field",
      "model_path"
    )
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  results.total++;
  if (
    testInvalidRequest(
      RequestValidator.validateEvaluateRequest,
      INVALID_EVALUATE_REQUEST_BAD_PATH,
      "Invalid model path",
      "model_path"
    )
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  // ========================================================================
  // EVALUATE RESPONSE TESTS
  // ========================================================================

  printTestHeader("EVALUATE RESPONSE - VALID SAMPLES");

  results.total++;
  if (
    testValidRequest(
      ResponseValidator.validateEvaluateResponse,
      VALID_EVALUATE_RESPONSE,
      "Full valid response (PASS)"
    )
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  results.total++;
  if (
    testValidRequest(
      ResponseValidator.validateEvaluateResponse,
      VALID_EVALUATE_RESPONSE_MINIMAL,
      "Minimal valid response (FAIL)"
    )
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  printTestHeader("EVALUATE RESPONSE - INVALID SAMPLES");

  results.total++;
  if (
    testInvalidRequest(
      ResponseValidator.validateEvaluateResponse,
      INVALID_EVALUATE_RESPONSE_MISSING_REQUIRED,
      "Missing required fields",
      "status"
    )
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  results.total++;
  if (
    testInvalidRequest(
      ResponseValidator.validateEvaluateResponse,
      INVALID_EVALUATE_RESPONSE_BAD_ACCURACY,
      "Invalid accuracy range",
      "accuracy"
    )
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  results.total++;
  if (
    testInvalidRequest(
      ResponseValidator.validateEvaluateResponse,
      INVALID_EVALUATE_RESPONSE_BAD_STATUS,
      "Invalid status enum",
      "status"
    )
  ) {
    results.passed++;
  } else {
    results.failed++;
  }

  // ========================================================================
  // SUMMARY
  // ========================================================================

  printTestHeader("TEST SUMMARY");
  console.log(`\n✅ Passed: ${results.passed}/${results.total}`);
  console.log(`❌ Failed: ${results.failed}/${results.total}`);
  console.log(`\nOverall: ${results.failed === 0 ? "✅ ALL PASS" : "❌ SOME FAILED"}`);

  return results.failed === 0;
}

// Run tests
const success = runAllTests();
process.exit(success ? 0 : 1);

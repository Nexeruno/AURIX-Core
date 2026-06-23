"""
Contract Sanity Check: Mock Request/Response Validation Tests

Tests that the validation layer correctly accepts valid samples
and rejects invalid samples against the ML Runtime API contracts.
"""

from validation import RequestValidator, ResponseValidator, ValidationError
from typing import Tuple, List


# ============================================================================
# MOCK VALID SAMPLES
# ============================================================================

VALID_DATASET_REQUEST = {
    "dataset_path": "gs://evidence-bucket/exports/dataset-20260607.json",
    "run_id": "20260607-val-001",
    "validation_level": "full",
    "format": "json"
}

VALID_DATASET_REQUEST_MINIMAL = {
    "dataset_path": "gs://evidence-bucket/exports/dataset-20260607.json"
    # Optional fields omitted - should still pass
}

VALID_DATASET_RESPONSE = {
    "run_id": "20260607-val-001",
    "status": "PASS",
    "timestamp": "2026-06-07T14:32:15Z",
    "dataset_stats": {
        "total_rows": 8247,
        "valid_rows": 8211,
        "invalid_rows": 36,
        "valid_percentage": 99.56,
        "unique_users": 1847,
        "date_range": {
            "start": "2024-01-01",
            "end": "2026-06-07"
        }
    },
    "schema_validation": {
        "feature_count": 12,
        "all_features_present": True,
        "extra_fields": 0
    },
    "quality_metrics": {
        "quality_score": 0.9956,
        "completeness_percent": 99.99,
        "validity_percent": 99.56
    },
    "quality_gates": {
        "all_gates_passed": True
    },
    "recommendations": [
        "Dataset is ready for training",
        "Consider removing 36 rows with predictedTotal ≤ 0"
    ]
}

VALID_EVALUATE_REQUEST = {
    "model_path": "gs://evidence-bucket/models/v3.3/model.pkl",
    "validation_data_path": "gs://evidence-bucket/data/validation-20260607.json",
    "run_id": "20260607-eval-001",
    "timeout_seconds": 30
}

VALID_EVALUATE_REQUEST_MINIMAL = {
    "model_path": "gs://evidence-bucket/models/v3.3/model.pkl"
    # Optional fields omitted, validation_data_path will use default
}

VALID_EVALUATE_RESPONSE = {
    "run_id": "20260607-eval-001",
    "status": "PASS",
    "accuracy": 0.942,
    "f1_score": 0.931,
    "timestamp": "2026-06-07T14:35:22Z"
}

VALID_EVALUATE_RESPONSE_MINIMAL = {
    "run_id": "20260607-eval-001",
    "status": "FAIL",
    "accuracy": 0.750,
    "f1_score": 0.720
    # timestamp is optional
}


# ============================================================================
# MOCK INVALID SAMPLES
# ============================================================================

INVALID_DATASET_REQUEST_MISSING_REQUIRED = {
    "run_id": "20260607-val-001",
    "validation_level": "full"
    # Missing: dataset_path (REQUIRED)
}

INVALID_DATASET_REQUEST_BAD_PATH = {
    "dataset_path": "/local/path/dataset.json",  # Not GCS path
    "run_id": "20260607-val-001"
}

INVALID_DATASET_REQUEST_BAD_VALIDATION_LEVEL = {
    "dataset_path": "gs://bucket/exports/dataset.json",
    "validation_level": "super"  # Must be "quick" or "full"
}

INVALID_DATASET_REQUEST_BAD_TIMEOUT = {
    "dataset_path": "gs://bucket/exports/dataset.json",
    "timeout_seconds": 5  # Must be 10-600
}

INVALID_DATASET_RESPONSE_MISSING_REQUIRED = {
    "run_id": "20260607-val-001",
    # Missing: status (REQUIRED)
    # Missing: dataset_stats (REQUIRED)
}

INVALID_DATASET_RESPONSE_BAD_STATUS = {
    "run_id": "20260607-val-001",
    "status": "UNKNOWN",  # Must be "PASS", "FAIL", or "WARNING"
    "dataset_stats": {
        "total_rows": 100,
        "valid_rows": 80,
        "unique_users": 10
    }
}

INVALID_DATASET_RESPONSE_BAD_STATS = {
    "run_id": "20260607-val-001",
    "status": "PASS",
    "dataset_stats": {
        "total_rows": 100
        # Missing: valid_rows, unique_users
    }
}

INVALID_EVALUATE_REQUEST_MISSING_REQUIRED = {
    "validation_data_path": "gs://bucket/data/val.json",
    "run_id": "20260607-eval-001"
    # Missing: model_path (REQUIRED)
}

INVALID_EVALUATE_REQUEST_BAD_PATH = {
    "model_path": "gs://bucket/model.xyz",  # Wrong extension (.pkl required)
    "validation_data_path": "gs://bucket/data/val.json"
}

INVALID_EVALUATE_RESPONSE_MISSING_REQUIRED = {
    "run_id": "20260607-eval-001",
    # Missing: status (REQUIRED)
    # Missing: accuracy (REQUIRED)
    # Missing: f1_score (REQUIRED)
}

INVALID_EVALUATE_RESPONSE_BAD_ACCURACY = {
    "run_id": "20260607-eval-001",
    "status": "PASS",
    "accuracy": 1.5,  # Must be 0-1
    "f1_score": 0.931
}

INVALID_EVALUATE_RESPONSE_BAD_STATUS = {
    "run_id": "20260607-eval-001",
    "status": "MAYBE",  # Must be "PASS" or "FAIL"
    "accuracy": 0.942,
    "f1_score": 0.931
}


# ============================================================================
# TEST RUNNER
# ============================================================================

def print_test_header(title: str):
    """Print test header."""
    print(f"\n{'='*70}")
    print(f"TEST: {title}")
    print('='*70)


def print_result(passed: bool, message: str = ""):
    """Print test result."""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {message}")


def test_valid_request(validator_func, sample: dict, name: str) -> bool:
    """Test that valid sample is accepted."""
    is_valid, errors = validator_func(sample)

    if is_valid:
        print_result(True, f"{name} accepted (expected)")
        return True
    else:
        print_result(False, f"{name} rejected (unexpected)")
        for error in errors:
            print(f"  - {error.field}: {error.message}")
        return False


def test_invalid_request(validator_func, sample: dict, name: str, expected_error_field: str = None) -> bool:
    """Test that invalid sample is rejected."""
    is_valid, errors = validator_func(sample)

    if not is_valid:
        print_result(True, f"{name} rejected (expected)")
        if expected_error_field:
            found = any(e.field == expected_error_field for e in errors)
            if found:
                print(f"  ✓ Expected error in '{expected_error_field}' found")
            else:
                print(f"  ⚠ Expected error in '{expected_error_field}' NOT found")
        return True
    else:
        print_result(False, f"{name} accepted (unexpected)")
        return False


# ============================================================================
# RUN TESTS
# ============================================================================

def run_all_tests():
    """Run all sanity check tests."""

    results = {
        "passed": 0,
        "failed": 0,
        "total": 0
    }

    # ========================================================================
    # DATASET REQUEST TESTS
    # ========================================================================

    print_test_header("DATASET REQUEST - VALID SAMPLES")

    results["total"] += 1
    if test_valid_request(RequestValidator.validate_dataset_request, VALID_DATASET_REQUEST, "Full valid request"):
        results["passed"] += 1
    else:
        results["failed"] += 1

    results["total"] += 1
    if test_valid_request(RequestValidator.validate_dataset_request, VALID_DATASET_REQUEST_MINIMAL, "Minimal valid request"):
        results["passed"] += 1
    else:
        results["failed"] += 1

    print_test_header("DATASET REQUEST - INVALID SAMPLES")

    results["total"] += 1
    if test_invalid_request(RequestValidator.validate_dataset_request, INVALID_DATASET_REQUEST_MISSING_REQUIRED, "Missing required field", "dataset_path"):
        results["passed"] += 1
    else:
        results["failed"] += 1

    results["total"] += 1
    if test_invalid_request(RequestValidator.validate_dataset_request, INVALID_DATASET_REQUEST_BAD_PATH, "Invalid GCS path", "dataset_path"):
        results["passed"] += 1
    else:
        results["failed"] += 1

    results["total"] += 1
    if test_invalid_request(RequestValidator.validate_dataset_request, INVALID_DATASET_REQUEST_BAD_VALIDATION_LEVEL, "Invalid validation_level", "validation_level"):
        results["passed"] += 1
    else:
        results["failed"] += 1

    results["total"] += 1
    if test_invalid_request(RequestValidator.validate_dataset_request, INVALID_DATASET_REQUEST_BAD_TIMEOUT, "Invalid timeout", "timeout_seconds"):
        results["passed"] += 1
    else:
        results["failed"] += 1

    # ========================================================================
    # DATASET RESPONSE TESTS
    # ========================================================================

    print_test_header("DATASET RESPONSE - VALID SAMPLES")

    results["total"] += 1
    if test_valid_request(ResponseValidator.validate_dataset_response, VALID_DATASET_RESPONSE, "Full valid response"):
        results["passed"] += 1
    else:
        results["failed"] += 1

    print_test_header("DATASET RESPONSE - INVALID SAMPLES")

    results["total"] += 1
    if test_invalid_request(ResponseValidator.validate_dataset_response, INVALID_DATASET_RESPONSE_MISSING_REQUIRED, "Missing required fields", "status"):
        results["passed"] += 1
    else:
        results["failed"] += 1

    results["total"] += 1
    if test_invalid_request(ResponseValidator.validate_dataset_response, INVALID_DATASET_RESPONSE_BAD_STATUS, "Invalid status enum", "status"):
        results["passed"] += 1
    else:
        results["failed"] += 1

    results["total"] += 1
    if test_invalid_request(ResponseValidator.validate_dataset_response, INVALID_DATASET_RESPONSE_BAD_STATS, "Invalid dataset_stats", "dataset_stats.valid_rows"):
        results["passed"] += 1
    else:
        results["failed"] += 1

    # ========================================================================
    # EVALUATE REQUEST TESTS
    # ========================================================================

    print_test_header("EVALUATE REQUEST - VALID SAMPLES")

    results["total"] += 1
    if test_valid_request(RequestValidator.validate_evaluate_request, VALID_EVALUATE_REQUEST, "Full valid request"):
        results["passed"] += 1
    else:
        results["failed"] += 1

    results["total"] += 1
    if test_valid_request(RequestValidator.validate_evaluate_request, VALID_EVALUATE_REQUEST_MINIMAL, "Minimal valid request"):
        results["passed"] += 1
    else:
        results["failed"] += 1

    print_test_header("EVALUATE REQUEST - INVALID SAMPLES")

    results["total"] += 1
    if test_invalid_request(RequestValidator.validate_evaluate_request, INVALID_EVALUATE_REQUEST_MISSING_REQUIRED, "Missing required field", "model_path"):
        results["passed"] += 1
    else:
        results["failed"] += 1

    results["total"] += 1
    if test_invalid_request(RequestValidator.validate_evaluate_request, INVALID_EVALUATE_REQUEST_BAD_PATH, "Invalid model path", "model_path"):
        results["passed"] += 1
    else:
        results["failed"] += 1

    # ========================================================================
    # EVALUATE RESPONSE TESTS
    # ========================================================================

    print_test_header("EVALUATE RESPONSE - VALID SAMPLES")

    results["total"] += 1
    if test_valid_request(ResponseValidator.validate_evaluate_response, VALID_EVALUATE_RESPONSE, "Full valid response (PASS)"):
        results["passed"] += 1
    else:
        results["failed"] += 1

    results["total"] += 1
    if test_valid_request(ResponseValidator.validate_evaluate_response, VALID_EVALUATE_RESPONSE_MINIMAL, "Minimal valid response (FAIL)"):
        results["passed"] += 1
    else:
        results["failed"] += 1

    print_test_header("EVALUATE RESPONSE - INVALID SAMPLES")

    results["total"] += 1
    if test_invalid_request(ResponseValidator.validate_evaluate_response, INVALID_EVALUATE_RESPONSE_MISSING_REQUIRED, "Missing required fields", "status"):
        results["passed"] += 1
    else:
        results["failed"] += 1

    results["total"] += 1
    if test_invalid_request(ResponseValidator.validate_evaluate_response, INVALID_EVALUATE_RESPONSE_BAD_ACCURACY, "Invalid accuracy range", "accuracy"):
        results["passed"] += 1
    else:
        results["failed"] += 1

    results["total"] += 1
    if test_invalid_request(ResponseValidator.validate_evaluate_response, INVALID_EVALUATE_RESPONSE_BAD_STATUS, "Invalid status enum", "status"):
        results["passed"] += 1
    else:
        results["failed"] += 1

    # ========================================================================
    # SUMMARY
    # ========================================================================

    print_test_header("TEST SUMMARY")
    print(f"\n✅ Passed: {results['passed']}/{results['total']}")
    print(f"❌ Failed: {results['failed']}/{results['total']}")
    print(f"\nOverall: {'✅ ALL PASS' if results['failed'] == 0 else '❌ SOME FAILED'}")

    return results["failed"] == 0


if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)

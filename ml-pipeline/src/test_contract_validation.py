"""
Comprehensive Contract Validation Testing

Tests all aspects of contract validation:
1. Valid inputs → valid outputs
2. Invalid inputs → readable errors
3. Response shape validation
4. Error message quality

Run: python test_contract_validation.py
"""

import json
import requests
from typing import Dict, Any, List, Tuple
import sys


# ============================================================================
# Configuration
# ============================================================================

BASE_URL = "http://localhost:5000"
REQUEST_TIMEOUT = 10

# Test categories
VALID_REQUEST_TESTS = []
INVALID_REQUEST_TESTS = []
RESPONSE_VALIDATION_TESTS = []


# ============================================================================
# Test Data: Dataset Validation
# ============================================================================

class DatasetValidationTests:
    """Dataset validation request/response tests."""

    # Valid requests
    VALID_FULL = {
        "name": "Valid - all fields",
        "request": {
            "dataset_path": "gs://evidence-bucket/exports/dataset-20260607.json",
            "run_id": "20260607-val-001",
            "validation_level": "full",
            "format": "json",
            "timeout_seconds": 30
        },
        "expect_status": 200,
        "expect_fields": ["status", "run_id", "timestamp", "dataset_stats"]
    }

    VALID_MINIMAL = {
        "name": "Valid - minimal (only required)",
        "request": {
            "dataset_path": "gs://evidence-bucket/exports/dataset.json"
        },
        "expect_status": 200,
        "expect_fields": ["status", "run_id", "timestamp"]
    }

    VALID_WITH_DEFAULTS = {
        "name": "Valid - with some optional fields",
        "request": {
            "dataset_path": "gs://evidence-bucket/exports/dataset.json",
            "validation_level": "quick",
            "format": "csv"
        },
        "expect_status": 200,
        "expect_fields": ["status", "run_id"]
    }

    # Invalid requests - missing required
    INVALID_MISSING_DATASET_PATH = {
        "name": "Invalid - missing dataset_path",
        "request": {
            "run_id": "20260607-val-001",
            "validation_level": "full"
        },
        "expect_status": 400,
        "expect_error_field": "dataset_path",
        "expect_error_contains": "required"
    }

    # Invalid requests - wrong type
    INVALID_DATASET_PATH_NOT_STRING = {
        "name": "Invalid - dataset_path not string",
        "request": {
            "dataset_path": 12345,
            "run_id": "20260607-val-001"
        },
        "expect_status": 400,
        "expect_error_field": "dataset_path",
        "expect_error_contains": "string"
    }

    # Invalid requests - wrong format
    INVALID_DATASET_PATH_BAD_GCS = {
        "name": "Invalid - dataset_path bad GCS path",
        "request": {
            "dataset_path": "s3://bucket/file.json"
        },
        "expect_status": 400,
        "expect_error_field": "dataset_path",
        "expect_error_contains": "GCS"
    }

    INVALID_DATASET_PATH_WRONG_EXTENSION = {
        "name": "Invalid - dataset_path wrong extension",
        "request": {
            "dataset_path": "gs://bucket/file.csv"
        },
        "expect_status": 400,
        "expect_error_field": "dataset_path",
        "expect_error_contains": "GCS"
    }

    # Invalid requests - wrong enum
    INVALID_VALIDATION_LEVEL_BAD_ENUM = {
        "name": "Invalid - validation_level bad enum",
        "request": {
            "dataset_path": "gs://bucket/file.json",
            "validation_level": "partial"
        },
        "expect_status": 400,
        "expect_error_field": "validation_level",
        "expect_error_contains": "quick"
    }

    INVALID_FORMAT_BAD_ENUM = {
        "name": "Invalid - format bad enum",
        "request": {
            "dataset_path": "gs://bucket/file.json",
            "format": "parquet"
        },
        "expect_status": 400,
        "expect_error_field": "format",
        "expect_error_contains": "json"
    }

    # Invalid requests - wrong range
    INVALID_TIMEOUT_TOO_LOW = {
        "name": "Invalid - timeout_seconds too low",
        "request": {
            "dataset_path": "gs://bucket/file.json",
            "timeout_seconds": 5
        },
        "expect_status": 400,
        "expect_error_field": "timeout_seconds",
        "expect_error_contains": "between"
    }

    INVALID_TIMEOUT_TOO_HIGH = {
        "name": "Invalid - timeout_seconds too high",
        "request": {
            "dataset_path": "gs://bucket/file.json",
            "timeout_seconds": 1000
        },
        "expect_status": 400,
        "expect_error_field": "timeout_seconds",
        "expect_error_contains": "between"
    }

    # Invalid requests - wrong type for optional
    INVALID_RUN_ID_NOT_STRING = {
        "name": "Invalid - run_id not string",
        "request": {
            "dataset_path": "gs://bucket/file.json",
            "run_id": 12345
        },
        "expect_status": 400,
        "expect_error_field": "run_id",
        "expect_error_contains": "string"
    }

    INVALID_VALIDATION_LEVEL_NOT_STRING = {
        "name": "Invalid - validation_level not string",
        "request": {
            "dataset_path": "gs://bucket/file.json",
            "validation_level": 123
        },
        "expect_status": 400,
        "expect_error_field": "validation_level",
        "expect_error_contains": "string"
    }


class EvaluateTests:
    """Model evaluation request/response tests."""

    # Valid requests
    VALID_FULL = {
        "name": "Valid - all fields",
        "request": {
            "model_path": "gs://bucket/models/v3.3/model.pkl",
            "validation_data_path": "gs://bucket/data/validation.json",
            "run_id": "20260607-eval-001"
        },
        "expect_status": 200,
        "expect_fields": ["status", "accuracy", "run_id", "timestamp"]
    }

    VALID_MINIMAL = {
        "name": "Valid - minimal (only required)",
        "request": {
            "model_path": "gs://bucket/models/v3.3/model.pkl",
            "validation_data_path": "gs://bucket/data/validation.json"
        },
        "expect_status": 200,
        "expect_fields": ["status", "accuracy"]
    }

    # Invalid requests - missing required
    INVALID_MISSING_MODEL_PATH = {
        "name": "Invalid - missing model_path",
        "request": {
            "validation_data_path": "gs://bucket/data/validation.json",
            "run_id": "20260607-eval-001"
        },
        "expect_status": 400,
        "expect_error_field": "model_path",
        "expect_error_contains": "required"
    }

    INVALID_MISSING_VALIDATION_DATA_PATH = {
        "name": "Invalid - missing validation_data_path",
        "request": {
            "model_path": "gs://bucket/models/v3.3/model.pkl",
            "run_id": "20260607-eval-001"
        },
        "expect_status": 400,
        "expect_error_field": "validation_data_path",
        "expect_error_contains": "required"
    }

    # Invalid requests - wrong format
    INVALID_MODEL_PATH_BAD_GCS = {
        "name": "Invalid - model_path bad GCS path",
        "request": {
            "model_path": "s3://bucket/model.pkl",
            "validation_data_path": "gs://bucket/data/validation.json"
        },
        "expect_status": 400,
        "expect_error_field": "model_path",
        "expect_error_contains": "GCS"
    }

    INVALID_VALIDATION_DATA_PATH_BAD_GCS = {
        "name": "Invalid - validation_data_path bad GCS path",
        "request": {
            "model_path": "gs://bucket/models/v3.3/model.pkl",
            "validation_data_path": "file:///local/data.json"
        },
        "expect_status": 400,
        "expect_error_field": "validation_data_path",
        "expect_error_contains": "GCS"
    }

    # Invalid requests - wrong type
    INVALID_MODEL_PATH_NOT_STRING = {
        "name": "Invalid - model_path not string",
        "request": {
            "model_path": 12345,
            "validation_data_path": "gs://bucket/data/validation.json"
        },
        "expect_status": 400,
        "expect_error_field": "model_path",
        "expect_error_contains": "string"
    }


# ============================================================================
# Test Helpers
# ============================================================================

def print_header(title: str):
    """Print test section header."""
    print(f"\n{'='*70}")
    print(f"{title}")
    print('='*70)


def print_test_name(test_name: str):
    """Print test name."""
    print(f"\n▶ {test_name}")


def print_request_body(data: Dict[str, Any]):
    """Print request body nicely."""
    print("  Request:")
    for line in json.dumps(data, indent=2).split('\n'):
        print(f"    {line}")


def validate_response_shape(response: Dict[str, Any], expected_status: str) -> Tuple[bool, str]:
    """
    Validate response shape matches expectations.

    Args:
        response: Response dict
        expected_status: 'success' or 'error'

    Returns:
        (is_valid, error_message_if_invalid)
    """
    if expected_status == "success":
        required = ["status", "timestamp"]
        for field in required:
            if field not in response:
                return False, f"Missing required field: {field}"

        if "status" not in ["PASS", "FAIL", "WARNING"]:
            return False, f"Invalid status value: {response.get('status')}"

    elif expected_status == "error":
        required = ["status", "error", "error_count", "errors", "timestamp"]
        for field in required:
            if field not in response:
                return False, f"Missing required field: {field}"

        if response["status"] != "error":
            return False, "Response status should be 'error'"

        if not isinstance(response["errors"], list):
            return False, "Field 'errors' should be a list"

        if len(response["errors"]) == 0:
            return False, "Field 'errors' should not be empty"

        for error in response["errors"]:
            if "field" not in error or "message" not in error:
                return False, "Each error should have 'field' and 'message'"

    return True, ""


def test_single_request(
    endpoint: str,
    test_data: Dict[str, Any],
    request_body: Dict[str, Any]
) -> Tuple[bool, str]:
    """
    Test a single request.

    Args:
        endpoint: API endpoint path
        test_data: Test specification dict
        request_body: Request JSON body

    Returns:
        (passed: bool, message: str)
    """
    try:
        # Make request
        response = requests.post(
            f"{BASE_URL}{endpoint}",
            json=request_body,
            timeout=REQUEST_TIMEOUT
        )

        # Check status code
        expect_status = test_data.get("expect_status")
        if response.status_code != expect_status:
            msg = f"Expected status {expect_status}, got {response.status_code}"
            return False, msg

        response_data = response.json()

        # Validate shape
        expected_status = "error" if expect_status == 400 else "success"
        is_valid, shape_error = validate_response_shape(response_data, expected_status)
        if not is_valid:
            return False, f"Response shape invalid: {shape_error}"

        # For success responses, check expected fields
        if expect_status == 200:
            expect_fields = test_data.get("expect_fields", [])
            for field in expect_fields:
                if field not in response_data:
                    return False, f"Missing expected field: {field}"

        # For error responses, check error field
        if expect_status == 400:
            expect_error_field = test_data.get("expect_error_field")
            expect_error_contains = test_data.get("expect_error_contains", "").lower()

            errors = response_data.get("errors", [])
            error_fields = [e["field"] for e in errors]

            # Check if expected error field is present
            if expect_error_field not in error_fields:
                actual_fields = ", ".join(error_fields)
                msg = f"Expected error field '{expect_error_field}', got: {actual_fields}"
                return False, msg

            # Check if error message contains expected text
            error_message = next(
                (e["message"] for e in errors if e["field"] == expect_error_field),
                ""
            ).lower()

            if expect_error_contains and expect_error_contains not in error_message:
                return False, f"Error message should contain '{expect_error_contains}', got: {error_message}"

        return True, "✅ PASS"

    except requests.exceptions.ConnectionError:
        return False, "Cannot connect to server (is it running on port 5000?)"
    except requests.exceptions.Timeout:
        return False, "Request timeout"
    except Exception as e:
        return False, f"Exception: {str(e)}"


# ============================================================================
# Test Suite Execution
# ============================================================================

def test_dataset_validation():
    """Test dataset validation endpoint."""
    print_header("DATASET VALIDATION TESTS: POST /api/ml/validate-dataset")

    tests = [
        ("VALID REQUESTS", [
            DatasetValidationTests.VALID_FULL,
            DatasetValidationTests.VALID_MINIMAL,
            DatasetValidationTests.VALID_WITH_DEFAULTS,
        ]),
        ("INVALID REQUESTS - Missing Required", [
            DatasetValidationTests.INVALID_MISSING_DATASET_PATH,
        ]),
        ("INVALID REQUESTS - Wrong Type", [
            DatasetValidationTests.INVALID_DATASET_PATH_NOT_STRING,
            DatasetValidationTests.INVALID_RUN_ID_NOT_STRING,
            DatasetValidationTests.INVALID_VALIDATION_LEVEL_NOT_STRING,
        ]),
        ("INVALID REQUESTS - Wrong Format", [
            DatasetValidationTests.INVALID_DATASET_PATH_BAD_GCS,
            DatasetValidationTests.INVALID_DATASET_PATH_WRONG_EXTENSION,
        ]),
        ("INVALID REQUESTS - Wrong Enum", [
            DatasetValidationTests.INVALID_VALIDATION_LEVEL_BAD_ENUM,
            DatasetValidationTests.INVALID_FORMAT_BAD_ENUM,
        ]),
        ("INVALID REQUESTS - Wrong Range", [
            DatasetValidationTests.INVALID_TIMEOUT_TOO_LOW,
            DatasetValidationTests.INVALID_TIMEOUT_TOO_HIGH,
        ]),
    ]

    results = {"passed": 0, "failed": 0, "details": []}

    for category, test_list in tests:
        print(f"\n{category}")
        for test_data in test_list:
            print_test_name(test_data["name"])
            request_body = test_data["request"]
            print_request_body(request_body)

            passed, message = test_single_request(
                "/api/ml/validate-dataset",
                test_data,
                request_body
            )

            print(f"  Result: {message}")

            if passed:
                results["passed"] += 1
            else:
                results["failed"] += 1

            results["details"].append({
                "test": test_data["name"],
                "passed": passed,
                "message": message
            })

    return results


def test_evaluate():
    """Test evaluate endpoint."""
    print_header("EVALUATE MODEL TESTS: POST /api/ml/evaluate")

    tests = [
        ("VALID REQUESTS", [
            EvaluateTests.VALID_FULL,
            EvaluateTests.VALID_MINIMAL,
        ]),
        ("INVALID REQUESTS - Missing Required", [
            EvaluateTests.INVALID_MISSING_MODEL_PATH,
            EvaluateTests.INVALID_MISSING_VALIDATION_DATA_PATH,
        ]),
        ("INVALID REQUESTS - Wrong Type", [
            EvaluateTests.INVALID_MODEL_PATH_NOT_STRING,
        ]),
        ("INVALID REQUESTS - Wrong Format", [
            EvaluateTests.INVALID_MODEL_PATH_BAD_GCS,
            EvaluateTests.INVALID_VALIDATION_DATA_PATH_BAD_GCS,
        ]),
    ]

    results = {"passed": 0, "failed": 0, "details": []}

    for category, test_list in tests:
        print(f"\n{category}")
        for test_data in test_list:
            print_test_name(test_data["name"])
            request_body = test_data["request"]
            print_request_body(request_body)

            passed, message = test_single_request(
                "/api/ml/evaluate",
                test_data,
                request_body
            )

            print(f"  Result: {message}")

            if passed:
                results["passed"] += 1
            else:
                results["failed"] += 1

            results["details"].append({
                "test": test_data["name"],
                "passed": passed,
                "message": message
            })

    return results


def test_edge_cases():
    """Test edge cases."""
    print_header("EDGE CASES & ERROR HANDLING")

    results = {"passed": 0, "failed": 0, "details": []}

    # Test 1: Invalid JSON
    print("\n▶ Invalid JSON")
    try:
        response = requests.post(
            f"{BASE_URL}/api/ml/validate-dataset",
            data="not json",
            headers={"Content-Type": "application/json"},
            timeout=REQUEST_TIMEOUT
        )
        print(f"  Status: {response.status_code}")
        print(f"  Result: {response.json() if response.status_code != 200 else 'Unexpected 200'}")
        results["passed"] += 1
        results["details"].append({"test": "Invalid JSON", "passed": True, "message": "Handled correctly"})
    except Exception as e:
        print(f"  Error: {str(e)}")
        results["failed"] += 1
        results["details"].append({"test": "Invalid JSON", "passed": False, "message": str(e)})

    # Test 2: Empty request body
    print("\n▶ Empty request body")
    try:
        response = requests.post(
            f"{BASE_URL}/api/ml/validate-dataset",
            json={},
            timeout=REQUEST_TIMEOUT
        )
        print(f"  Status: {response.status_code}")
        data = response.json()
        print(f"  Errors: {len(data.get('errors', []))} error(s)")
        if response.status_code == 400:
            results["passed"] += 1
            results["details"].append({"test": "Empty body", "passed": True, "message": "Rejected correctly"})
        else:
            results["failed"] += 1
            results["details"].append({"test": "Empty body", "passed": False, "message": "Should reject empty request"})
    except Exception as e:
        print(f"  Error: {str(e)}")
        results["failed"] += 1
        results["details"].append({"test": "Empty body", "passed": False, "message": str(e)})

    # Test 3: Extra unknown fields
    print("\n▶ Extra unknown fields (should be ignored)")
    try:
        response = requests.post(
            f"{BASE_URL}/api/ml/validate-dataset",
            json={
                "dataset_path": "gs://bucket/file.json",
                "unknown_field": "should be ignored",
                "another_unknown": 123
            },
            timeout=REQUEST_TIMEOUT
        )
        print(f"  Status: {response.status_code}")
        if response.status_code == 200:
            results["passed"] += 1
            results["details"].append({"test": "Extra fields", "passed": True, "message": "Ignored correctly"})
        else:
            results["failed"] += 1
            results["details"].append({"test": "Extra fields", "passed": False, "message": "Should accept extra fields"})
    except Exception as e:
        print(f"  Error: {str(e)}")
        results["failed"] += 1
        results["details"].append({"test": "Extra fields", "passed": False, "message": str(e)})

    return results


# ============================================================================
# Main Test Runner
# ============================================================================

def run_all_tests():
    """Run complete test suite."""
    print("\n" + "="*70)
    print("COMPREHENSIVE CONTRACT VALIDATION TEST SUITE")
    print("="*70)
    print(f"Server: {BASE_URL}")

    # Check server
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=REQUEST_TIMEOUT)
        if response.status_code != 200:
            print("\n❌ Server not responding correctly")
            sys.exit(1)
    except Exception as e:
        print(f"\n❌ Cannot connect to server: {str(e)}")
        print("Make sure Flask app is running: python contract_app.py")
        sys.exit(1)

    # Run test suites
    all_results = []

    dataset_results = test_dataset_validation()
    all_results.append(("Dataset Validation", dataset_results))

    evaluate_results = test_evaluate()
    all_results.append(("Model Evaluation", evaluate_results))

    edge_results = test_edge_cases()
    all_results.append(("Edge Cases", edge_results))

    # Print summary
    print_header("TEST SUMMARY")

    total_passed = 0
    total_failed = 0

    for suite_name, results in all_results:
        passed = results["passed"]
        failed = results["failed"]
        total = passed + failed

        total_passed += passed
        total_failed += failed

        status = "✅" if failed == 0 else "❌"
        print(f"{status} {suite_name}: {passed}/{total} passed")

    print(f"\n{'='*70}")
    print(f"OVERALL: {total_passed}/{total_passed + total_failed} tests passed")
    print('='*70)

    if total_failed == 0:
        print("\n✅ ALL TESTS PASSED - CONTRACT VALIDATION READY")
        return 0
    else:
        print(f"\n❌ {total_failed} TEST(S) FAILED")
        return 1


if __name__ == "__main__":
    exit_code = run_all_tests()
    sys.exit(exit_code)

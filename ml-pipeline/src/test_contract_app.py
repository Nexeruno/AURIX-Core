"""
Test Contract App Endpoints

Tests the Flask contract app with mock requests.
Verifies that:
1. Valid requests are accepted and return valid responses
2. Invalid requests are rejected with proper error responses
3. Response shape matches contract schema

Run: python test_contract_app.py
"""

import json
import requests
from typing import Dict, Any, Tuple
import time


# ============================================================================
# Test Configuration
# ============================================================================

BASE_URL = "http://localhost:5000"

# Timeouts
REQUEST_TIMEOUT = 10


# ============================================================================
# Test Data
# ============================================================================

VALID_VALIDATE_DATASET_REQUEST = {
    "dataset_path": "gs://evidence-bucket/exports/dataset-20260607.json",
    "run_id": "20260607-val-001",
    "validation_level": "full",
    "format": "json"
}

INVALID_VALIDATE_DATASET_REQUEST = {
    "run_id": "20260607-val-001"
    # Missing: dataset_path
}

VALID_EVALUATE_REQUEST = {
    "model_path": "gs://evidence-bucket/models/v3.3/model.pkl",
    "validation_data_path": "gs://evidence-bucket/data/validation.json",
    "run_id": "20260607-eval-001"
}

INVALID_EVALUATE_REQUEST = {
    "validation_data_path": "gs://evidence-bucket/data/validation.json",
    "run_id": "20260607-eval-001"
    # Missing: model_path
}


# ============================================================================
# Test Helpers
# ============================================================================

def print_test_header(title: str):
    """Print test header."""
    print(f"\n{'='*70}")
    print(f"TEST: {title}")
    print('='*70)


def print_request(method: str, path: str, data: Dict[str, Any]):
    """Print request details."""
    print(f"\n{method} {path}")
    print("Request body:")
    print(json.dumps(data, indent=2))


def print_response(status_code: int, response_data: Dict[str, Any]):
    """Print response details."""
    print(f"\nResponse: {status_code}")
    print(json.dumps(response_data, indent=2))


def check_response_shape(response_data: Dict[str, Any], expected_status: str) -> bool:
    """
    Check if response has correct shape.

    Args:
        response_data: Response JSON
        expected_status: 'success' or 'error'

    Returns:
        True if shape is correct, False otherwise
    """
    if expected_status == "success":
        # Should have status, run_id, etc.
        if "status" not in response_data:
            print("❌ Missing 'status' field in response")
            return False
        if response_data["status"] not in ["PASS", "FAIL", "WARNING"]:
            print(f"❌ Invalid status value: {response_data['status']}")
            return False
        if "run_id" not in response_data:
            print("❌ Missing 'run_id' field in response")
            return False
        if "timestamp" not in response_data:
            print("❌ Missing 'timestamp' field in response")
            return False
        return True

    elif expected_status == "error":
        # Should have error info
        if "status" not in response_data or response_data["status"] != "error":
            print("❌ Response status should be 'error'")
            return False
        if "error" not in response_data:
            print("❌ Missing 'error' field in response")
            return False
        if "errors" not in response_data:
            print("❌ Missing 'errors' field in response")
            return False
        return True

    return False


# ============================================================================
# Test Functions
# ============================================================================

def test_health_check() -> bool:
    """Test health check endpoint."""
    print_test_header("Health Check")

    try:
        response = requests.get(f"{BASE_URL}/health", timeout=REQUEST_TIMEOUT)
        print_response(response.status_code, response.json())

        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "healthy":
                print("✅ PASS: Health check successful")
                return True
            else:
                print("❌ FAIL: Health check response invalid")
                return False
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False

    except Exception as e:
        print(f"❌ FAIL: {str(e)}")
        return False


def test_contract_info() -> bool:
    """Test contract info endpoint."""
    print_test_header("Contract Info")

    try:
        response = requests.get(f"{BASE_URL}/api/ml/contract-info", timeout=REQUEST_TIMEOUT)
        print_response(response.status_code, response.json())

        if response.status_code == 200:
            data = response.json()
            if "endpoints" in data and len(data["endpoints"]) == 2:
                print("✅ PASS: Contract info successful")
                return True
            else:
                print("❌ FAIL: Contract info response invalid")
                return False
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False

    except Exception as e:
        print(f"❌ FAIL: {str(e)}")
        return False


def test_validate_dataset_valid() -> bool:
    """Test POST /api/ml/validate-dataset with valid request."""
    print_test_header("POST /api/ml/validate-dataset - VALID REQUEST")

    try:
        print_request("POST", "/api/ml/validate-dataset", VALID_VALIDATE_DATASET_REQUEST)

        response = requests.post(
            f"{BASE_URL}/api/ml/validate-dataset",
            json=VALID_VALIDATE_DATASET_REQUEST,
            timeout=REQUEST_TIMEOUT
        )

        print_response(response.status_code, response.json())

        if response.status_code == 200:
            data = response.json()
            if check_response_shape(data, "success"):
                print("✅ PASS: Valid request accepted with valid response")
                return True
            else:
                print("❌ FAIL: Response shape is incorrect")
                return False
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False

    except Exception as e:
        print(f"❌ FAIL: {str(e)}")
        return False


def test_validate_dataset_invalid() -> bool:
    """Test POST /api/ml/validate-dataset with invalid request."""
    print_test_header("POST /api/ml/validate-dataset - INVALID REQUEST")

    try:
        print_request("POST", "/api/ml/validate-dataset", INVALID_VALIDATE_DATASET_REQUEST)

        response = requests.post(
            f"{BASE_URL}/api/ml/validate-dataset",
            json=INVALID_VALIDATE_DATASET_REQUEST,
            timeout=REQUEST_TIMEOUT
        )

        print_response(response.status_code, response.json())

        if response.status_code == 400:
            data = response.json()
            if check_response_shape(data, "error"):
                if any(e["field"] == "dataset_path" for e in data["errors"]):
                    print("✅ PASS: Invalid request rejected with correct error")
                    return True
                else:
                    print("❌ FAIL: Expected 'dataset_path' error not found")
                    return False
            else:
                print("❌ FAIL: Error response shape is incorrect")
                return False
        else:
            print(f"❌ FAIL: Expected 400, got {response.status_code}")
            return False

    except Exception as e:
        print(f"❌ FAIL: {str(e)}")
        return False


def test_evaluate_valid() -> bool:
    """Test POST /api/ml/evaluate with valid request."""
    print_test_header("POST /api/ml/evaluate - VALID REQUEST")

    try:
        print_request("POST", "/api/ml/evaluate", VALID_EVALUATE_REQUEST)

        response = requests.post(
            f"{BASE_URL}/api/ml/evaluate",
            json=VALID_EVALUATE_REQUEST,
            timeout=REQUEST_TIMEOUT
        )

        print_response(response.status_code, response.json())

        if response.status_code == 200:
            data = response.json()
            if check_response_shape(data, "success"):
                # Check for evaluate-specific fields
                if "accuracy" in data and isinstance(data["accuracy"], (int, float)):
                    print("✅ PASS: Valid request accepted with valid response")
                    return True
                else:
                    print("❌ FAIL: Missing or invalid 'accuracy' field")
                    return False
            else:
                print("❌ FAIL: Response shape is incorrect")
                return False
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False

    except Exception as e:
        print(f"❌ FAIL: {str(e)}")
        return False


def test_evaluate_invalid() -> bool:
    """Test POST /api/ml/evaluate with invalid request."""
    print_test_header("POST /api/ml/evaluate - INVALID REQUEST")

    try:
        print_request("POST", "/api/ml/evaluate", INVALID_EVALUATE_REQUEST)

        response = requests.post(
            f"{BASE_URL}/api/ml/evaluate",
            json=INVALID_EVALUATE_REQUEST,
            timeout=REQUEST_TIMEOUT
        )

        print_response(response.status_code, response.json())

        if response.status_code == 400:
            data = response.json()
            if check_response_shape(data, "error"):
                if any(e["field"] == "model_path" for e in data["errors"]):
                    print("✅ PASS: Invalid request rejected with correct error")
                    return True
                else:
                    print("❌ FAIL: Expected 'model_path' error not found")
                    return False
            else:
                print("❌ FAIL: Error response shape is incorrect")
                return False
        else:
            print(f"❌ FAIL: Expected 400, got {response.status_code}")
            return False

    except Exception as e:
        print(f"❌ FAIL: {str(e)}")
        return False


# ============================================================================
# Main Test Suite
# ============================================================================

def run_all_tests():
    """Run all tests."""
    print("\n" + "="*70)
    print("CONTRACT APP TEST SUITE")
    print("="*70)
    print(f"Base URL: {BASE_URL}")

    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=REQUEST_TIMEOUT)
        if response.status_code != 200:
            print("\n❌ Server is not responding correctly")
            return
    except Exception as e:
        print(f"\n❌ Cannot connect to server at {BASE_URL}")
        print(f"   Error: {str(e)}")
        print("\nMake sure the Flask app is running:")
        print("   cd ml-pipeline/src")
        print("   python contract_app.py")
        return

    # Run tests
    results = {
        "passed": 0,
        "failed": 0,
        "tests": []
    }

    tests = [
        ("Health Check", test_health_check),
        ("Contract Info", test_contract_info),
        ("Validate Dataset - Valid", test_validate_dataset_valid),
        ("Validate Dataset - Invalid", test_validate_dataset_invalid),
        ("Evaluate Model - Valid", test_evaluate_valid),
        ("Evaluate Model - Invalid", test_evaluate_invalid),
    ]

    for test_name, test_func in tests:
        try:
            passed = test_func()
            if passed:
                results["passed"] += 1
            else:
                results["failed"] += 1
            results["tests"].append((test_name, passed))
        except Exception as e:
            print(f"\n❌ Test crashed: {str(e)}")
            results["failed"] += 1
            results["tests"].append((test_name, False))

    # Print summary
    print("\n\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)

    for test_name, passed in results["tests"]:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")

    print(f"\n{'='*70}")
    print(f"Total: {results['passed']}/{len(tests)} passed")
    print(f"{'='*70}")

    if results["failed"] == 0:
        print("\n✅ ALL TESTS PASSED")
    else:
        print(f"\n❌ {results['failed']} TEST(S) FAILED")


if __name__ == "__main__":
    run_all_tests()

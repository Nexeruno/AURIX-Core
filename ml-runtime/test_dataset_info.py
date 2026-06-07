"""
FÁZE 5.2B: Test dataset-info endpoint
Tests feature validation, target detection, and training readiness
"""

import requests
import json
from datetime import datetime, timedelta

BASE_URL = 'http://127.0.0.1:5000'

def test_dataset_info_valid_data():
    """Test dataset-info with valid real dataset"""
    print("\n=== Test 1: Valid Dataset with Real Data ===")

    # Generate realistic transaction data (6 months)
    transactions = []
    base_date = datetime(2026, 1, 1)

    for month in range(6):
        current_month = base_date + timedelta(days=30 * month)
        month_str = current_month.strftime('%Y-%m')

        # 5-10 transactions per month
        for i in range(7):
            transactions.append({
                'category': ['food', 'transport', 'utilities', 'entertainment'][i % 4],
                'amount': 50 + (i * 15),
                'date': f"{month_str}-{(i % 28) + 1:02d}"
            })

    request_data = {
        'uid': 'user-test-1',
        'pipelineLevel': 'L1',
        'modelVersion': '1.0',
        'transactions': transactions,
        'income': 5000.0,
        'debugMode': False,
    }

    response = requests.post(f'{BASE_URL}/dataset-info', json=request_data)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(json.dumps(result, indent=2))

    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    assert result['status'] == 'success', f"Expected success status"
    assert result['features']['validation'] == 'passed', "Features should validate"
    assert result['targets']['monthlyTargets'] == True, "Should detect monthly targets"
    assert result['targets']['monthsAvailable'] == 6, "Should detect 6 months"
    assert result['readyForTraining'] == True, "Should be ready for training"

    print("✅ Test passed: Valid dataset accepted and analyzed correctly")


def test_dataset_info_missing_feature():
    """Test dataset-info with missing feature"""
    print("\n=== Test 2: Missing Feature (category) ===")

    transactions = [
        {
            'amount': 50.0,
            'date': '2026-01-01'
            # Missing 'category'
        }
    ]

    request_data = {
        'uid': 'user-test-2',
        'pipelineLevel': 'L1',
        'modelVersion': '1.0',
        'transactions': transactions,
        'income': 5000.0,
    }

    response = requests.post(f'{BASE_URL}/dataset-info', json=request_data)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(json.dumps(result, indent=2))

    assert response.status_code == 400, f"Expected 400 for missing feature"
    assert result['status'] == 'failed', "Should fail validation"
    assert 'category' in result['error'], "Error should mention missing category"

    print("✅ Test passed: Missing feature detected and rejected")


def test_dataset_info_invalid_amount():
    """Test dataset-info with invalid amount"""
    print("\n=== Test 3: Invalid Amount (negative) ===")

    transactions = [
        {
            'category': 'food',
            'amount': -50.0,  # Negative!
            'date': '2026-01-01'
        }
    ]

    request_data = {
        'uid': 'user-test-3',
        'pipelineLevel': 'L1',
        'modelVersion': '1.0',
        'transactions': transactions,
    }

    response = requests.post(f'{BASE_URL}/dataset-info', json=request_data)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(json.dumps(result, indent=2))

    assert response.status_code == 400, f"Expected 400 for invalid amount"
    assert result['status'] == 'failed', "Should fail validation"
    assert 'negative' in result['error'].lower(), "Error should mention negative amount"

    print("✅ Test passed: Invalid amount detected and rejected")


def test_dataset_info_empty_dataset():
    """Test dataset-info with empty transactions"""
    print("\n=== Test 4: Empty Dataset ===")

    request_data = {
        'uid': 'user-test-4',
        'pipelineLevel': 'L1',
        'modelVersion': '1.0',
        'transactions': [],
        'income': 5000.0,
    }

    response = requests.post(f'{BASE_URL}/dataset-info', json=request_data)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(json.dumps(result, indent=2))

    # Empty dataset should still respond, but not be ready for training
    assert response.status_code == 400, "Empty dataset should fail target validation"
    assert result['status'] == 'failed', "Should fail on empty dataset"

    print("✅ Test passed: Empty dataset properly rejected")


def test_dataset_info_limited_data():
    """Test dataset-info with limited data (not ready for training yet)"""
    print("\n=== Test 5: Limited Data (Only 1 Month) ===")

    transactions = [
        {'category': 'food', 'amount': 50.0, 'date': '2026-01-01'},
        {'category': 'transport', 'amount': 30.0, 'date': '2026-01-05'},
        {'category': 'food', 'amount': 45.0, 'date': '2026-01-10'},
    ]

    request_data = {
        'uid': 'user-test-5',
        'pipelineLevel': 'L1',
        'modelVersion': '1.0',
        'transactions': transactions,
        'income': 5000.0,
    }

    response = requests.post(f'{BASE_URL}/dataset-info', json=request_data)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(json.dumps(result, indent=2))

    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    assert result['status'] == 'success', "Should succeed"
    assert result['targets']['monthsAvailable'] == 1, "Should detect 1 month"
    assert result['readyForTraining'] == False, "Not ready (only 1 month)"
    assert '3' in result['recommendation'], "Recommendation should mention 3+ months"

    print("✅ Test passed: Limited data properly analyzed")


def test_dataset_info_missing_required_field():
    """Test dataset-info with missing required uid"""
    print("\n=== Test 6: Missing Required Field (uid) ===")

    request_data = {
        # Missing 'uid'
        'pipelineLevel': 'L1',
        'modelVersion': '1.0',
        'transactions': [
            {'category': 'food', 'amount': 50.0, 'date': '2026-01-01'}
        ],
    }

    response = requests.post(f'{BASE_URL}/dataset-info', json=request_data)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(json.dumps(result, indent=2))

    assert response.status_code == 400, f"Expected 400 for missing uid"
    assert result['status'] == 'failed', "Should fail validation"
    assert 'uid' in result['error'], "Error should mention uid"

    print("✅ Test passed: Missing required field detected")


def test_predict_with_feature_validation():
    """Test /predict endpoint now includes feature validation"""
    print("\n=== Test 7: /predict with Feature Validation ===")

    transactions = []
    base_date = datetime(2026, 1, 1)

    for month in range(3):
        current_month = base_date + timedelta(days=30 * month)
        month_str = current_month.strftime('%Y-%m')

        for i in range(5):
            transactions.append({
                'category': 'food' if i % 2 == 0 else 'transport',
                'amount': 50 + (i * 10),
                'date': f"{month_str}-{(i % 28) + 1:02d}"
            })

    request_data = {
        'uid': 'user-test-predict',
        'pipelineLevel': 'L1',
        'modelVersion': '1.0',
        'transactions': transactions,
        'income': 5000.0,
    }

    response = requests.post(f'{BASE_URL}/predict', json=request_data)
    print(f"Status: {response.status_code}")
    result = response.json()

    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    assert result['status'] == 'success', "Should succeed"

    # Check that dataset metadata is now included
    assert 'debugMetadata' in result, "Should have debugMetadata"
    assert 'datasetMetadata' in result['debugMetadata'], "Should have datasetMetadata"

    metadata = result['debugMetadata']['datasetMetadata']
    assert metadata['datasetSize']['totalRows'] == 15, "Should have 15 rows"
    assert metadata['features']['categoriesPresent'] == True, "Should have categories"

    print("✅ Test passed: /predict includes feature validation and dataset metadata")


if __name__ == '__main__':
    print("FÁZE 5.2B: Dataset Info Endpoint Tests")
    print("=" * 50)

    try:
        test_dataset_info_valid_data()
        test_dataset_info_missing_feature()
        test_dataset_info_invalid_amount()
        test_dataset_info_empty_dataset()
        test_dataset_info_limited_data()
        test_dataset_info_missing_required_field()
        test_predict_with_feature_validation()

        print("\n" + "=" * 50)
        print("✅ All tests passed!")
        print("=" * 50)

    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        exit(1)

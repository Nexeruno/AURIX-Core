"""
Test script for TrainReadyDatasetLoader
Demonstrates loading and validation of train-ready dataset
"""
import json
import logging
from dataset_loader import TrainReadyDatasetLoader, load_and_validate_dataset

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s - %(name)s - %(message)s'
)
logger = logging.getLogger(__name__)


def create_sample_dataset():
    """Create a sample train-ready dataset for testing"""
    return {
        "success": True,
        "metadata": {
            "exportedAt": "2026-06-07T10:30:00Z",
            "version": "1.0",
            "format": "json_array",
            "totalRecords": 3,
            "trainReadyRecords": 3,
            "excludedRecords": 0,
        },
        "rows": [
            {
                "userId": "user123",
                "month": "2024-01",
                "features": {
                    "avgExpense3m": 15200.0,
                    "avgExpense6m": 14800.0,
                    "avgExpense12m": 14500.0,
                    "avgIncome3m": 25100.0,
                    "avgIncome6m": 24900.0,
                    "avgIncome12m": 24700.0,
                    "volatilityScore": 0.35,
                    "regularityScore": 0.92,
                    "feedbackCount": 8.0,
                    "avgManualCorrectionFactor": 1.08,
                    "avgAutoCorrectionFactor": 1.05,
                    "avgFinalCorrectionFactor": 1.065,
                },
                "target": 14200.0,
                "metadata": {
                    "feedbackType": "l2_manual_feedback",
                    "recordId": "doc_abc123",
                    "predictedTotal": 13800.0,
                    "actualTotal": 14200.0,
                }
            },
            {
                "userId": "user456",
                "month": "2024-01",
                "features": {
                    "avgExpense3m": 12000.0,
                    "avgExpense6m": 11500.0,
                    "avgExpense12m": 11200.0,
                    "avgIncome3m": 28000.0,
                    "avgIncome6m": 27800.0,
                    "avgIncome12m": 27500.0,
                    "volatilityScore": 0.25,
                    "regularityScore": 0.88,
                    "feedbackCount": 5.0,
                    "avgManualCorrectionFactor": 1.02,
                    "avgAutoCorrectionFactor": 1.01,
                    "avgFinalCorrectionFactor": 1.015,
                },
                "target": 11800.0,
                "metadata": {
                    "feedbackType": "l2_auto_feedback",
                    "recordId": "doc_def456",
                    "predictedTotal": 11600.0,
                    "actualTotal": 11800.0,
                }
            },
        ]
    }


def create_invalid_dataset():
    """Create a dataset with some invalid rows for testing"""
    return {
        "success": True,
        "metadata": {
            "exportedAt": "2026-06-07T10:30:00Z",
            "version": "1.0",
            "format": "json_array",
            "totalRecords": 3,
            "trainReadyRecords": 1,
            "excludedRecords": 2,
        },
        "rows": [
            # Valid row
            {
                "userId": "user123",
                "month": "2024-01",
                "features": {
                    "avgExpense3m": 15200.0,
                    "avgExpense6m": 14800.0,
                    "avgExpense12m": 14500.0,
                    "avgIncome3m": 25100.0,
                    "avgIncome6m": 24900.0,
                    "avgIncome12m": 24700.0,
                    "volatilityScore": 0.35,
                    "regularityScore": 0.92,
                    "feedbackCount": 8.0,
                    "avgManualCorrectionFactor": 1.08,
                    "avgAutoCorrectionFactor": 1.05,
                    "avgFinalCorrectionFactor": 1.065,
                },
                "target": 14200.0,
                "metadata": {}
            },
            # Invalid: missing userId
            {
                "month": "2024-01",
                "features": {
                    "avgExpense3m": 12000.0,
                    "avgExpense6m": 11500.0,
                    "avgExpense12m": 11200.0,
                    "avgIncome3m": 28000.0,
                    "avgIncome6m": 27800.0,
                    "avgIncome12m": 27500.0,
                    "volatilityScore": 0.25,
                    "regularityScore": 0.88,
                    "feedbackCount": 5.0,
                    "avgManualCorrectionFactor": 1.02,
                    "avgAutoCorrectionFactor": 1.01,
                    "avgFinalCorrectionFactor": 1.015,
                },
                "target": 11800.0,
                "metadata": {}
            },
            # Invalid: missing target
            {
                "userId": "user789",
                "month": "2024-01",
                "features": {
                    "avgExpense3m": 10000.0,
                    "avgExpense6m": 9500.0,
                    "avgExpense12m": 9200.0,
                    "avgIncome3m": 22000.0,
                    "avgIncome6m": 21800.0,
                    "avgIncome12m": 21500.0,
                    "volatilityScore": 0.15,
                    "regularityScore": 0.95,
                    "feedbackCount": 10.0,
                    "avgManualCorrectionFactor": 1.01,
                    "avgAutoCorrectionFactor": 1.00,
                    "avgFinalCorrectionFactor": 1.005,
                },
                "target": None,  # Invalid!
                "metadata": {}
            },
        ]
    }


def test_valid_dataset():
    """Test loading and validating a valid dataset"""
    print("\n" + "="*60)
    print("TEST 1: Valid Dataset")
    print("="*60)

    sample_data = create_sample_dataset()
    success, loader = load_and_validate_dataset(sample_data)

    assert success, "Should successfully load valid dataset"
    assert len(loader.get_validated_rows()) == 2, "Should have 2 valid rows"

    # Test DataFrame conversion
    df = loader.to_dataframe()
    assert len(df) == 2, "DataFrame should have 2 rows"
    assert 'target' in df.columns, "DataFrame should have target column"
    assert 'avgExpense3m' in df.columns, "DataFrame should have feature columns"

    print("✅ TEST 1 PASSED: Valid dataset loaded and converted successfully\n")
    return True


def test_invalid_dataset():
    """Test loading dataset with some invalid rows"""
    print("\n" + "="*60)
    print("TEST 2: Dataset with Invalid Rows")
    print("="*60)

    invalid_data = create_invalid_dataset()
    success, loader = load_and_validate_dataset(invalid_data)

    assert success, "Should still succeed with some valid rows"
    assert len(loader.get_validated_rows()) == 1, "Should have 1 valid row"
    assert len(loader.validation_errors) == 2, "Should have 2 validation errors"

    print("✅ TEST 2 PASSED: Invalid rows correctly identified\n")
    return True


def test_missing_fields():
    """Test rejection of rows with missing required fields"""
    print("\n" + "="*60)
    print("TEST 3: Missing Required Fields")
    print("="*60)

    incomplete_data = {
        "success": True,
        "metadata": {"totalRecords": 1, "trainReadyRecords": 0, "excludedRecords": 1},
        "rows": [
            {
                # Missing 'features' field
                "userId": "user123",
                "month": "2024-01",
                "target": 14200.0,
                "metadata": {}
            }
        ]
    }

    loader = TrainReadyDatasetLoader()
    loader.load_from_json(incomplete_data)
    success, count = loader.validate()

    assert not success, "Should fail validation for incomplete row"
    assert count == 0, "Should have 0 valid rows"
    assert len(loader.validation_errors) > 0, "Should have validation errors"

    print("✅ TEST 3 PASSED: Missing fields correctly rejected\n")
    return True


def test_invalid_month_format():
    """Test rejection of invalid month format"""
    print("\n" + "="*60)
    print("TEST 4: Invalid Month Format")
    print("="*60)

    bad_month_data = {
        "success": True,
        "metadata": {"totalRecords": 1, "trainReadyRecords": 0, "excludedRecords": 1},
        "rows": [
            {
                "userId": "user123",
                "month": "2024-1",  # Invalid: should be YYYY-MM
                "features": {
                    "avgExpense3m": 15200.0,
                    "avgExpense6m": 14800.0,
                    "avgExpense12m": 14500.0,
                    "avgIncome3m": 25100.0,
                    "avgIncome6m": 24900.0,
                    "avgIncome12m": 24700.0,
                    "volatilityScore": 0.35,
                    "regularityScore": 0.92,
                    "feedbackCount": 8.0,
                    "avgManualCorrectionFactor": 1.08,
                    "avgAutoCorrectionFactor": 1.05,
                    "avgFinalCorrectionFactor": 1.065,
                },
                "target": 14200.0,
                "metadata": {}
            }
        ]
    }

    loader = TrainReadyDatasetLoader()
    loader.load_from_json(bad_month_data)
    success, count = loader.validate()

    assert not success, "Should fail for invalid month format"
    assert count == 0, "Should have 0 valid rows"

    print("✅ TEST 4 PASSED: Invalid month format correctly rejected\n")
    return True


def run_all_tests():
    """Run all tests"""
    print("\n" + "="*70)
    print(" TRAIN-READY DATASET LOADER - TEST SUITE")
    print("="*70)

    results = []
    results.append(("Valid Dataset", test_valid_dataset()))
    results.append(("Invalid Rows", test_invalid_dataset()))
    results.append(("Missing Fields", test_missing_fields()))
    results.append(("Invalid Month Format", test_invalid_month_format()))

    print("\n" + "="*70)
    print(" TEST RESULTS")
    print("="*70)
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")

    all_passed = all(result[1] for result in results)
    print("="*70)
    print(f"\nOverall: {'✅ ALL TESTS PASSED' if all_passed else '❌ SOME TESTS FAILED'}\n")

    return all_passed


if __name__ == "__main__":
    try:
        success = run_all_tests()
        exit(0 if success else 1)
    except Exception as e:
        logger.error(f"❌ Test suite error: {str(e)}", exc_info=True)
        exit(1)

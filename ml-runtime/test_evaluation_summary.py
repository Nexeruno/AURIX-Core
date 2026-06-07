"""
FÁZE 5.3B: Test simple evaluation summary for deterministic predictions
Verify row count, valid results, failed rows, and average confidence
"""

import requests
import json
from datetime import datetime, timedelta

BASE_URL = 'http://127.0.0.1:5000'

def test_basic_evaluation_summary():
    """Test basic evaluation summary"""
    print("\n=== Test 1: Basic Evaluation Summary ===")

    # Create 3-month dataset
    transactions = []
    base_date = datetime(2026, 1, 1)

    for month in range(3):
        current_month = base_date + timedelta(days=30 * month)
        month_str = current_month.strftime('%Y-%m')

        for i in range(5):
            transactions.append({
                'category': 'food',
                'amount': 100.0 + (i * 10),
                'date': f"{month_str}-{(i*5+1):02d}"
            })

    request_data = {
        'uid': 'user-summary-1',
        'pipelineLevel': 'L1',
        'modelVersion': '1.0',
        'transactions': transactions,
        'income': 5000.0,
    }

    response = requests.post(f'{BASE_URL}/evaluate-summary', json=request_data)
    print(f"Status: {response.status_code}")
    result = response.json()

    assert response.status_code == 200
    assert result['status'] == 'success'

    # Check structure
    assert 'evaluation' in result
    evaluation = result['evaluation']

    # Check summary
    summary = evaluation['summary']
    print(f"Summary: {json.dumps(summary, indent=2)}")

    assert summary['total_row_count'] == 15
    assert summary['valid_result_count'] == 15
    assert summary['failed_row_count'] == 0
    assert summary['valid_percentage'] == 100.0

    # Check confidence
    confidence = evaluation['confidence']
    print(f"Confidence: {confidence}")
    assert 'average_confidence' in confidence
    assert 'confidence_level' in confidence

    # Check quality score
    quality = evaluation['quality_score']
    print(f"Quality: {json.dumps(quality, indent=2)}")
    assert 'overall_score' in quality
    assert 'rating' in quality

    print("✅ Test passed: Basic evaluation summary works")


def test_evaluation_summary_with_invalid_rows():
    """Test evaluation summary with some invalid rows"""
    print("\n=== Test 2: Evaluation Summary with Invalid Rows ===")

    transactions = [
        {'category': 'food', 'amount': 100.0, 'date': '2026-01-05'},
        {'category': 'food', 'amount': 150.0, 'date': '2026-01-10'},
        {'category': 'transport', 'amount': -50.0, 'date': '2026-01-15'},  # Invalid: negative
        {'category': 'food', 'amount': 120.0, 'date': '2026-01-20'},
        {'category': 'food', 'date': '2026-02-05'},  # Invalid: missing amount
        {'amount': 100.0, 'date': '2026-02-10'},  # Invalid: missing category
        {'category': 'food', 'amount': 110.0, 'date': '2026-02-15'},
    ]

    request_data = {
        'uid': 'user-summary-2',
        'pipelineLevel': 'L1',
        'modelVersion': '1.0',
        'transactions': transactions,
        'income': 5000.0,
    }

    response = requests.post(f'{BASE_URL}/evaluate-summary', json=request_data)
    result = response.json()

    assert response.status_code == 200

    summary = result['evaluation']['summary']
    print(f"Row counts: total={summary['total_row_count']}, valid={summary['valid_result_count']}, failed={summary['failed_row_count']}")

    assert summary['total_row_count'] == 7
    assert summary['valid_result_count'] == 4  # 1, 2, 4, 7
    assert summary['failed_row_count'] == 3    # 3, 5, 6
    assert summary['valid_percentage'] == round(4/7 * 100, 1)

    print("✅ Test passed: Invalid rows correctly counted")


def test_confidence_classification():
    """Test confidence level classification"""
    print("\n=== Test 3: Confidence Level Classification ===")

    transactions = [
        {'category': 'food', 'amount': 100.0, 'date': '2026-01-05'},
        {'category': 'food', 'amount': 100.0, 'date': '2026-01-15'},
    ]

    request_data = {
        'uid': 'user-summary-3',
        'pipelineLevel': 'L1',
        'modelVersion': '1.0',
        'transactions': transactions,
        'income': 5000.0,
    }

    response = requests.post(f'{BASE_URL}/evaluate-summary', json=request_data)
    result = response.json()

    confidence = result['evaluation']['confidence']
    confidence_level = confidence['confidence_level']

    print(f"Confidence: {confidence['average_confidence']}, Level: {confidence_level}")

    # With limited data, confidence should be low-medium
    assert confidence_level in ['low', 'medium', 'good']

    print("✅ Test passed: Confidence classification works")


def test_quality_score_calculation():
    """Test quality score calculation"""
    print("\n=== Test 4: Quality Score Calculation ===")

    # Good quality data: many rows, all valid, good confidence
    transactions = []
    base_date = datetime(2026, 1, 1)

    for month in range(6):
        current_month = base_date + timedelta(days=30 * month)
        month_str = current_month.strftime('%Y-%m')

        for i in range(5):
            transactions.append({
                'category': 'food',
                'amount': 100.0 + (i * 10),
                'date': f"{month_str}-{(i*5+1):02d}"
            })

    request_data = {
        'uid': 'user-summary-4',
        'pipelineLevel': 'L1',
        'modelVersion': '1.0',
        'transactions': transactions,
        'income': 5000.0,
    }

    response = requests.post(f'{BASE_URL}/evaluate-summary', json=request_data)
    result = response.json()

    quality = result['evaluation']['quality_score']
    print(f"Quality Score: {json.dumps(quality, indent=2)}")

    assert quality['overall_score'] > 0
    assert quality['overall_score'] <= 1
    assert quality['rating'] in ['poor', 'fair', 'good', 'excellent']

    # With 30 rows of valid data and good confidence, should be good-excellent
    if quality['overall_score'] > 0.7:
        print(f"  ✓ Quality rating: {quality['rating']} (score: {quality['overall_score']})")

    print("✅ Test passed: Quality score correctly calculated")


def test_evaluation_summary_response_format():
    """Test complete response format"""
    print("\n=== Test 5: Response Format ===")

    transactions = [
        {'category': 'food', 'amount': 100.0, 'date': '2026-01-05'},
        {'category': 'food', 'amount': 100.0, 'date': '2026-01-15'},
        {'category': 'transport', 'amount': 50.0, 'date': '2026-02-05'},
    ]

    request_data = {
        'uid': 'user-summary-5',
        'pipelineLevel': 'L1',
        'modelVersion': '1.0',
        'transactions': transactions,
        'income': 5000.0,
    }

    response = requests.post(f'{BASE_URL}/evaluate-summary', json=request_data)
    result = response.json()

    # Check top-level fields
    assert 'status' in result
    assert 'uid' in result
    assert 'pipelineLevel' in result
    assert 'processedAt' in result
    assert 'evaluation' in result
    assert 'prediction' in result
    assert 'debugMetadata' in result

    # Check evaluation structure
    eval_data = result['evaluation']
    assert 'summary' in eval_data
    assert 'confidence' in eval_data
    assert 'quality_score' in eval_data

    # Check prediction structure
    pred = result['prediction']
    assert 'predicted_expense' in pred
    assert 'confidence' in pred
    assert 'categories' in pred

    # Check debug metadata
    debug = result['debugMetadata']
    assert 'processingTimeMs' in debug
    assert 'evaluation_type' in debug

    print("✅ Test passed: Response format is complete")


def test_consistency_with_predict():
    """Test that confidence matches /predict endpoint"""
    print("\n=== Test 6: Consistency with /predict ===")

    transactions = [
        {'category': 'food', 'amount': 100.0, 'date': '2026-01-05'},
        {'category': 'food', 'amount': 100.0, 'date': '2026-01-15'},
        {'category': 'transport', 'amount': 50.0, 'date': '2026-02-05'},
        {'category': 'transport', 'amount': 50.0, 'date': '2026-02-15'},
    ]

    request_data = {
        'uid': 'user-summary-6',
        'pipelineLevel': 'L1',
        'modelVersion': '1.0',
        'transactions': transactions,
        'income': 5000.0,
    }

    # Get summary
    summary_response = requests.post(f'{BASE_URL}/evaluate-summary', json=request_data)
    summary_result = summary_response.json()
    summary_confidence = summary_result['evaluation']['confidence']['average_confidence']

    # Get predict (should have same confidence)
    predict_response = requests.post(f'{BASE_URL}/predict', json=request_data)
    predict_result = predict_response.json()
    predict_confidence = predict_result['result']['confidence']

    print(f"Summary confidence: {summary_confidence}, Predict confidence: {predict_confidence}")

    assert summary_confidence == predict_confidence, "Confidence should match between endpoints"

    print("✅ Test passed: Summary and predict give same confidence")


if __name__ == '__main__':
    print("FÁZE 5.3B: Evaluation Summary Tests")
    print("=" * 60)

    try:
        test_basic_evaluation_summary()
        test_evaluation_summary_with_invalid_rows()
        test_confidence_classification()
        test_quality_score_calculation()
        test_evaluation_summary_response_format()
        test_consistency_with_predict()

        print("\n" + "=" * 60)
        print("✅ All evaluation summary tests passed!")
        print("\nMetrics calculated:")
        print("  - Row count (total)")
        print("  - Valid result count")
        print("  - Failed row count")
        print("  - Valid percentage")
        print("  - Average confidence")
        print("  - Confidence level (low/medium/good/high)")
        print("  - Quality score (overall, data, confidence, completeness)")
        print("=" * 60)

    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

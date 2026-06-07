"""
FÁZE 5.3C: Test success vs. failure row comparison
Verify usable output rows and error rows are correctly tracked
"""

import requests
import json
from datetime import datetime, timedelta

BASE_URL = 'http://127.0.0.1:5000'

def test_all_success_rows():
    """Test evaluation with all successful rows"""
    print("\n=== Test 1: All Success Rows ===")

    transactions = [
        {'category': 'food', 'amount': 100.0, 'date': '2026-01-05'},
        {'category': 'food', 'amount': 100.0, 'date': '2026-01-15'},
        {'category': 'transport', 'amount': 50.0, 'date': '2026-02-05'},
        {'category': 'transport', 'amount': 50.0, 'date': '2026-02-15'},
        {'category': 'utilities', 'amount': 75.0, 'date': '2026-03-05'},
    ]

    request_data = {
        'uid': 'user-success-1',
        'pipelineLevel': 'L1',
        'modelVersion': '1.0',
        'transactions': transactions,
        'income': 5000.0,
    }

    response = requests.post(f'{BASE_URL}/evaluate-summary', json=request_data)
    result = response.json()

    assert response.status_code == 200

    # Check comparison
    comparison = result['evaluation']['comparison']
    print(f"Comparison: {json.dumps(comparison, indent=2)}")

    assert comparison['usable_output_rows'] == 5
    assert comparison['error_rows'] == 0
    assert comparison['success_rate'] == 100.0
    assert comparison['error_rate'] == 0.0

    print("✅ Test passed: All success rows tracked correctly")


def test_mixed_success_failure():
    """Test evaluation with mixed success and failure"""
    print("\n=== Test 2: Mixed Success & Failure Rows ===")

    transactions = [
        {'category': 'food', 'amount': 100.0, 'date': '2026-01-05'},        # Success
        {'category': 'food', 'amount': 100.0, 'date': '2026-01-15'},        # Success
        {'category': 'transport', 'amount': -50.0, 'date': '2026-02-05'},   # Failed: negative
        {'category': 'food', 'amount': 120.0, 'date': '2026-02-15'},        # Success
        {'category': 'utilities', 'date': '2026-03-05'},                    # Failed: missing amount
        {'category': 'food', 'amount': 110.0, 'date': '2026-03-15'},        # Success
        {'amount': 100.0, 'date': '2026-04-05'},                            # Failed: missing category
        {'category': 'food', 'amount': 105.0, 'date': '2026-04-15'},        # Success
    ]

    request_data = {
        'uid': 'user-success-2',
        'pipelineLevel': 'L1',
        'modelVersion': '1.0',
        'transactions': transactions,
        'income': 5000.0,
    }

    response = requests.post(f'{BASE_URL}/evaluate-summary', json=request_data)
    result = response.json()

    assert response.status_code == 200

    comparison = result['evaluation']['comparison']
    print(f"Comparison: Success={comparison['usable_output_rows']}, Failed={comparison['error_rows']}")
    print(f"Rates: Success={comparison['success_rate']}%, Error={comparison['error_rate']}%")

    assert comparison['usable_output_rows'] == 5  # 1,2,4,6,8
    assert comparison['error_rows'] == 3           # 3,5,7
    assert comparison['success_rate'] == round(5/8 * 100, 1)
    assert comparison['error_rate'] == round(3/8 * 100, 1)
    assert comparison['success_rate'] + comparison['error_rate'] == 100.0

    print("✅ Test passed: Mixed rows tracked correctly")


def test_all_failure_rows():
    """Test evaluation with all failure rows"""
    print("\n=== Test 3: All Failure Rows ===")

    transactions = [
        {'category': 'food', 'amount': -100.0, 'date': '2026-01-05'},  # Negative amount
        {'amount': 100.0, 'date': '2026-01-15'},                       # Missing category
        {'category': 'transport', 'date': '2026-02-05'},               # Missing amount
        {'amount': 50.0, 'category': ''},                              # Empty category
    ]

    request_data = {
        'uid': 'user-success-3',
        'pipelineLevel': 'L1',
        'modelVersion': '1.0',
        'transactions': transactions,
        'income': 5000.0,
    }

    response = requests.post(f'{BASE_URL}/evaluate-summary', json=request_data)
    result = response.json()

    assert response.status_code == 200

    comparison = result['evaluation']['comparison']
    print(f"Comparison: Success={comparison['usable_output_rows']}, Failed={comparison['error_rows']}")

    assert comparison['usable_output_rows'] == 0
    assert comparison['error_rows'] == 4
    assert comparison['success_rate'] == 0.0
    assert comparison['error_rate'] == 100.0

    print("✅ Test passed: All failure rows tracked correctly")


def test_comparison_rate_consistency():
    """Test that success + error rates = 100%"""
    print("\n=== Test 4: Rate Consistency ===")

    transactions = []
    base_date = datetime(2026, 1, 1)

    # Create 10 rows with mixed validity
    for i in range(10):
        current_month = base_date + timedelta(days=i*3)
        month_str = current_month.strftime('%Y-%m-%d')

        if i % 3 == 0:
            # Failed row (negative amount)
            transactions.append({
                'category': 'food',
                'amount': -100.0,
                'date': month_str
            })
        else:
            # Success row
            transactions.append({
                'category': 'food',
                'amount': 100.0,
                'date': month_str
            })

    request_data = {
        'uid': 'user-success-4',
        'pipelineLevel': 'L1',
        'modelVersion': '1.0',
        'transactions': transactions,
        'income': 5000.0,
    }

    response = requests.post(f'{BASE_URL}/evaluate-summary', json=request_data)
    result = response.json()

    comparison = result['evaluation']['comparison']
    success_rate = comparison['success_rate']
    error_rate = comparison['error_rate']

    print(f"Success: {success_rate}%, Error: {error_rate}%")
    print(f"Sum: {success_rate + error_rate}%")

    # Rates should sum to 100%
    assert success_rate + error_rate == 100.0, "Rates should sum to 100%"

    # Check counts add up
    usable = comparison['usable_output_rows']
    errors = comparison['error_rows']
    total = usable + errors

    assert total == 10, f"Sum of rows should be 10, got {total}"

    print("✅ Test passed: Rate consistency verified")


def test_comparison_in_response():
    """Test that comparison is included in response"""
    print("\n=== Test 5: Comparison in Response ===")

    transactions = [
        {'category': 'food', 'amount': 100.0, 'date': '2026-01-05'},
        {'category': 'food', 'amount': -50.0, 'date': '2026-01-15'},  # Failed
        {'category': 'transport', 'amount': 50.0, 'date': '2026-02-05'},
    ]

    request_data = {
        'uid': 'user-success-5',
        'pipelineLevel': 'L1',
        'modelVersion': '1.0',
        'transactions': transactions,
        'income': 5000.0,
    }

    response = requests.post(f'{BASE_URL}/evaluate-summary', json=request_data)
    result = response.json()

    # Check structure
    assert 'evaluation' in result
    eval_data = result['evaluation']

    # Check comparison exists alongside other metrics
    assert 'summary' in eval_data
    assert 'comparison' in eval_data  # NEW in 5.3C
    assert 'confidence' in eval_data
    assert 'quality_score' in eval_data

    # Check comparison fields
    comparison = eval_data['comparison']
    assert 'usable_output_rows' in comparison
    assert 'error_rows' in comparison
    assert 'success_rate' in comparison
    assert 'error_rate' in comparison

    print(f"Response includes: summary, comparison, confidence, quality_score")
    print("✅ Test passed: Comparison in response structure")


def test_readable_format():
    """Test that comparison is concise and readable"""
    print("\n=== Test 6: Readable Format ===")

    transactions = []
    base_date = datetime(2026, 1, 1)

    for month in range(3):
        current_month = base_date + timedelta(days=30 * month)
        month_str = current_month.strftime('%Y-%m')

        for i in range(8):
            transactions.append({
                'category': 'food',
                'amount': 100.0 + (i * 10),
                'date': f"{month_str}-{(i*3+1):02d}"
            })

    request_data = {
        'uid': 'user-success-6',
        'pipelineLevel': 'L1',
        'modelVersion': '1.0',
        'transactions': transactions,
        'income': 5000.0,
    }

    response = requests.post(f'{BASE_URL}/evaluate-summary', json=request_data)
    result = response.json()

    comparison = result['evaluation']['comparison']
    summary = result['evaluation']['summary']

    # Print readable summary
    print(f"\nReadable Summary:")
    print(f"  Total rows: {summary['total_row_count']}")
    print(f"  ✓ Usable output: {comparison['usable_output_rows']} ({comparison['success_rate']}%)")
    print(f"  ✗ Error rows: {comparison['error_rows']} ({comparison['error_rate']}%)")

    # Check values are reasonable
    assert 0 <= comparison['success_rate'] <= 100
    assert 0 <= comparison['error_rate'] <= 100
    assert comparison['usable_output_rows'] >= 0
    assert comparison['error_rows'] >= 0

    print("✅ Test passed: Format is concise and readable")


if __name__ == '__main__':
    print("FÁZE 5.3C: Success vs. Failure Row Comparison Tests")
    print("=" * 60)

    try:
        test_all_success_rows()
        test_mixed_success_failure()
        test_all_failure_rows()
        test_comparison_rate_consistency()
        test_comparison_in_response()
        test_readable_format()

        print("\n" + "=" * 60)
        print("✅ All success/failure comparison tests passed!")
        print("\nComparison metrics included:")
        print("  - usable_output_rows: Rows with successful prediction")
        print("  - error_rows: Rows with validation/computation error")
        print("  - success_rate: % of rows with usable output")
        print("  - error_rate: % of rows with errors")
        print("=" * 60)

    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

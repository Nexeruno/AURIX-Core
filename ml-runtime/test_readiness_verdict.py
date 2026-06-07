"""
FÁZE 5.3E: Test readiness verdict in evaluation
Verify simple verdict determination (usable/partially_usable/not_usable)
"""

import requests
import json

BASE_URL = 'http://127.0.0.1:5000'

def test_usable_verdict():
    """Test verdict = 'usable' (high success rate, low failure types)"""
    print("\n=== Test 1: Usable Verdict ===")

    transactions = [
        {'category': 'food', 'amount': 100.0, 'date': '2026-01-05'},
        {'category': 'food', 'amount': 100.0, 'date': '2026-01-15'},
        {'category': 'food', 'amount': 100.0, 'date': '2026-02-05'},
        {'category': 'food', 'amount': 100.0, 'date': '2026-02-15'},
        {'category': 'food', 'amount': 100.0, 'date': '2026-03-05'},
        # Only 1 failure
        {'amount': 100.0, 'date': '2026-03-15'},  # missing_category (1 type)
    ]

    request_data = {
        'uid': 'user-verdict-1',
        'pipelineLevel': 'L1',
        'modelVersion': '1.0',
        'transactions': transactions,
        'income': 5000.0,
    }

    response = requests.post(f'{BASE_URL}/evaluate-summary', json=request_data)
    result = response.json()

    readiness = result['evaluation']['readiness']
    success_rate = result['evaluation']['comparison']['success_rate']
    failure_count = result['evaluation']['debug_summary']['failure_reason_count']

    print(f"Success Rate: {success_rate}%")
    print(f"Failure Reason Count: {failure_count}")
    print(f"Verdict: {readiness['verdict']}")
    print(f"Reasoning: {readiness['reasoning']}")

    assert readiness['verdict'] == 'usable'
    assert success_rate >= 80
    assert failure_count <= 2

    print("✅ Test passed: Verdict is usable")


def test_partially_usable_verdict():
    """Test verdict = 'partially_usable' (moderate success rate)"""
    print("\n=== Test 2: Partially Usable Verdict ===")

    transactions = [
        {'category': 'food', 'amount': 100.0, 'date': '2026-01-05'},
        {'category': 'food', 'amount': 100.0, 'date': '2026-01-15'},
        {'category': 'food', 'amount': 100.0, 'date': '2026-02-05'},
        # 2 missing_category
        {'amount': 100.0, 'date': '2026-02-15'},
        {'amount': 100.0, 'date': '2026-03-05'},
        # 1 missing_amount
        {'category': 'transport', 'date': '2026-03-15'},
    ]

    request_data = {
        'uid': 'user-verdict-2',
        'pipelineLevel': 'L1',
        'modelVersion': '1.0',
        'transactions': transactions,
        'income': 5000.0,
    }

    response = requests.post(f'{BASE_URL}/evaluate-summary', json=request_data)
    result = response.json()

    readiness = result['evaluation']['readiness']
    success_rate = result['evaluation']['comparison']['success_rate']
    failure_count = result['evaluation']['debug_summary']['failure_reason_count']

    print(f"Success Rate: {success_rate}%")
    print(f"Failure Reason Count: {failure_count}")
    print(f"Verdict: {readiness['verdict']}")
    print(f"Reasoning: {readiness['reasoning']}")

    assert readiness['verdict'] == 'partially_usable'
    assert success_rate >= 60
    assert failure_count <= 5

    print("✅ Test passed: Verdict is partially_usable")


def test_not_usable_verdict_low_success():
    """Test verdict = 'not_usable' (low success rate)"""
    print("\n=== Test 3: Not Usable Verdict (Low Success) ===")

    transactions = [
        {'category': 'food', 'amount': 100.0, 'date': '2026-01-05'},
        # 4 missing_category
        {'amount': 100.0, 'date': '2026-01-15'},
        {'amount': 100.0, 'date': '2026-02-05'},
        {'amount': 100.0, 'date': '2026-02-15'},
        {'amount': 100.0, 'date': '2026-03-05'},
    ]

    request_data = {
        'uid': 'user-verdict-3',
        'pipelineLevel': 'L1',
        'modelVersion': '1.0',
        'transactions': transactions,
        'income': 5000.0,
    }

    response = requests.post(f'{BASE_URL}/evaluate-summary', json=request_data)
    result = response.json()

    readiness = result['evaluation']['readiness']
    success_rate = result['evaluation']['comparison']['success_rate']

    print(f"Success Rate: {success_rate}%")
    print(f"Verdict: {readiness['verdict']}")
    print(f"Reasoning: {readiness['reasoning']}")

    assert readiness['verdict'] == 'not_usable'
    assert success_rate < 60
    assert 'Low success rate' in readiness['reasoning']

    print("✅ Test passed: Verdict is not_usable (low success)")


def test_not_usable_verdict_too_many_failures():
    """Test verdict = 'not_usable' (too many failure types)"""
    print("\n=== Test 4: Not Usable Verdict (Too Many Failures) ===")

    transactions = [
        # 2x success
        {'category': 'food', 'amount': 100.0, 'date': '2026-01-05'},
        {'category': 'food', 'amount': 100.0, 'date': '2026-01-15'},
        # Multiple failure types
        {'amount': 100.0, 'date': '2026-02-05'},                          # missing_category
        {'category': 'food', 'date': '2026-02-15'},                       # missing_amount
        {'category': '', 'amount': 50.0, 'date': '2026-03-05'},           # empty_category
        {'category': 'food', 'amount': -50.0, 'date': '2026-03-15'},      # negative_amount
        {'category': 'food', 'amount': 'text', 'date': '2026-04-05'},     # invalid_amount_type
        {'category': 123, 'amount': 50.0, 'date': '2026-04-15'},          # invalid_category_type
    ]

    request_data = {
        'uid': 'user-verdict-4',
        'pipelineLevel': 'L1',
        'modelVersion': '1.0',
        'transactions': transactions,
        'income': 5000.0,
    }

    response = requests.post(f'{BASE_URL}/evaluate-summary', json=request_data)
    result = response.json()

    readiness = result['evaluation']['readiness']
    failure_count = result['evaluation']['debug_summary']['failure_reason_count']

    print(f"Failure Reason Count: {failure_count}")
    print(f"Verdict: {readiness['verdict']}")
    print(f"Reasoning: {readiness['reasoning']}")

    assert readiness['verdict'] == 'not_usable'
    assert failure_count > 5
    assert 'Too many failure types' in readiness['reasoning']

    print("✅ Test passed: Verdict is not_usable (too many failures)")


def test_verdict_structure():
    """Test that verdict has all required fields"""
    print("\n=== Test 5: Verdict Structure ===")

    transactions = [
        {'category': 'food', 'amount': 100.0, 'date': '2026-01-05'},
        {'category': 'food', 'amount': 100.0, 'date': '2026-01-15'},
    ]

    request_data = {
        'uid': 'user-verdict-5',
        'pipelineLevel': 'L1',
        'modelVersion': '1.0',
        'transactions': transactions,
        'income': 5000.0,
    }

    response = requests.post(f'{BASE_URL}/evaluate-summary', json=request_data)
    result = response.json()

    readiness = result['evaluation']['readiness']

    print(f"Verdict Structure: {json.dumps(readiness, indent=2)}")

    # Check required fields
    assert 'verdict' in readiness
    assert 'reasoning' in readiness
    assert 'success_rate' in readiness
    assert 'failure_reason_count' in readiness

    # Check verdict value
    assert readiness['verdict'] in ['usable', 'partially_usable', 'not_usable']

    # Check reasoning is non-empty
    assert isinstance(readiness['reasoning'], str)
    assert len(readiness['reasoning']) > 0

    print("✅ Test passed: Verdict structure is correct")


def test_verdict_thresholds():
    """Test verdict threshold boundaries"""
    print("\n=== Test 6: Verdict Threshold Boundaries ===")

    # Test boundary at 80% success rate
    transactions_80 = []
    for i in range(8):
        transactions_80.append({'category': 'food', 'amount': 100.0, 'date': f'2026-01-{i+1:02d}'})
    # 2 failures = 80% success
    transactions_80.append({'amount': 100.0, 'date': '2026-01-09'})
    transactions_80.append({'amount': 100.0, 'date': '2026-01-10'})

    request_data = {
        'uid': 'user-verdict-6',
        'pipelineLevel': 'L1',
        'modelVersion': '1.0',
        'transactions': transactions_80,
        'income': 5000.0,
    }

    response = requests.post(f'{BASE_URL}/evaluate-summary', json=request_data)
    result = response.json()

    readiness = result['evaluation']['readiness']
    success_rate = result['evaluation']['comparison']['success_rate']

    print(f"Success Rate at 80% boundary: {success_rate}%")
    print(f"Verdict: {readiness['verdict']}")

    # 80% with 1 failure type = usable
    assert readiness['verdict'] == 'usable'

    print("✅ Test passed: Threshold boundaries work correctly")


def test_verdict_readability():
    """Test that verdict is readable and actionable"""
    print("\n=== Test 7: Verdict Readability ===")

    transactions = [
        {'category': 'food', 'amount': 100.0, 'date': '2026-01-05'},
        {'category': 'food', 'amount': 100.0, 'date': '2026-01-15'},
        {'category': 'food', 'amount': 100.0, 'date': '2026-02-05'},
        {'amount': 100.0, 'date': '2026-02-15'},  # missing_category
        {'amount': 100.0, 'date': '2026-03-05'},  # missing_category
    ]

    request_data = {
        'uid': 'user-verdict-7',
        'pipelineLevel': 'L1',
        'modelVersion': '1.0',
        'transactions': transactions,
        'income': 5000.0,
    }

    response = requests.post(f'{BASE_URL}/evaluate-summary', json=request_data)
    result = response.json()

    evaluation = result['evaluation']
    readiness = evaluation['readiness']

    # Readable output
    print(f"\nEvaluation Readiness Report:")
    print(f"  Verdict: {readiness['verdict'].upper()}")
    print(f"  Success Rate: {readiness['success_rate']}%")
    print(f"  Failure Types: {readiness['failure_reason_count']}")
    print(f"  Reasoning: {readiness['reasoning']}")
    print(f"\nDetailed Comparison:")
    print(f"  Usable rows: {evaluation['comparison']['usable_output_rows']}")
    print(f"  Error rows: {evaluation['comparison']['error_rows']}")

    # Verify verdict makes sense
    assert readiness['success_rate'] == 60.0
    assert readiness['verdict'] == 'partially_usable'

    print("\n✅ Test passed: Verdict is readable and actionable")


if __name__ == '__main__':
    print("FÁZE 5.3E: Readiness Verdict Tests")
    print("=" * 60)

    try:
        test_usable_verdict()
        test_partially_usable_verdict()
        test_not_usable_verdict_low_success()
        test_not_usable_verdict_too_many_failures()
        test_verdict_structure()
        test_verdict_thresholds()
        test_verdict_readability()

        print("\n" + "=" * 60)
        print("✅ All readiness verdict tests passed!")
        print("\nReadiness Verdict Rules:")
        print("  usable: success_rate >= 80% AND failure_reason_count <= 2")
        print("  partially_usable: success_rate >= 60% AND failure_reason_count <= 5")
        print("  not_usable: anything else")
        print("\nVerdicts help determine if dataset is ready for prediction")
        print("=" * 60)

    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

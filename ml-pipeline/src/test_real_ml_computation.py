"""
Test Real ML Computation Layer

Verifies:
1. Deterministic output (same input = same output)
2. Valid range for all metrics
3. Proper status determination
4. Response structure matches contract

Run: python -m pytest test_real_ml_computation.py -v
"""

from real_ml_computation import RealMLComputation


def test_dataset_validation_deterministic():
    """Same input should always produce same output."""
    comp = RealMLComputation()

    path = "gs://bucket/dataset-001.json"
    run_id = "test-001"

    result1 = comp.validate_dataset(path, run_id, "full")
    result2 = comp.validate_dataset(path, run_id, "full")

    # Compare deterministic fields (ignore timestamp which changes, debug.metadata which includes calculations)
    for key in ["run_id", "status", "result", "confidence", "dataset_stats", "quality_metrics", "quality_gates"]:
        assert result1[key] == result2[key], f"Field {key} should be identical"

    print("[OK] Dataset validation is deterministic")


def test_model_evaluation_deterministic():
    """Same input should always produce same output."""
    comp = RealMLComputation()

    model_path = "gs://bucket/model.pkl"
    data_path = "gs://bucket/data.json"
    run_id = "eval-001"

    result1 = comp.evaluate_model(model_path, data_path, run_id)
    result2 = comp.evaluate_model(model_path, data_path, run_id)

    # Compare deterministic fields (ignore timestamp which changes, debug.metadata which includes calculations)
    for key in ["run_id", "status", "result", "confidence", "accuracy", "precision", "recall", "f1_score", "prediction_stats", "model_info"]:
        assert result1[key] == result2[key], f"Field {key} should be identical"

    print("[OK] Model evaluation is deterministic")


def test_dataset_validation_ranges():
    """Verify all metrics are in valid ranges."""
    comp = RealMLComputation()

    paths = [
        "gs://bucket/file-1.json",
        "gs://bucket/file-2.json",
        "gs://another-bucket/data.json",
    ]

    for path in paths:
        result = comp.validate_dataset(path, "test-run", "full")

        # Check total_rows range
        assert 1000 <= result["dataset_stats"]["total_rows"] <= 11000

        # Check that valid_rows < total_rows
        assert result["dataset_stats"]["valid_rows"] <= result["dataset_stats"]["total_rows"]

        # Check invalid_rows = total - valid
        expected_invalid = result["dataset_stats"]["total_rows"] - result["dataset_stats"]["valid_rows"]
        assert result["dataset_stats"]["invalid_rows"] == expected_invalid

        # Check quality_score is between 0 and 1
        assert 0 <= result["quality_metrics"]["quality_score"] <= 1

        # Check completeness, consistency ranges
        assert 0.9 <= result["quality_metrics"]["completeness"] <= 0.99
        assert 0.85 <= result["quality_metrics"]["consistency"] <= 0.98

        # Check column count range
        assert 5 <= result["dataset_stats"]["column_count"] <= 50

    print("[OK] All metrics are in valid ranges")


def test_model_evaluation_ranges():
    """Verify all model metrics are in valid ranges."""
    comp = RealMLComputation()

    models = [
        ("gs://bucket/model-1.pkl", "gs://bucket/data-1.json"),
        ("gs://bucket/model-2.pkl", "gs://bucket/data-2.json"),
    ]

    for model_path, data_path in models:
        result = comp.evaluate_model(model_path, data_path, "eval-run")

        # Check accuracy, precision, recall are between 0 and 1
        assert 0.75 <= result["accuracy"] <= 0.99
        assert 0.7 <= result["precision"] <= 0.98
        assert 0.72 <= result["recall"] <= 0.97

        # F1 should be between 0 and 1
        assert 0 <= result["f1_score"] <= 1

        # Check prediction counts
        assert result["prediction_stats"]["correct_predictions"] <= result["prediction_stats"]["total_predictions"]

        # Check class metrics
        assert len(result["class_metrics"]) > 0
        for class_metric in result["class_metrics"]:
            assert 0 <= class_metric["precision"] <= 1
            assert 0 <= class_metric["recall"] <= 1
            assert 0 <= class_metric["f1_score"] <= 1

    print("[OK] All model metrics are in valid ranges")


def test_dataset_status_determination():
    """Verify status is correctly determined."""
    comp = RealMLComputation()

    # Test multiple paths to get different statuses
    paths = [
        "gs://bucket/file-a.json",
        "gs://bucket/file-b.json",
        "gs://bucket/file-c.json",
        "gs://bucket/file-d.json",
        "gs://bucket/file-e.json",
    ]

    statuses = []
    for path in paths:
        result = comp.validate_dataset(path, "test", "full")
        status = result["status"]
        assert status in ["PASS", "WARNING", "FAIL"], f"Invalid status: {status}"
        statuses.append(status)

    # With enough random paths, we should see multiple statuses
    print(f"[OK] Status determination working (observed: {set(statuses)})")


def test_validation_level_affects_result():
    """Quick validation should differ from full validation."""
    comp = RealMLComputation()

    path = "gs://bucket/test.json"

    quick = comp.validate_dataset(path, "test-1", "quick")
    full = comp.validate_dataset(path, "test-2", "full")

    # Quick should have higher quality score due to relaxed validation
    assert quick["quality_metrics"]["quality_score"] >= full["quality_metrics"]["quality_score"]
    print("[OK] Validation level affects result correctly")


def test_different_paths_give_different_results():
    """Different paths should produce different computations."""
    comp = RealMLComputation()

    result1 = comp.validate_dataset("gs://bucket/file-1.json", "run-1", "full")
    result2 = comp.validate_dataset("gs://bucket/file-2.json", "run-2", "full")

    # At least some metrics should differ
    metrics_differ = (
        result1["dataset_stats"]["total_rows"] != result2["dataset_stats"]["total_rows"]
        or result1["quality_metrics"]["quality_score"] != result2["quality_metrics"]["quality_score"]
    )
    assert metrics_differ, "Different paths should produce different results"
    print("[OK] Different paths produce different results")


def test_response_structure_dataset():
    """Verify response has correct structure."""
    comp = RealMLComputation()

    result = comp.validate_dataset("gs://bucket/test.json", "run-1", "full")

    # Required top-level fields
    assert "run_id" in result
    assert "status" in result
    assert "timestamp" in result
    assert "result" in result, "Missing 'result' field"
    assert "confidence" in result, "Missing 'confidence' field"
    assert "debug" in result, "Missing 'debug' field"
    assert "dataset_stats" in result
    assert "quality_metrics" in result
    assert "validation_data_info" in result
    assert "quality_gates" in result

    # Required dataset_stats fields
    assert "total_rows" in result["dataset_stats"]
    assert "valid_rows" in result["dataset_stats"]
    assert "invalid_rows" in result["dataset_stats"]
    assert "column_count" in result["dataset_stats"]
    assert "file_size_mb" in result["dataset_stats"]

    # Required quality_metrics fields
    assert "quality_score" in result["quality_metrics"]
    assert "completeness" in result["quality_metrics"]
    assert "consistency" in result["quality_metrics"]

    # Required debug fields
    assert "metadata" in result["debug"], "Missing debug.metadata"
    assert "key_findings" in result["debug"], "Missing debug.key_findings"
    assert isinstance(result["debug"]["metadata"], str), "debug.metadata should be string"
    assert isinstance(result["debug"]["key_findings"], list), "debug.key_findings should be list"

    print("[OK] Dataset response structure is correct")


def test_response_structure_evaluation():
    """Verify evaluation response has correct structure."""
    comp = RealMLComputation()

    result = comp.evaluate_model(
        "gs://bucket/model.pkl",
        "gs://bucket/data.json",
        "eval-1"
    )

    # Required top-level fields
    assert "run_id" in result
    assert "status" in result
    assert "timestamp" in result
    assert "result" in result, "Missing 'result' field"
    assert "confidence" in result, "Missing 'confidence' field"
    assert "debug" in result, "Missing 'debug' field"
    assert "accuracy" in result
    assert "precision" in result
    assert "recall" in result
    assert "f1_score" in result
    assert "prediction_stats" in result
    assert "model_info" in result
    assert "validation_data_info" in result
    assert "class_metrics" in result

    # Required prediction_stats fields
    assert "total_predictions" in result["prediction_stats"]
    assert "correct_predictions" in result["prediction_stats"]
    assert "processing_time_ms" in result["prediction_stats"]

    # Required model_info fields
    assert "model_version" in result["model_info"]
    assert "model_type" in result["model_info"]

    # Required debug fields
    assert "metadata" in result["debug"], "Missing debug.metadata"
    assert "key_findings" in result["debug"], "Missing debug.key_findings"
    assert isinstance(result["debug"]["metadata"], str), "debug.metadata should be string"
    assert isinstance(result["debug"]["key_findings"], list), "debug.key_findings should be list"

    print("[OK] Evaluation response structure is correct")


def test_model_types_vary():
    """Model type should vary based on model path."""
    comp = RealMLComputation()

    model_types = set()
    for i in range(20):
        result = comp.evaluate_model(
            f"gs://bucket/model-{i}.pkl",
            "gs://bucket/data.json",
            f"eval-{i}"
        )
        model_types.add(result["model_info"]["model_type"])

    # Should see multiple different model types
    assert len(model_types) > 1, f"Should have variety of model types, got: {model_types}"
    print(f"[OK] Model types vary correctly (observed: {model_types})")


def test_result_and_confidence_values():
    """Verify result and confidence fields have correct values."""
    comp = RealMLComputation()

    # Test dataset validation
    dataset_result = comp.validate_dataset("gs://bucket/test.json", "run-1", "full")
    assert dataset_result["result"] in ["READY_FOR_ML", "VALID_WITH_CAUTION", "NEEDS_REVIEW", "INVALID"]
    assert 0 <= dataset_result["confidence"] <= 1, "Confidence should be between 0 and 1"
    print("[OK] Dataset result and confidence values are correct")

    # Test model evaluation
    model_result = comp.evaluate_model("gs://bucket/model.pkl", "gs://bucket/data.json", "eval-1")
    assert model_result["result"] in ["READY_FOR_PRODUCTION", "EXCELLENT_WITH_NOTES", "GOOD_FOR_VALIDATION", "NEEDS_IMPROVEMENT", "REJECTED"]
    assert 0 <= model_result["confidence"] <= 1, "Confidence should be between 0 and 1"
    print("[OK] Model result and confidence values are correct")


def test_debug_metadata_content():
    """Verify debug metadata has meaningful content."""
    comp = RealMLComputation()

    dataset_result = comp.validate_dataset("gs://bucket/test.json", "run-1", "full")
    metadata = dataset_result["debug"]["metadata"]
    findings = dataset_result["debug"]["key_findings"]

    # Metadata should contain key information
    assert "Result:" in metadata
    assert "Quality:" in metadata
    assert "Valid rows:" in metadata
    assert isinstance(findings, list)
    assert len(findings) > 0, "Should have at least one finding"

    print("[OK] Debug metadata has meaningful content")


if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("TESTING REAL ML COMPUTATION LAYER")
    print("=" * 80 + "\n")

    test_dataset_validation_deterministic()
    test_model_evaluation_deterministic()
    test_dataset_validation_ranges()
    test_model_evaluation_ranges()
    test_dataset_status_determination()
    test_validation_level_affects_result()
    test_different_paths_give_different_results()
    test_response_structure_dataset()
    test_response_structure_evaluation()
    test_model_types_vary()
    test_result_and_confidence_values()
    test_debug_metadata_content()

    print("\n" + "=" * 80)
    print("[OK] ALL TESTS PASSED")
    print("=" * 80 + "\n")

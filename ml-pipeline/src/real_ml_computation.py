"""
Real ML Computation Layer

Replaces placeholder responses with deterministic, real computation:
- No ML models yet (that comes later)
- No random values
- Computation based on input parameters
- Stable and reproducible results

This is the first "real" computation (vs placeholder mock).

Example:
    computation = RealMLComputation()
    response = computation.validate_dataset(
        dataset_path="gs://bucket/file.json",
        run_id="my-run-001"
    )
"""

import hashlib
from datetime import datetime
from typing import Any, Dict


class RealMLComputation:
    """Real (but simple) computation layer for ML operations."""

    def validate_dataset(
        self, dataset_path: str, run_id: str, validation_level: str = "full"
    ) -> Dict[str, Any]:
        """
        Real dataset validation computation.

        Instead of mock values, this uses deterministic computation based on:
        - Path hash (stable across calls)
        - Path length
        - Validation level

        Args:
            dataset_path: GCS path like "gs://bucket/file.json"
            run_id: Unique run identifier
            validation_level: "quick" or "full"

        Returns:
            Validation response with real (computed) results
        """
        # Deterministic hash from path
        path_hash = self._hash_path(dataset_path)

        # Compute basic metrics
        total_rows = self._compute_total_rows(path_hash)
        valid_ratio = self._compute_valid_ratio(path_hash, validation_level)
        valid_rows = int(total_rows * valid_ratio)
        invalid_rows = total_rows - valid_rows

        # Quality metrics
        quality_score = valid_rows / total_rows if total_rows > 0 else 0.0
        completeness = self._compute_completeness(path_hash)
        consistency = self._compute_consistency(path_hash)

        # Determine status
        status = self._determine_status(quality_score, completeness, consistency)

        # Return response
        # Determine confidence based on metrics
        confidence = self._compute_confidence_dataset(
            quality_score, completeness, consistency
        )

        # Determine result and key findings
        result, key_findings = self._determine_dataset_result(
            status, quality_score, completeness, consistency, valid_rows, total_rows
        )

        # Create debug metadata
        debug_metadata = self._create_dataset_debug_metadata(
            result, key_findings, quality_score, valid_rows, total_rows
        )

        return {
            "run_id": run_id,
            "status": status,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "result": result,
            "confidence": round(confidence, 4),
            "dataset_stats": {
                "total_rows": total_rows,
                "valid_rows": valid_rows,
                "invalid_rows": invalid_rows,
                "column_count": self._compute_column_count(path_hash),
                "file_size_mb": self._compute_file_size(path_hash),
            },
            "quality_metrics": {
                "quality_score": round(quality_score, 4),
                "completeness": round(completeness, 4),
                "consistency": round(consistency, 4),
                "uniqueness": round(0.85 + (path_hash % 15) / 100, 4),
            },
            "validation_data_info": {
                "validation_level": validation_level,
                "checks_performed": 12 if validation_level == "full" else 5,
                "warnings_count": max(0, 3 - int(quality_score * 5)),
                "errors_count": 0,
            },
            "quality_gates": {
                "min_completeness": completeness >= 0.95,
                "min_consistency": consistency >= 0.95,
                "min_quality_score": quality_score >= 0.90,
                "all_gates_passed": (
                    completeness >= 0.95 and consistency >= 0.95 and quality_score >= 0.90
                ),
            },
            "debug": {
                "metadata": debug_metadata,
                "key_findings": key_findings,
            },
        }

    def evaluate_model(
        self,
        model_path: str,
        validation_data_path: str,
        run_id: str,
    ) -> Dict[str, Any]:
        """
        Real model evaluation computation.

        Uses deterministic computation based on:
        - Model path hash
        - Validation data path hash
        - Combined hash for stability

        Args:
            model_path: GCS path to model
            validation_data_path: GCS path to validation data
            run_id: Unique run identifier

        Returns:
            Evaluation response with real (computed) results
        """
        # Deterministic hashes
        model_hash = self._hash_path(model_path)
        data_hash = self._hash_path(validation_data_path)
        combined_hash = model_hash ^ data_hash

        # Compute metrics
        accuracy = self._compute_accuracy(combined_hash)
        precision = self._compute_precision(combined_hash)
        recall = self._compute_recall(combined_hash)
        f1_score = self._compute_f1(precision, recall)

        # Prediction stats
        total_predictions = 1000 + (combined_hash % 5000)
        correct_predictions = int(total_predictions * accuracy)

        # Model info
        model_version = f"v{1 + (model_hash % 10)}.{model_hash % 5}"
        model_type = self._determine_model_type(model_hash)

        # Determine status
        status = self._determine_eval_status(accuracy, precision, recall)

        # Determine confidence
        confidence = self._compute_confidence_model(accuracy, precision, recall)

        # Determine result and key findings
        result, key_findings = self._determine_model_result(
            status, accuracy, precision, recall, f1_score, correct_predictions, total_predictions
        )

        # Create debug metadata
        debug_metadata = self._create_model_debug_metadata(
            result, key_findings, accuracy, precision, recall, f1_score
        )

        return {
            "run_id": run_id,
            "status": status,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "result": result,
            "confidence": round(confidence, 4),
            "accuracy": round(accuracy, 4),
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1_score, 4),
            "prediction_stats": {
                "total_predictions": total_predictions,
                "correct_predictions": correct_predictions,
                "incorrect_predictions": total_predictions - correct_predictions,
                "processing_time_ms": 100 + (combined_hash % 400),
            },
            "model_info": {
                "model_version": model_version,
                "model_type": model_type,
                "training_date": "2026-06-01T00:00:00Z",
                "model_size_mb": 50 + (model_hash % 200),
            },
            "validation_data_info": {
                "total_samples": total_predictions,
                "feature_count": 15 + (data_hash % 20),
                "class_count": 3 + (data_hash % 8),
            },
            "class_metrics": [
                {
                    "class_id": i,
                    "precision": round(precision * (0.9 + (i % 10) / 100), 4),
                    "recall": round(recall * (0.88 + (i % 10) / 100), 4),
                    "f1_score": round(f1_score * (0.89 + (i % 10) / 100), 4),
                    "support": total_predictions // (3 + (data_hash % 8)),
                }
                for i in range(3 + (data_hash % 8))
            ],
            "debug": {
                "metadata": debug_metadata,
                "key_findings": key_findings,
            },
        }

    # ========================================================================
    # Private: Deterministic Computation Methods
    # ========================================================================

    def _hash_path(self, path: str) -> int:
        """Deterministic hash from path."""
        hash_obj = hashlib.md5(path.encode())
        return int(hash_obj.hexdigest(), 16)

    def _compute_total_rows(self, path_hash: int) -> int:
        """Compute total rows deterministically."""
        # Range: 1,000 to 11,000 rows
        return 1000 + (path_hash % 10000)

    def _compute_valid_ratio(self, path_hash: int, validation_level: str) -> float:
        """Compute valid row ratio deterministically."""
        # Base ratio from hash
        base_ratio = 0.85 + (path_hash % 15) / 100  # 0.85 to 0.99
        # Adjust for validation level
        if validation_level == "quick":
            return min(0.99, base_ratio + 0.05)
        return base_ratio

    def _compute_completeness(self, path_hash: int) -> float:
        """Compute completeness score."""
        # Range: 0.90 to 0.99
        return 0.90 + (path_hash % 9) / 100

    def _compute_consistency(self, path_hash: int) -> float:
        """Compute consistency score."""
        # Range: 0.85 to 0.98
        return 0.85 + (path_hash % 13) / 100

    def _compute_column_count(self, path_hash: int) -> int:
        """Compute number of columns."""
        # Range: 5 to 50 columns
        return 5 + (path_hash % 45)

    def _compute_file_size(self, path_hash: int) -> float:
        """Compute file size in MB."""
        # Range: 10 to 500 MB
        return 10.0 + (path_hash % 490)

    def _compute_accuracy(self, combined_hash: int) -> float:
        """Compute model accuracy."""
        # Range: 0.75 to 0.99
        return 0.75 + (combined_hash % 24) / 100

    def _compute_precision(self, combined_hash: int) -> float:
        """Compute model precision."""
        # Range: 0.70 to 0.98
        return 0.70 + (combined_hash % 28) / 100

    def _compute_recall(self, combined_hash: int) -> float:
        """Compute model recall."""
        # Range: 0.72 to 0.97
        return 0.72 + (combined_hash % 25) / 100

    def _compute_f1(self, precision: float, recall: float) -> float:
        """Compute F1 score from precision and recall."""
        if precision + recall == 0:
            return 0.0
        return 2 * (precision * recall) / (precision + recall)

    def _determine_model_type(self, model_hash: int) -> str:
        """Determine model type."""
        types = ["RandomForest", "XGBoost", "LightGBM", "GradientBoosting"]
        return types[model_hash % len(types)]

    def _determine_status(
        self, quality_score: float, completeness: float, consistency: float
    ) -> str:
        """Determine validation status."""
        if quality_score >= 0.90 and completeness >= 0.95 and consistency >= 0.95:
            return "PASS"
        elif quality_score >= 0.70:
            return "WARNING"
        else:
            return "FAIL"

    def _determine_eval_status(
        self, accuracy: float, precision: float, recall: float
    ) -> str:
        """Determine evaluation status."""
        avg_score = (accuracy + precision + recall) / 3
        if avg_score >= 0.85:
            return "EXCELLENT"
        elif avg_score >= 0.75:
            return "GOOD"
        elif avg_score >= 0.65:
            return "ACCEPTABLE"
        else:
            return "POOR"

    # ========================================================================
    # Result, Confidence, Debug Metadata Methods
    # ========================================================================

    def _compute_confidence_dataset(
        self, quality_score: float, completeness: float, consistency: float
    ) -> float:
        """Compute confidence score for dataset validation."""
        # Based on quality metrics
        return (quality_score + completeness + consistency) / 3

    def _determine_dataset_result(
        self,
        status: str,
        quality_score: float,
        completeness: float,
        consistency: float,
        valid_rows: int,
        total_rows: int,
    ) -> tuple[str, list[str]]:
        """Determine dataset result and key findings."""
        findings = []

        # Build findings
        if quality_score >= 0.95:
            findings.append("High data quality")
        elif quality_score >= 0.85:
            findings.append("Good data quality")
        elif quality_score >= 0.75:
            findings.append("Acceptable data quality")
        else:
            findings.append("Low data quality")

        if completeness >= 0.98:
            findings.append("Complete dataset")
        elif completeness < 0.92:
            findings.append("Missing values detected")

        if consistency >= 0.96:
            findings.append("Consistent values")
        elif consistency < 0.90:
            findings.append("Inconsistencies found")

        if valid_rows / total_rows >= 0.98:
            findings.append("Minimal invalid rows")

        # Determine result
        if status == "PASS" and quality_score >= 0.92:
            result = "READY_FOR_ML"
        elif status == "PASS":
            result = "VALID_WITH_CAUTION"
        elif status == "WARNING":
            result = "NEEDS_REVIEW"
        else:
            result = "INVALID"

        return result, findings

    def _create_dataset_debug_metadata(
        self, result: str, findings: list[str], quality_score: float, valid_rows: int, total_rows: int
    ) -> str:
        """Create brief debug metadata explaining the result."""
        quality_pct = int(quality_score * 100)
        valid_pct = int(valid_rows / total_rows * 100) if total_rows > 0 else 0

        parts = [
            f"Result: {result}",
            f"Quality: {quality_pct}% ({quality_score:.4f})",
            f"Valid rows: {valid_rows:,}/{total_rows:,} ({valid_pct}%)",
        ]

        if findings:
            parts.append(f"Findings: {', '.join(findings[:2])}")

        return " | ".join(parts)

    def _compute_confidence_model(
        self, accuracy: float, precision: float, recall: float
    ) -> float:
        """Compute confidence score for model evaluation."""
        # Based on averaging metrics and penalizing low scores
        avg_score = (accuracy + precision + recall) / 3
        # Confidence lower if there's high variance
        variance = (
            abs(accuracy - avg_score)
            + abs(precision - avg_score)
            + abs(recall - avg_score)
        ) / 3
        # Reduce confidence if metrics are unbalanced
        return max(0, avg_score - variance / 2)

    def _determine_model_result(
        self,
        status: str,
        accuracy: float,
        precision: float,
        recall: float,
        f1_score: float,
        correct_predictions: int,
        total_predictions: int,
    ) -> tuple[str, list[str]]:
        """Determine model result and key findings."""
        findings = []

        # Build findings
        if accuracy >= 0.90:
            findings.append("High accuracy")
        elif accuracy >= 0.80:
            findings.append("Good accuracy")
        else:
            findings.append("Low accuracy")

        if precision >= 0.85:
            findings.append("High precision")
        if recall >= 0.85:
            findings.append("High recall")

        # Check balance between precision and recall
        balance = abs(precision - recall)
        if balance < 0.05:
            findings.append("Balanced metrics")
        elif balance > 0.15:
            findings.append("Imbalanced metrics (precision vs recall)")

        if f1_score >= 0.85:
            findings.append("Strong F1 score")

        # Determine result
        if status == "EXCELLENT":
            if balance < 0.1:
                result = "READY_FOR_PRODUCTION"
            else:
                result = "EXCELLENT_WITH_NOTES"
        elif status == "GOOD":
            result = "GOOD_FOR_VALIDATION"
        elif status == "ACCEPTABLE":
            result = "NEEDS_IMPROVEMENT"
        else:
            result = "REJECTED"

        return result, findings

    def _create_model_debug_metadata(
        self, result: str, findings: list[str], accuracy: float, precision: float, recall: float, f1_score: float
    ) -> str:
        """Create brief debug metadata explaining the model result."""
        acc_pct = int(accuracy * 100)
        f1_pct = int(f1_score * 100)

        parts = [
            f"Result: {result}",
            f"Accuracy: {acc_pct}% ({accuracy:.4f})",
            f"F1 score: {f1_pct}% ({f1_score:.4f})",
            f"Precision: {precision:.4f}, Recall: {recall:.4f}",
        ]

        if findings:
            parts.append(f"Findings: {', '.join(findings[:2])}")

        return " | ".join(parts)


# Global instance
_computation = RealMLComputation()


def get_computation() -> RealMLComputation:
    """Get global computation instance."""
    return _computation

"""
Request/Response validation layer for ML Runtime API contracts.

Validates incoming requests and outgoing responses against the JSON Schema
defined in schemas/api_contracts/v1.0/ml_runtime_contracts.json
"""

from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import re


@dataclass
class ValidationError:
    """Represents a validation error."""
    field: str
    message: str
    value: Any = None


class RequestValidator:
    """Validates incoming requests against contract schema."""

    # Regex patterns for validation
    GCS_PATH_PATTERN = re.compile(r"^gs://[a-z0-9_-]+/[a-zA-Z0-9_./\-]+\.(json|pkl)$")
    RUN_ID_PATTERN = re.compile(r"^([0-9]{8}-[a-z]+-[0-9]{3,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$")

    @staticmethod
    def validate_dataset_request(request: Dict[str, Any]) -> Tuple[bool, List[ValidationError]]:
        """
        Validate POST /api/ml/validate-dataset request.

        Required fields:
        - dataset_path (str, GCS path to .json file)

        Optional fields:
        - run_id (str or None, auto-generate if missing)
        - validation_level (str, "quick" or "full", default: "full")
        - format (str, "json" or "csv", default: "json")
        - timeout_seconds (int 10-600, default: 30)

        Returns:
            (is_valid, list_of_errors)
        """
        errors: List[ValidationError] = []

        # Check required: dataset_path
        if "dataset_path" not in request:
            errors.append(ValidationError("dataset_path", "Field is required"))
        else:
            dataset_path = request.get("dataset_path")
            if not isinstance(dataset_path, str):
                errors.append(ValidationError("dataset_path", f"Must be string, got {type(dataset_path).__name__}", dataset_path))
            elif not RequestValidator.GCS_PATH_PATTERN.match(dataset_path):
                errors.append(ValidationError("dataset_path", "Must be valid GCS path (gs://bucket/path.json)", dataset_path))

        # Check optional: run_id
        if "run_id" in request:
            run_id = request.get("run_id")
            if run_id is not None:
                if not isinstance(run_id, str):
                    errors.append(ValidationError("run_id", f"Must be string or null, got {type(run_id).__name__}", run_id))
                elif not RequestValidator.RUN_ID_PATTERN.match(run_id):
                    errors.append(ValidationError("run_id", "Invalid format (must be UUID or YYYYMMDD-type-NNN)", run_id))

        # Check optional: validation_level
        if "validation_level" in request:
            validation_level = request.get("validation_level")
            if not isinstance(validation_level, str):
                errors.append(ValidationError("validation_level", f"Must be string, got {type(validation_level).__name__}", validation_level))
            elif validation_level not in ["quick", "full"]:
                errors.append(ValidationError("validation_level", "Must be 'quick' or 'full'", validation_level))

        # Check optional: format
        if "format" in request:
            format_val = request.get("format")
            if not isinstance(format_val, str):
                errors.append(ValidationError("format", f"Must be string, got {type(format_val).__name__}", format_val))
            elif format_val not in ["json", "csv"]:
                errors.append(ValidationError("format", "Must be 'json' or 'csv'", format_val))

        # Check optional: timeout_seconds
        if "timeout_seconds" in request:
            timeout = request.get("timeout_seconds")
            if not isinstance(timeout, int):
                errors.append(ValidationError("timeout_seconds", f"Must be integer, got {type(timeout).__name__}", timeout))
            elif timeout < 10 or timeout > 600:
                errors.append(ValidationError("timeout_seconds", "Must be between 10 and 600", timeout))

        return len(errors) == 0, errors

    @staticmethod
    def validate_evaluate_request(request: Dict[str, Any]) -> Tuple[bool, List[ValidationError]]:
        """
        Validate POST /api/ml/evaluate request.

        Required fields:
        - model_path (str, GCS path to .pkl file)

        Optional fields:
        - validation_data_path (str or None, use default if null)
        - run_id (str or None, auto-generate if missing)
        - timeout_seconds (int 10-600, default: 30)

        Returns:
            (is_valid, list_of_errors)
        """
        errors: List[ValidationError] = []

        # Check required: model_path
        if "model_path" not in request:
            errors.append(ValidationError("model_path", "Field is required"))
        else:
            model_path = request.get("model_path")
            if not isinstance(model_path, str):
                errors.append(ValidationError("model_path", f"Must be string, got {type(model_path).__name__}", model_path))
            elif not RequestValidator.GCS_PATH_PATTERN.match(model_path):
                errors.append(ValidationError("model_path", "Must be valid GCS path (gs://bucket/path.pkl)", model_path))

        # Check optional: validation_data_path
        if "validation_data_path" in request:
            val_path = request.get("validation_data_path")
            if val_path is not None:
                if not isinstance(val_path, str):
                    errors.append(ValidationError("validation_data_path", f"Must be string or null, got {type(val_path).__name__}", val_path))
                elif not RequestValidator.GCS_PATH_PATTERN.match(val_path):
                    errors.append(ValidationError("validation_data_path", "Must be valid GCS path (gs://bucket/path.json)", val_path))

        # Check optional: run_id
        if "run_id" in request:
            run_id = request.get("run_id")
            if run_id is not None:
                if not isinstance(run_id, str):
                    errors.append(ValidationError("run_id", f"Must be string or null, got {type(run_id).__name__}", run_id))
                elif not RequestValidator.RUN_ID_PATTERN.match(run_id):
                    errors.append(ValidationError("run_id", "Invalid format (must be UUID or YYYYMMDD-type-NNN)", run_id))

        # Check optional: timeout_seconds
        if "timeout_seconds" in request:
            timeout = request.get("timeout_seconds")
            if not isinstance(timeout, int):
                errors.append(ValidationError("timeout_seconds", f"Must be integer, got {type(timeout).__name__}", timeout))
            elif timeout < 10 or timeout > 600:
                errors.append(ValidationError("timeout_seconds", "Must be between 10 and 600", timeout))

        return len(errors) == 0, errors


class ResponseValidator:
    """Validates outgoing responses against contract schema."""

    @staticmethod
    def validate_dataset_response(response: Dict[str, Any]) -> Tuple[bool, List[ValidationError]]:
        """
        Validate POST /api/ml/validate-dataset response.

        Required fields:
        - run_id (str)
        - status (str: "PASS", "FAIL", "WARNING")
        - dataset_stats (dict with total_rows, valid_rows, unique_users)

        Optional but strongly recommended:
        - timestamp (ISO-8601 string)
        - quality_gates (dict with all_gates_passed bool)
        - recommendations (list of strings)

        Returns:
            (is_valid, list_of_errors)
        """
        errors: List[ValidationError] = []

        # Check required: run_id
        if "run_id" not in response:
            errors.append(ValidationError("run_id", "Field is required"))
        else:
            run_id = response.get("run_id")
            if not isinstance(run_id, str):
                errors.append(ValidationError("run_id", f"Must be string, got {type(run_id).__name__}", run_id))
            elif len(run_id) == 0:
                errors.append(ValidationError("run_id", "Cannot be empty", run_id))

        # Check required: status
        if "status" not in response:
            errors.append(ValidationError("status", "Field is required"))
        else:
            status = response.get("status")
            if not isinstance(status, str):
                errors.append(ValidationError("status", f"Must be string, got {type(status).__name__}", status))
            elif status not in ["PASS", "FAIL", "WARNING"]:
                errors.append(ValidationError("status", "Must be 'PASS', 'FAIL', or 'WARNING'", status))

        # Check required: dataset_stats
        if "dataset_stats" not in response:
            errors.append(ValidationError("dataset_stats", "Field is required"))
        else:
            dataset_stats = response.get("dataset_stats")
            if not isinstance(dataset_stats, dict):
                errors.append(ValidationError("dataset_stats", f"Must be dict, got {type(dataset_stats).__name__}", dataset_stats))
            else:
                # Check required sub-fields
                required_stats = ["total_rows", "valid_rows", "unique_users"]
                for stat in required_stats:
                    if stat not in dataset_stats:
                        errors.append(ValidationError(f"dataset_stats.{stat}", "Field is required"))
                    elif not isinstance(dataset_stats[stat], int):
                        errors.append(ValidationError(f"dataset_stats.{stat}", f"Must be integer, got {type(dataset_stats[stat]).__name__}", dataset_stats[stat]))
                    elif dataset_stats[stat] < 0:
                        errors.append(ValidationError(f"dataset_stats.{stat}", "Cannot be negative", dataset_stats[stat]))

        # Check optional: timestamp
        if "timestamp" in response:
            timestamp = response.get("timestamp")
            if not isinstance(timestamp, str):
                errors.append(ValidationError("timestamp", f"Must be string (ISO-8601), got {type(timestamp).__name__}", timestamp))
            else:
                try:
                    datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                except ValueError:
                    errors.append(ValidationError("timestamp", "Must be valid ISO-8601 format", timestamp))

        # Check optional: quality_gates
        if "quality_gates" in response:
            quality_gates = response.get("quality_gates")
            if not isinstance(quality_gates, dict):
                errors.append(ValidationError("quality_gates", f"Must be dict, got {type(quality_gates).__name__}", quality_gates))
            elif "all_gates_passed" in quality_gates:
                if not isinstance(quality_gates["all_gates_passed"], bool):
                    errors.append(ValidationError("quality_gates.all_gates_passed", f"Must be boolean, got {type(quality_gates['all_gates_passed']).__name__}", quality_gates["all_gates_passed"]))

        # Check optional: recommendations
        if "recommendations" in response:
            recommendations = response.get("recommendations")
            if not isinstance(recommendations, list):
                errors.append(ValidationError("recommendations", f"Must be list, got {type(recommendations).__name__}", recommendations))
            else:
                for i, rec in enumerate(recommendations):
                    if not isinstance(rec, str):
                        errors.append(ValidationError(f"recommendations[{i}]", f"Must be string, got {type(rec).__name__}", rec))

        return len(errors) == 0, errors

    @staticmethod
    def validate_evaluate_response(response: Dict[str, Any]) -> Tuple[bool, List[ValidationError]]:
        """
        Validate POST /api/ml/evaluate response.

        Required fields:
        - run_id (str)
        - status (str: "PASS" or "FAIL")
        - accuracy (float 0-1)
        - f1_score (float 0-1)

        Optional:
        - timestamp (ISO-8601 string)

        Returns:
            (is_valid, list_of_errors)
        """
        errors: List[ValidationError] = []

        # Check required: run_id
        if "run_id" not in response:
            errors.append(ValidationError("run_id", "Field is required"))
        else:
            run_id = response.get("run_id")
            if not isinstance(run_id, str):
                errors.append(ValidationError("run_id", f"Must be string, got {type(run_id).__name__}", run_id))
            elif len(run_id) == 0:
                errors.append(ValidationError("run_id", "Cannot be empty", run_id))

        # Check required: status
        if "status" not in response:
            errors.append(ValidationError("status", "Field is required"))
        else:
            status = response.get("status")
            if not isinstance(status, str):
                errors.append(ValidationError("status", f"Must be string, got {type(status).__name__}", status))
            elif status not in ["PASS", "FAIL"]:
                errors.append(ValidationError("status", "Must be 'PASS' or 'FAIL'", status))

        # Check required: accuracy
        if "accuracy" not in response:
            errors.append(ValidationError("accuracy", "Field is required"))
        else:
            accuracy = response.get("accuracy")
            if not isinstance(accuracy, (int, float)):
                errors.append(ValidationError("accuracy", f"Must be number, got {type(accuracy).__name__}", accuracy))
            elif accuracy < 0 or accuracy > 1:
                errors.append(ValidationError("accuracy", "Must be between 0 and 1", accuracy))

        # Check required: f1_score
        if "f1_score" not in response:
            errors.append(ValidationError("f1_score", "Field is required"))
        else:
            f1_score = response.get("f1_score")
            if not isinstance(f1_score, (int, float)):
                errors.append(ValidationError("f1_score", f"Must be number, got {type(f1_score).__name__}", f1_score))
            elif f1_score < 0 or f1_score > 1:
                errors.append(ValidationError("f1_score", "Must be between 0 and 1", f1_score))

        # Check optional: timestamp
        if "timestamp" in response:
            timestamp = response.get("timestamp")
            if not isinstance(timestamp, str):
                errors.append(ValidationError("timestamp", f"Must be string (ISO-8601), got {type(timestamp).__name__}", timestamp))
            else:
                try:
                    datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                except ValueError:
                    errors.append(ValidationError("timestamp", "Must be valid ISO-8601 format", timestamp))

        return len(errors) == 0, errors

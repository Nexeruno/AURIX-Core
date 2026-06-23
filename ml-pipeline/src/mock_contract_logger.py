"""
Mock Contract Logger

Provides concise, readable logging for the mock E2E contract flow.
Formats request/response validation logs in a structured way.
"""

from typing import Dict, Any, List, Optional
from validation import ValidationError
from error_formatter import ValidationErrorFormatter
from datetime import datetime


class ContractLogger:
    """Logs mock contract flow in concise, readable format."""

    # Color codes (for terminal output)
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    RESET = "\033[0m"
    BOLD = "\033[1m"

    def __init__(self, use_colors: bool = True, verbose: bool = False):
        """
        Initialize logger.

        Args:
            use_colors: Whether to use ANSI color codes
            verbose: Whether to show detailed logs (default is concise)
        """
        self.use_colors = use_colors
        self.verbose = verbose
        self.logs: List[str] = []

    def _colorize(self, text: str, color: str) -> str:
        """Add color to text if colors are enabled."""
        if not self.use_colors:
            return text
        return f"{color}{text}{self.RESET}"

    def log_request_prepared(self, endpoint: str, request: Dict[str, Any]) -> None:
        """Log request preparation."""
        # Extract key fields for logging
        key_fields = []
        if "dataset_path" in request:
            path = request["dataset_path"].split("/")[-1]  # Just filename
            key_fields.append(f"dataset={path}")
        if "model_path" in request:
            path = request["model_path"].split("/")[-1]  # Just filename
            key_fields.append(f"model={path}")
        if "run_id" in request:
            key_fields.append(f"run_id={request['run_id']}")

        fields_str = " ".join(key_fields) if key_fields else "no_fields"
        msg = f"[REQUEST] {self._colorize('✓', self.GREEN)} {fields_str}"
        print(msg)
        self.logs.append(msg)

    def log_request_validated(self, is_valid: bool, errors: Optional[List[ValidationError]] = None) -> None:
        """Log request validation result."""
        if is_valid:
            msg = f"[VALIDATE_REQ] {self._colorize('✓ PASS', self.GREEN)}"
            print(msg)
            self.logs.append(msg)
        else:
            error_summary = ValidationErrorFormatter.format_as_string_list(errors or [])
            error_msg = error_summary[0] if error_summary else "Unknown error"
            msg = f"[VALIDATE_REQ] {self._colorize('✗ FAIL', self.RED)}: {error_msg}"
            print(msg)
            self.logs.append(msg)

            # Log additional errors if verbose
            if self.verbose and len(error_summary) > 1:
                for err in error_summary[1:]:
                    detail_msg = f"  └─ {err}"
                    print(detail_msg)
                    self.logs.append(detail_msg)

    def log_python_processing(self, endpoint: str) -> None:
        """Log Python runtime processing."""
        msg = f"[PYTHON] {self._colorize('⚙', self.BLUE)} Processing..."
        print(msg)
        self.logs.append(msg)

    def log_response_received(self, response: Dict[str, Any]) -> None:
        """Log response received."""
        # Extract key fields
        key_fields = []
        if "run_id" in response:
            key_fields.append(f"run_id={response['run_id']}")
        if "status" in response:
            key_fields.append(f"status={response['status']}")
        if "accuracy" in response:
            key_fields.append(f"accuracy={response['accuracy']:.3f}")

        fields_str = " ".join(key_fields) if key_fields else "no_fields"
        msg = f"[RESPONSE] {self._colorize('✓', self.GREEN)} {fields_str}"
        print(msg)
        self.logs.append(msg)

    def log_response_validated(self, is_valid: bool, errors: Optional[List[ValidationError]] = None) -> None:
        """Log response validation result."""
        if is_valid:
            msg = f"[VALIDATE_RESP] {self._colorize('✓ PASS', self.GREEN)}"
            print(msg)
            self.logs.append(msg)
        else:
            error_summary = ValidationErrorFormatter.format_as_string_list(errors or [])
            error_msg = error_summary[0] if error_summary else "Unknown error"
            msg = f"[VALIDATE_RESP] {self._colorize('✗ FAIL', self.RED)}: {error_msg}"
            print(msg)
            self.logs.append(msg)

            # Log additional errors if verbose
            if self.verbose and len(error_summary) > 1:
                for err in error_summary[1:]:
                    detail_msg = f"  └─ {err}"
                    print(detail_msg)
                    self.logs.append(detail_msg)

    def log_summary(self, success: bool, endpoint: str, duration_ms: Optional[float] = None) -> None:
        """Log final result."""
        if success:
            msg = f"[SUMMARY] {self._colorize('✅ SUCCESS', self.GREEN)}"
            if duration_ms:
                msg += f" ({duration_ms:.0f}ms)"
        else:
            msg = f"[SUMMARY] {self._colorize('❌ FAILED', self.RED)}"
            if duration_ms:
                msg += f" ({duration_ms:.0f}ms)"

        print(msg)
        self.logs.append(msg)

    def print_logs(self) -> None:
        """Print all logged messages."""
        print("\n".join(self.logs))

    def get_logs(self) -> List[str]:
        """Get all logged messages as list."""
        return self.logs


class CompactFlowLogger:
    """Ultra-compact single-line logging for contract flow."""

    @staticmethod
    def log_request_flow(
        endpoint: str,
        request_valid: bool,
        request_errors: Optional[List[ValidationError]] = None,
        response_valid: Optional[bool] = None,
        response_errors: Optional[List[ValidationError]] = None,
        overall_success: bool = False
    ) -> str:
        """
        Log complete flow in single line.

        Example outputs:
            "[POST /api/ml/validate-dataset] REQ✓ RESP✓ → SUCCESS"
            "[POST /api/ml/validate-dataset] REQ✗ (dataset_path) → FAILED"
            "[POST /api/ml/evaluate] REQ✓ RESP✗ (status) → FAILED"
        """
        endpoint_short = endpoint.split("/")[-1]  # Just last part

        # Request status
        req_status = "REQ✓" if request_valid else f"REQ✗"
        if not request_valid and request_errors:
            error_field = request_errors[0].field
            req_status += f" ({error_field})"

        # Response status
        if response_valid is None:
            resp_status = "—"
        else:
            resp_status = "RESP✓" if response_valid else "RESP✗"
            if not response_valid and response_errors:
                error_field = response_errors[0].field
                resp_status += f" ({error_field})"

        # Overall result
        result = "SUCCESS" if overall_success else "FAILED"

        return f"[{endpoint_short}] {req_status} {resp_status} → {result}"


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

if __name__ == "__main__":
    import time

    print("="*70)
    print("EXAMPLE 1: Valid Request + Response")
    print("="*70)

    logger1 = ContractLogger(use_colors=True, verbose=False)

    start = time.time()
    logger1.log_request_prepared("/api/ml/validate-dataset", {
        "dataset_path": "gs://bucket/exports/dataset-20260607.json",
        "run_id": "20260607-val-001"
    })
    logger1.log_request_validated(True)
    logger1.log_python_processing("/api/ml/validate-dataset")
    logger1.log_response_received({
        "run_id": "20260607-val-001",
        "status": "PASS"
    })
    logger1.log_response_validated(True)
    duration = (time.time() - start) * 1000
    logger1.log_summary(True, "/api/ml/validate-dataset", duration)

    # Compact single-line version
    print("\nCompact format:")
    compact_log = CompactFlowLogger.log_request_flow(
        "/api/ml/validate-dataset",
        request_valid=True,
        response_valid=True,
        overall_success=True
    )
    print(compact_log)

    # ========================================================================

    print("\n\n" + "="*70)
    print("EXAMPLE 2: Invalid Request")
    print("="*70)

    from validation import ValidationError

    logger2 = ContractLogger(use_colors=True, verbose=False)

    start = time.time()
    logger2.log_request_prepared("/api/ml/validate-dataset", {
        "run_id": "20260607-val-001"
    })

    error = ValidationError("dataset_path", "Field is required")
    logger2.log_request_validated(False, [error])
    duration = (time.time() - start) * 1000
    logger2.log_summary(False, "/api/ml/validate-dataset", duration)

    # Compact single-line version
    print("\nCompact format:")
    compact_log = CompactFlowLogger.log_request_flow(
        "/api/ml/validate-dataset",
        request_valid=False,
        request_errors=[error],
        overall_success=False
    )
    print(compact_log)

    # ========================================================================

    print("\n\n" + "="*70)
    print("EXAMPLE 3: Valid Request + Invalid Response")
    print("="*70)

    logger3 = ContractLogger(use_colors=True, verbose=False)

    start = time.time()
    logger3.log_request_prepared("/api/ml/evaluate", {
        "model_path": "gs://bucket/models/v3.3/model.pkl",
        "run_id": "20260607-eval-001"
    })
    logger3.log_request_validated(True)
    logger3.log_python_processing("/api/ml/evaluate")
    logger3.log_response_received({
        "run_id": "20260607-eval-001",
        "status": "INVALID",
        "accuracy": 0.5
    })

    resp_error = ValidationError("status", "Must be 'PASS' or 'FAIL'")
    logger3.log_response_validated(False, [resp_error])
    duration = (time.time() - start) * 1000
    logger3.log_summary(False, "/api/ml/evaluate", duration)

    # Compact single-line version
    print("\nCompact format:")
    compact_log = CompactFlowLogger.log_request_flow(
        "/api/ml/evaluate",
        request_valid=True,
        response_valid=False,
        response_errors=[resp_error],
        overall_success=False
    )
    print(compact_log)

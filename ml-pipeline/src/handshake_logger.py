"""
Handshake Logger

Logs the Firebase/Node.js → Python handshake flow in a readable format.
Shows each step of the communication process on the Flask side.

Usage:
    logger = HandshakeLogger("validate-dataset")
    logger.log_request_received(request)
    logger.log_response_returned(200)
    logger.log_summary(True, duration)
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
import json


class HandshakeLogger:
    """Logger for Flask/Python handshake communication."""

    # ANSI color codes
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    CYAN = "\033[36m"
    RESET = "\033[0m"
    DIM = "\033[2m"
    BRIGHT = "\033[1m"

    def __init__(self, operation_name: str, use_colors: bool = True):
        """Initialize logger."""
        self.operation_name = operation_name
        self.use_colors = use_colors
        self.logs: List[str] = []
        self.start_time = datetime.now()

    def _colorize(self, text: str, color: str) -> str:
        """Add color to text if enabled."""
        if not self.use_colors:
            return text
        return f"{color}{text}{self.RESET}"

    def log_request_received(self, endpoint: str) -> None:
        """Log request received by Flask."""
        timestamp = datetime.now().isoformat()
        msg = f"[{timestamp}] [FLASK ] ← Request received at {endpoint}"
        self._log(msg)

    def log_request_validating(self) -> None:
        """Log request validation starting."""
        timestamp = datetime.now().isoformat()
        msg = f"[{timestamp}] [FLASK ] ⚙ Validating request..."
        self._log(msg)

    def log_request_validated(self, is_valid: bool, errors: Optional[List[str]] = None) -> None:
        """Log request validation result."""
        timestamp = datetime.now().isoformat()

        if is_valid:
            status = "✓"
            status_color = self.GREEN
            result = "Request valid"
        else:
            status = "✗"
            status_color = self.RED
            result = "Request invalid"

            if errors:
                first_error = errors[0] if isinstance(errors, list) else str(errors)
                result += f" ({first_error})"

        colored_status = self._colorize(status, status_color)
        msg = f"[{timestamp}] [FLASK ] {colored_status} {result}"
        self._log(msg)

    def log_processing(self, processor: str) -> None:
        """Log mock processing happening."""
        timestamp = datetime.now().isoformat()
        msg = f"[{timestamp}] [FLASK ] ⚙ Processing with {processor}..."
        self._log(msg)

    def log_response_generated(self, status_code: int, status_text: str = "") -> None:
        """Log response being generated."""
        timestamp = datetime.now().isoformat()
        status_display = f"{status_code}" + (f" {status_text}" if status_text else "")
        msg = f"[{timestamp}] [FLASK ] ✓ Response generated ({status_display})"
        self._log(msg)

    def log_response_returned(self, status_code: int) -> None:
        """Log response being returned to caller."""
        timestamp = datetime.now().isoformat()

        if status_code == 200:
            status_color = self.GREEN
            status_display = self._colorize(str(status_code), status_color)
        else:
            status_color = self.RED
            status_display = self._colorize(str(status_code), status_color)

        msg = f"[{timestamp}] [FLASK ] → Returning {status_display} response"
        self._log(msg)

    def log_error(self, error_msg: str) -> None:
        """Log error that occurred."""
        timestamp = datetime.now().isoformat()
        colored_status = self._colorize("✗", self.RED)
        msg = f"[{timestamp}] [FLASK ] {colored_status} Error: {error_msg}"
        self._log(msg)

    def log_summary(self, success: bool, duration_ms: float) -> None:
        """Log summary of handshake."""
        timestamp = datetime.now().isoformat()

        if success:
            status = self._colorize("✅ SUCCESS", self.GREEN)
        else:
            status = self._colorize("❌ FAILED", self.RED)

        msg = f"[{timestamp}] [SUMMARY] {status} ({duration_ms:.0f}ms)"
        self._log(msg)

    def _log(self, message: str) -> None:
        """Log message and store it."""
        self.logs.append(message)
        print(message)

    def get_logs(self) -> List[str]:
        """Get all logged messages."""
        return self.logs

    def print_summary(self) -> None:
        """Print all logs together."""
        print("\n".join(self.logs))


def log_handshake_flow(
    operation: str,
    request_valid: bool,
    response_status: int,
    duration_ms: float,
    success: bool,
    error: Optional[str] = None,
) -> None:
    """
    Log a complete handshake in compact format.

    Example:
        log_handshake_flow(
            operation="validate-dataset",
            request_valid=True,
            response_status=200,
            duration_ms=245,
            success=True
        )
    """
    timestamp = datetime.now().isoformat()
    status = "✅" if success else "❌"
    short_op = operation.split("-")[-1] if "-" in operation else operation

    request_status = "REQ✓" if request_valid else "REQ✗"
    response_status_str = "RESP✓" if response_status == 200 else "RESP✗"

    line = (
        f"{status} [{short_op}] {request_status} {response_status_str} → {duration_ms:.0f}ms"
    )
    print(line)

    if error:
        print(f"   └─ Error: {error}")


# ============================================================================
# Example Usage (for testing)
# ============================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("EXAMPLE 1: Successful Handshake")
    print("=" * 70)

    logger1 = HandshakeLogger("validate-dataset")

    logger1.log_request_received("/api/ml/validate-dataset")
    logger1.log_request_validating()
    logger1.log_request_validated(True)
    logger1.log_processing("MockPythonRuntime")
    logger1.log_response_generated(200, "OK")
    logger1.log_response_returned(200)
    logger1.log_summary(True, 245.5)

    print("\n" + "=" * 70)
    print("EXAMPLE 2: Failed Handshake (Invalid Request)")
    print("=" * 70)

    logger2 = HandshakeLogger("evaluate")

    logger2.log_request_received("/api/ml/evaluate")
    logger2.log_request_validating()
    logger2.log_request_validated(False, ["model_path is required"])
    logger2.log_response_returned(400)
    logger2.log_summary(False, 45.2)

    print("\n" + "=" * 70)
    print("EXAMPLE 3: Compact Single-Line Format")
    print("=" * 70)

    log_handshake_flow(
        operation="validate-dataset",
        request_valid=True,
        response_status=200,
        duration_ms=245,
        success=True,
    )

    log_handshake_flow(
        operation="evaluate",
        request_valid=False,
        response_status=400,
        duration_ms=45,
        success=False,
        error="Missing required field: model_path",
    )
